import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadLocalEnv, runPreflight } from '../e01-preflight.mjs';
import { isNamedTunnelPlaceholder, sameTunnelLifetime, validateNamedTunnelHostname, validateNamedTunnelOrigin } from './named-tunnel.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const APP_PROJECT = 'mo-farm';
const TUNNEL_PROJECT = 'mo-farm-tunnel';
const ERROR_CODES = new Set([
  'INVALID_NAMED_TUNNEL_ORIGIN', 'INVALID_NAMED_TUNNEL_HOSTNAME',
  'TUNNEL_OPERATION_LOCKED', 'AMBIGUOUS_SERVICE_CONTAINER', 'TUNNEL_NOT_RUNNING',
  'TUNNEL_LIFECYCLE_REGRESSION', 'TUNNEL_NOT_CONNECTED', 'BLOCKED_CONFIG',
  'BLOCKED_SECURITY', 'INTERNAL_READINESS_FAILED', 'PUBLIC_HTTPS_SMOKE_FAILED',
  'PUBLIC_ORIGIN_MISMATCH', 'APP_NOT_RUNNING', 'DOCKER_UNAVAILABLE',
  'TUNNEL_RUNTIME_CONFIG_MISMATCH',
]);

export function safeErrorCode(error) {
  return ERROR_CODES.has(error?.message) || /^DOCKER_COMMAND_FAILED:(?:compose|logs|ps|inspect|stop|tag)$/.test(error?.message ?? '')
    ? error.message : 'NAMED_TUNNEL_OPERATION_FAILED';
}

export function dockerCommand(args, { root = ROOT, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const timer = setTimeout(() => child.kill(), 600_000);
    const collect = (chunk) => { output = (output + chunk.toString()).slice(-2_000_000); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.once('error', () => { clearTimeout(timer); reject(new Error('DOCKER_UNAVAILABLE')); });
    child.once('close', (code) => {
      clearTimeout(timer);
      // Docker diagnostics may contain expanded secrets. Keep them private.
      if (code !== 0) reject(new Error(`DOCKER_COMMAND_FAILED:${args[0]}`));
      else resolve(output.trim());
    });
  });
}

