import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadLocalEnv, runPreflight } from '../e01-preflight.mjs';
import { discoverQuickTunnelUrl, sameTunnelLifetime, validateQuickTunnelUrl } from './quick-tunnel.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const APP_PROJECT = 'mo-farm';
const TUNNEL_PROJECT = 'mo-farm-tunnel';
const BOOTSTRAP_ORIGIN = 'https://bootstrap.invalid';
const ERROR_CODES = new Set([
  'INVALID_QUICK_TUNNEL_URL', 'AMBIGUOUS_QUICK_TUNNEL_URL', 'INVALID_RUNTIME_STATE',
  'TUNNEL_OPERATION_LOCKED', 'AMBIGUOUS_SERVICE_CONTAINER', 'TUNNEL_NOT_RUNNING',
  'TUNNEL_LIFECYCLE_REGRESSION', 'QUICK_TUNNEL_URL_NOT_FOUND', 'BLOCKED_CONFIG',
  'BLOCKED_SECURITY', 'INTERNAL_READINESS_FAILED', 'PUBLIC_HTTPS_SMOKE_FAILED',
  'PUBLIC_ORIGIN_MISMATCH', 'APP_NOT_RUNNING', 'DOCKER_UNAVAILABLE',
  'TUNNEL_RUNTIME_CONFIG_MISMATCH',
]);