export class NamedTunnelRuntime {
  constructor({ root = ROOT, env = process.env, command = dockerCommand, fetcher = fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), report = console.log } = {}) {
    this.root = root;
    this.env = loadLocalEnv(root, env);
    this.command = command;
    this.fetcher = fetcher;
    this.sleep = sleep;
    this.report = report;
    this.runtimePath = path.join(root, '.runtime');
  }

  docker(args) { return this.command(args, { root: this.root, env: this.env }); }
  compose(stack, args) {
    const project = stack === 'tunnel' ? TUNNEL_PROJECT : APP_PROJECT;
    const file = stack === 'tunnel' ? 'compose.tunnel.yaml' : 'compose.yaml';
    return this.docker(['compose', '-p', project, '-f', file, ...args]);
  }

  configuredOrigin() {
    return validateNamedTunnelOrigin(this.env.PUBLIC_ORIGIN, this.env.CLOUDFLARE_HOSTNAME);
  }

  async locked(action) {
    fs.mkdirSync(this.runtimePath, { recursive: true });
    const lock = path.join(this.runtimePath, 'named-tunnel.lock');
    try { fs.mkdirSync(lock); } catch { throw new Error('TUNNEL_OPERATION_LOCKED'); }
    try {
      fs.writeFileSync(path.join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
      return await action();
    } finally {
      fs.rmSync(path.join(lock, 'owner.json'), { force: true });
      fs.rmdirSync(lock);
    }
  }

  async inspect(service, project = APP_PROJECT) {
    const ids = await this.docker(['ps', '-a', '--filter', `label=com.docker.compose.project=${project}`,
      '--filter', `label=com.docker.compose.service=${service}`, '--format', '{{.ID}}']);
    if (!ids) return undefined;
    if (ids.split(/\r?\n/).length !== 1) throw new Error('AMBIGUOUS_SERVICE_CONTAINER');
    // Never return or log raw inspection: Config.Env includes credentials.
    const raw = JSON.parse(await this.docker(['inspect', '--format', '{{json .}}', ids]));
    return { containerId: raw.Id, running: raw.State.Running, startedAt: raw.State.StartedAt,
      restartCount: raw.RestartCount, health: raw.State.Health?.Status ?? (raw.State.Running ? 'running' : 'stopped'),
      imageId: raw.Image, imageTag: raw.Config.Image,
      publicOrigin: raw.Config.Env?.find((value) => value.startsWith('PUBLIC_ORIGIN='))?.slice(14),
      tunnelConfigValid: service !== 'cloudflared' || (raw.Config.Image === 'cloudflare/cloudflared:2025.9.1'
        && JSON.stringify(raw.Config.Cmd) === JSON.stringify(['tunnel', '--no-autoupdate', 'run'])
        && raw.HostConfig.RestartPolicy.Name === 'unless-stopped'
        && Boolean(raw.NetworkSettings.Networks['mo-farm-frontend'])
        && Boolean(this.env.CLOUDFLARE_TUNNEL_TOKEN)
        && raw.Config.Env?.find((value) => value.startsWith('TUNNEL_TOKEN='))?.slice(13) === this.env.CLOUDFLARE_TUNNEL_TOKEN
        && raw.Config.Env?.includes('TUNNEL_METRICS=0.0.0.0:2000')
        && !(raw.Mounts?.length) && !Object.keys(raw.HostConfig.PortBindings ?? {}).length) };
  }

  async tunnel() { return this.inspect('cloudflared', TUNNEL_PROJECT); }

  async snapshot(container = undefined) {
    container ??= await this.tunnel();
    if (!container?.running) throw new Error('TUNNEL_NOT_RUNNING');
    if (!container.tunnelConfigValid) throw new Error('TUNNEL_RUNTIME_CONFIG_MISMATCH');
    return { ...container, publicOrigin: this.configuredOrigin() };
  }

  async assertLifetime(before) {
    const container = await this.tunnel();
    if (!sameTunnelLifetime(before, { ...container, publicOrigin: this.configuredOrigin() })) {
      throw new Error('TUNNEL_LIFECYCLE_REGRESSION');
    }
    const after = await this.snapshot(container);
    const api = await this.inspect('api');
    if (api?.publicOrigin !== before.publicOrigin) throw new Error('PUBLIC_ORIGIN_MISMATCH');
    return after;
  }

  async preflight() {
    const result = await runPreflight({ root: this.root, env: this.env, loadDotEnv: false });
    if (result.status !== 'PASS') throw new Error(result.status);
    await this.compose('app', ['config', '--quiet']);
    await this.compose('tunnel', ['config', '--quiet']);
  }

  async connectionState() {
    // API/web provide Node on the shared network, independently of Nginx health.
    const probe = "fetch(process.argv[1],{signal:AbortSignal.timeout(5000)}).then(async r=>{await r.body?.cancel();console.log(r.status===200?'CONNECTED':r.status===503?'DISCONNECTED':'UNVERIFIED')}).catch(()=>console.log('UNVERIFIED'))";
    for (const service of ['api', 'web']) {
      const container = await this.inspect(service);
      if (!container?.running) continue;
      try {
        const state = await this.compose('app', ['exec', '-T', service, 'node', '-e', probe, 'http://cloudflared:2000/ready']);
        if (state === 'CONNECTED' || state === 'DISCONNECTED') return state;
      } catch { /* Try the other internal probe service without contacting the public hostname. */ }
    }
    return 'UNVERIFIED';
  }

  async connected() {
    return await this.connectionState() === 'CONNECTED';
  }

  async waitConnected(before) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await this.assertLifetime(before);
      if (await this.connected()) return;
      await this.sleep(1000);
    }
    throw new Error('TUNNEL_NOT_CONNECTED');
  }

  async reloadNginx() {
    // Re-resolve api/web addresses after Docker recreates containers.
    await this.compose('app', ['exec', '-T', 'nginx', 'nginx', '-t']);
    await this.compose('app', ['exec', '-T', 'nginx', 'nginx', '-s', 'reload']);
  }

  async internalReady() {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        await this.compose('app', ['exec', '-T', 'nginx', 'wget', '-q', '-T', '5', '-O', '/dev/null', 'http://127.0.0.1/api/health/ready']);
        await this.compose('app', ['exec', '-T', 'nginx', 'wget', '-q', '-T', '5', '-O', '/dev/null', 'http://127.0.0.1/']);
        return;
      } catch { await this.sleep(1000); }
    }
    throw new Error('INTERNAL_READINESS_FAILED');
  }

  async smoke(publicUrl) {
    validateNamedTunnelOrigin(publicUrl, this.env.CLOUDFLARE_HOSTNAME);
    const paths = ['/', '/api/health/ready', '/healthz'];
    for (const pathname of paths) {
      let passed = false;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        try {
          const response = await this.fetcher(`${publicUrl}${pathname}`, {
            redirect: 'error', signal: AbortSignal.timeout(10_000), headers: { Origin: publicUrl },
          });
          if (response.ok) {
            if (pathname === '/api/health/ready') {
              const body = await response.json();
              passed = body.checks?.persistenceDriver === 'postgres' && body.checks?.persistenceReady === true;
            } else { await response.body?.cancel(); passed = true; }
          } else await response.body?.cancel();
          if (passed) break;
        } catch { /* Retry temporary origin/edge unavailability without restarting tunnel. */ }
        await this.sleep(1000);
      }
      if (!passed) throw new Error('PUBLIC_HTTPS_SMOKE_FAILED');
    }
    this.report('PUBLIC_HTTPS_SMOKE=PASS (root, nginx, PostgreSQL readiness; full public QA remains pending)');
  }

  async start() {
    return this.locked(async () => {
      await this.preflight();
      const origin = this.configuredOrigin();
      const existing = await this.tunnel();
      if (existing && !existing.tunnelConfigValid) throw new Error('TUNNEL_RUNTIME_CONFIG_MISMATCH');
      let before;
      if (existing?.running) {
        before = await this.snapshot(existing);
        this.report('TUNNEL_ALREADY_RUNNING');
        const services = await Promise.all(['db', 'api', 'web', 'nginx'].map((service) => this.inspect(service)));
        if (services.every((service) => service?.running && service.health === 'healthy')
          && services[1].publicOrigin === origin) {
          await this.internalReady();
          await this.waitConnected(before);
          await this.smoke(origin);
          await this.assertLifetime(before);
          this.reportRunning();
          return;
        }
      }
      // The fixed origin is configured before any application or tunnel starts.
      await this.compose('app', ['build', '--quiet', 'api', 'web']);
      await this.compose('app', ['up', '-d', '--wait', 'db']);
      await this.compose('app', ['--profile', 'init', 'run', '--rm', '--no-deps', 'migrate']);
      await this.compose('app', ['up', '-d', '--wait', 'api', 'web', 'nginx']);
      await this.reloadNginx();
      await this.internalReady();
      if (!before) {
        await this.compose('tunnel', ['up', '-d', '--no-recreate', 'cloudflared']);
        before = await this.snapshot();
      }
      await this.assertLifetime(before);
      await this.waitConnected(before);
      await this.smoke(origin);
      await this.assertLifetime(before);
      this.reportRunning();
    });
  }

  reportRunning() {
    this.report('E01=RUNNING\nNAMED_TUNNEL=CONNECTED\nPUBLIC_ORIGIN=FIXED_HTTPS\nPUBLIC_QA=PENDING');
  }

  async status() {
    const container = await this.tunnel();
    const services = {};
    for (const service of ['nginx', 'api', 'db']) services[service] = await this.inspect(service);
    // Keep the public status contract binary; Docker's `stopped`/`running`
    // details are implementation state and must not leak into the report.
    const healthStatus = (service) => service?.health === 'healthy' ? 'healthy' : 'unhealthy';
    let hostname = 'INVALID';
    let originMatches = false;
    try {
      validateNamedTunnelHostname(this.env.CLOUDFLARE_HOSTNAME);
      if (isNamedTunnelPlaceholder(this.env.CLOUDFLARE_HOSTNAME)) throw new Error('INVALID_NAMED_TUNNEL_HOSTNAME');
      hostname = 'CONFIGURED';
      originMatches = services.api?.publicOrigin === this.configuredOrigin();
    } catch { /* Report only statuses; local configuration may be incomplete. */ }
    const safe = { cloudflared: container?.running ? 'RUNNING' : 'STOPPED',
      namedTunnel: !container ? 'NOT_STARTED' : container.running ? await this.connectionState() : 'DISCONNECTED',
      tunnelConfiguration: !container ? 'NOT_CREATED' : container.tunnelConfigValid ? 'MATCH' : 'MISMATCH',
      container: container?.containerId.slice(0, 12) ?? 'NOT_CREATED',
      nginx: healthStatus(services.nginx), api: healthStatus(services.api),
      postgres: healthStatus(services.db),
      publicOrigin: originMatches ? 'MATCH' : 'MISMATCH', hostname };
    this.report(JSON.stringify(safe, null, 2));
    return safe;
  }

  async stop() {
    return this.locked(async () => {
      const container = await this.tunnel();
      if (container?.running) await this.docker(['stop', container.containerId]);
      // Stopping a Named Tunnel does not rotate its configured hostname.
      this.report('CLOUDFLARED=STOPPED\nNAMED_TUNNEL=DISCONNECTED\nPUBLIC_ORIGIN=UNCHANGED');
    });
  }

  async update({ nginx = false } = {}) {
    return this.locked(async () => {
      // Validate the fixed-origin and security contract before inspecting or
      // mutating any container. Invalid owner configuration must be a pure
      // BLOCKED_CONFIG failure with no lifecycle side effects.
      await this.preflight();
      const before = await this.snapshot();
      const api = await this.inspect('api');
      if (api?.publicOrigin !== before.publicOrigin) throw new Error('PUBLIC_ORIGIN_MISMATCH');
      const images = [];
      for (const service of ['api', 'web']) {
        const container = await this.inspect(service);
        if (!container?.running) throw new Error('APP_NOT_RUNNING');
        images.push({ service, imageId: container.imageId, imageTag: container.imageTag });
      }
      this.report(`URL_BEFORE=${before.publicOrigin}\nTUNNEL_CONTAINER_BEFORE=${before.containerId.slice(0, 12)}`);
      try {
        await this.compose('app', ['build', '--quiet', 'api', 'web']);
        await this.compose('app', ['up', '-d', '--no-deps', '--force-recreate', '--wait', 'api', 'web']);
        if (nginx) await this.compose('app', ['up', '-d', '--no-deps', '--force-recreate', '--wait', 'nginx']);
        await this.reloadNginx();
        await this.internalReady();
        await this.assertLifetime(before);
        await this.smoke(before.publicOrigin);
      } catch (error) {
        // Restore previous app image tags only. Never touch tunnel or database.
        let rollback = 'PASS';
        try {
          for (const image of images) await this.docker(['tag', image.imageId, image.imageTag]);
          await this.compose('app', ['up', '-d', '--no-deps', '--force-recreate', '--wait', 'api', 'web']);
          await this.reloadNginx();
          await this.internalReady();
        } catch { rollback = 'FAILED_REPAIR_APP_REQUIRED'; }
        this.report(`APP_ROLLBACK=${rollback}`);
        await this.assertLifetime(before);
        throw error;
      }
      await this.assertLifetime(before);
      this.report(`URL_AFTER=${before.publicOrigin}\nTUNNEL_CONTAINER_AFTER=${before.containerId.slice(0, 12)}\nPASS — URL PRESERVED`);
    });
  }
}

export async function runCli(action, options = {}) {
  try { await new NamedTunnelRuntime()[action](options); }
  catch (error) {
    // Emit only predefined diagnostic codes; external exception messages can contain secrets.
    console.error(safeErrorCode(error));
    process.exitCode = 1;
  }
}