export function safeErrorCode(error) {
  return ERROR_CODES.has(error?.message) || /^DOCKER_COMMAND_FAILED:(?:compose|logs|ps|inspect|stop|tag)$/.test(error?.message ?? '')
    ? error.message : 'QUICK_TUNNEL_OPERATION_FAILED';
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

export class QuickTunnelRuntime {
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

  readState() {
    try { return JSON.parse(fs.readFileSync(path.join(this.runtimePath, 'quick-tunnel.json'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return undefined; throw new Error('INVALID_RUNTIME_STATE'); }
  }

  atomicWrite(name, contents) {
    fs.mkdirSync(this.runtimePath, { recursive: true });
    const destination = path.join(this.runtimePath, name);
    const temporary = `${destination}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, contents, { mode: 0o600 });
    fs.renameSync(temporary, destination);
  }

  saveState(state) {
    this.atomicWrite('quick-tunnel.json', `${JSON.stringify(state, null, 2)}\n`);
    this.atomicWrite('quick-tunnel.env', state.status === 'running' ? `PUBLIC_ORIGIN=${validateQuickTunnelUrl(state.publicUrl)}\n` : '# STALE: tunnel stopped; capture a new URL before application deployment.\n');
  }

  async locked(action) {
    fs.mkdirSync(this.runtimePath, { recursive: true });
    const lock = path.join(this.runtimePath, 'quick-tunnel.lock');
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
        && JSON.stringify(raw.Config.Cmd) === JSON.stringify(['tunnel', '--no-autoupdate', '--url', 'http://nginx:80'])
        && raw.HostConfig.RestartPolicy.Name === 'unless-stopped'
        && Boolean(raw.NetworkSettings.Networks['mo-farm-frontend'])
        && !raw.Config.Env?.some((value) => /^(?:TUNNEL_TOKEN|CLOUDFLARE_TUNNEL_TOKEN|CLOUDFLARE_HOSTNAME)=/.test(value))
        && !(raw.Mounts?.length) && !Object.keys(raw.HostConfig.PortBindings ?? {}).length) };
  }

  async tunnel() { return this.inspect('cloudflared', TUNNEL_PROJECT); }

  async capture(container, { wait = false } = {}) {
    if (!container?.running) throw new Error('TUNNEL_NOT_RUNNING');
    if (!container.tunnelConfigValid) throw new Error('TUNNEL_RUNTIME_CONFIG_MISMATCH');
    const saved = this.readState();
    const savedForLifetime = saved?.status === 'running' && saved.containerId === container.containerId
      && saved.startedAt === container.startedAt && saved.restartCount === container.restartCount;
    for (let attempt = 0; attempt < (wait ? 60 : 1); attempt += 1) {
      const logs = await this.docker(['logs', '--since', container.startedAt, '--tail', '500', container.containerId]);
      const discovered = discoverQuickTunnelUrl(logs);
      const publicUrl = discovered ?? (savedForLifetime ? validateQuickTunnelUrl(saved.publicUrl) : undefined);
      if (savedForLifetime && discovered && discovered !== saved.publicUrl) throw new Error('TUNNEL_LIFECYCLE_REGRESSION');
      if (publicUrl) {
        const latest = await this.tunnel();
        const snapshot = { ...container, publicUrl };
        if (!sameTunnelLifetime(snapshot, { ...latest, publicUrl })) throw new Error('TUNNEL_LIFECYCLE_REGRESSION');
        return snapshot;
      }
      if (wait) await this.sleep(1000);
    }
    throw new Error('QUICK_TUNNEL_URL_NOT_FOUND');
  }

  async assertLifetime(before) {
    const container = await this.tunnel();
    // Classify a stopped/replaced process before attempting to read its logs.
    if (!sameTunnelLifetime(before, { ...container, publicUrl: before.publicUrl })) {
      throw new Error('TUNNEL_LIFECYCLE_REGRESSION');
    }
    const after = await this.capture(container);
    if (!sameTunnelLifetime(before, after)) throw new Error('TUNNEL_LIFECYCLE_REGRESSION');
    return after;
  }

  async preflight(publicUrl) {
    const result = await runPreflight({ root: this.root, env: this.env, loadDotEnv: false,
      runtime: Boolean(publicUrl), publicUrl });
    if (result.status !== 'PASS') throw new Error(result.status);
    await this.compose('app', ['config', '--quiet']);
    await this.compose('tunnel', ['config', '--quiet']);
  }

  async reloadNginx() {
    // Re-resolve api/web addresses after Docker recreates containers.
    await this.compose('app', ['exec', '-T', 'nginx', 'nginx', '-t']);
    await this.compose('app', ['exec', '-T', 'nginx', 'nginx', '-s', 'reload']);
  }

  async internalReady() {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        await this.compose('app', ['exec', '-T', 'nginx', 'wget', '-q', '-O', '/dev/null', 'http://127.0.0.1/api/health/ready']);
        await this.compose('app', ['exec', '-T', 'nginx', 'wget', '-q', '-O', '/dev/null', 'http://127.0.0.1/']);
        return;
      } catch { await this.sleep(1000); }
    }
    throw new Error('INTERNAL_READINESS_FAILED');
  }

  async smoke(publicUrl) {
    validateQuickTunnelUrl(publicUrl);
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
      const existing = await this.tunnel();
      let before;
      if (existing?.running) {
        before = await this.capture(existing);
        this.report('TUNNEL_ALREADY_RUNNING');
      }
      this.env.PUBLIC_ORIGIN = before?.publicUrl ?? BOOTSTRAP_ORIGIN;
      if (before) {
        const services = await Promise.all(['db', 'api', 'web', 'nginx'].map((service) => this.inspect(service)));
        if (services.every((service) => service?.running && service.health === 'healthy')
          && services[1].publicOrigin === before.publicUrl) {
          await this.preflight(before.publicUrl);
          await this.internalReady();
          await this.smoke(before.publicUrl);
          await this.assertLifetime(before);
          this.recordRunning(before);
          this.reportRunning(before);
          return;
        }
      }
      await this.compose('app', ['build', '--quiet', 'api', 'web']);
      await this.compose('app', ['up', '-d', '--wait', 'db']);
      await this.compose('app', ['--profile', 'init', 'run', '--rm', '--no-deps', 'migrate']);
      await this.compose('app', ['up', '-d', '--wait', 'api', 'web', 'nginx']);
      await this.reloadNginx();
      await this.internalReady();
      if (!before) {
        // --no-recreate also protects a stopped container; no app dependency exists here.
        await this.compose('tunnel', ['up', '-d', '--no-recreate', 'cloudflared']);
        before = await this.capture(await this.tunnel(), { wait: true });
      } else await this.assertLifetime(before);
      this.recordRunning(before);
      this.env.PUBLIC_ORIGIN = before.publicUrl;
      await this.preflight(before.publicUrl);
      const api = await this.inspect('api');
      if (api?.publicOrigin !== before.publicUrl) await this.compose('app', ['up', '-d', '--no-deps', '--force-recreate', '--wait', 'api']);
      await this.reloadNginx();
      await this.internalReady();
      await this.assertLifetime(before);
      await this.smoke(before.publicUrl);
      await this.assertLifetime(before);
      this.reportRunning(before);
    });
  }

  recordRunning(container) {
    this.saveState({ publicUrl: container.publicUrl, containerId: container.containerId, startedAt: container.startedAt,
      restartCount: container.restartCount, capturedAt: new Date().toISOString(), status: 'running', qaStatus: 'PENDING' });
  }

  reportRunning(container) {
    this.report(`E01=RUNNING\nPUBLIC_URL=${container.publicUrl}\nURL_STABILITY_SCOPE=SAME_CLOUDFLARED_LIFETIME`);
  }

  async status() {
    const container = await this.tunnel();
    let current;
    if (container?.running) {
      try { current = await this.capture(container); } catch (error) { this.report(`URL_STATUS=${safeErrorCode(error)}`); }
    }
    const services = {};
    for (const service of ['nginx', 'api', 'db']) services[service] = await this.inspect(service);
    const safe = { cloudflared: container?.running ? 'RUNNING' : 'STOPPED',
      container: container?.containerId.slice(0, 12) ?? 'NOT_CREATED',
      publicUrl: current?.publicUrl ?? (this.readState()?.publicUrl ? 'STALE_OR_UNVERIFIED' : 'NOT_CREATED'),
      nginx: services.nginx?.health ?? 'stopped', api: services.api?.health ?? 'stopped',
      postgres: services.db?.health ?? 'stopped',
      publicOriginMatch: current && services.api?.publicOrigin === current.publicUrl ? 'PASS' : 'FAIL' };
    this.report(JSON.stringify(safe, null, 2));
    return safe;
  }

  async stop() {
    return this.locked(async () => {
      const container = await this.tunnel();
      if (container?.running) await this.docker(['stop', container.containerId]);
      let state;
      try { state = this.readState(); } catch { /* Explicit stop must still invalidate corrupt runtime state. */ }
      this.saveState({ publicUrl: state?.publicUrl, containerId: container?.containerId ?? state?.containerId,
        startedAt: state?.startedAt, restartCount: state?.restartCount,
        status: 'stale', stoppedAt: new Date().toISOString() });
      this.report('CLOUDFLARED=STOPPED\nPUBLIC_URL=STALE');
    });
  }

  async update({ nginx = false } = {}) {
    return this.locked(async () => {
      const before = await this.capture(await this.tunnel());
      const api = await this.inspect('api');
      if (api?.publicOrigin !== before.publicUrl) throw new Error('PUBLIC_ORIGIN_MISMATCH');
      this.env.PUBLIC_ORIGIN = before.publicUrl;
      await this.preflight(before.publicUrl);
      const images = [];
      for (const service of ['api', 'web']) {
        const container = await this.inspect(service);
        if (!container?.running) throw new Error('APP_NOT_RUNNING');
        images.push({ service, imageId: container.imageId, imageTag: container.imageTag });
      }
      this.report(`URL_BEFORE=${before.publicUrl}\nTUNNEL_CONTAINER_BEFORE=${before.containerId.slice(0, 12)}`);
      try {
        await this.compose('app', ['build', '--quiet', 'api', 'web']);
        await this.compose('app', ['up', '-d', '--no-deps', '--force-recreate', '--wait', 'api', 'web']);
        if (nginx) await this.compose('app', ['up', '-d', '--no-deps', '--force-recreate', '--wait', 'nginx']);
        await this.reloadNginx();
        await this.internalReady();
        await this.assertLifetime(before);
        await this.smoke(before.publicUrl);
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
      this.report(`URL_AFTER=${before.publicUrl}\nTUNNEL_CONTAINER_AFTER=${before.containerId.slice(0, 12)}\nPASS — URL PRESERVED`);
    });
  }
}

export async function runCli(action, options = {}) {
  try { await new QuickTunnelRuntime()[action](options); }
  catch (error) {
    // Emit only predefined diagnostic codes; external exception messages can contain secrets.
    console.error(safeErrorCode(error));
    process.exitCode = 1;
  }
}
