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
const APP_SERVICES = ['db', 'api', 'web', 'nginx'];
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

function postgresReady(body) {
  return body?.status === 'ok' && body.service === 'mo-farm-api'
    && body.checks?.persistenceDriver === 'postgres' && body.checks.persistenceReady === true;
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

  readStateSafe() {
    try {
      const state = this.readState();
      if (!state || typeof state !== 'object' || Array.isArray(state)) return undefined;
      if (state.publicUrl !== undefined) {
        try { state.publicUrl = validateQuickTunnelUrl(state.publicUrl); }
        catch { delete state.publicUrl; }
      }
      return state;
    } catch { return undefined; }
  }

  atomicWrite(name, contents) {
    fs.mkdirSync(this.runtimePath, { recursive: true });
    const destination = path.join(this.runtimePath, name);
    const temporary = `${destination}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, contents, { mode: 0o600 });
    fs.renameSync(temporary, destination);
  }

  saveState(state) {
    const publicUrl = state.publicUrl === undefined ? undefined : validateQuickTunnelUrl(state.publicUrl);
    if (state.status === 'running' && !publicUrl) throw new Error('INVALID_RUNTIME_STATE');
    this.atomicWrite('quick-tunnel.json', `${JSON.stringify(state, null, 2)}\n`);
    this.atomicWrite('quick-tunnel.env', state.status === 'running' ? `PUBLIC_ORIGIN=${publicUrl}\n` : '# STALE: tunnel stopped; capture a new URL before application deployment.\n');
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
        && JSON.stringify(raw.Config.Entrypoint) === JSON.stringify(['cloudflared', '--no-autoupdate'])
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
    const saved = this.readStateSafe();
    const savedStartedAt = saved?.containerStartedAt ?? saved?.startedAt;
    const savedForLifetime = saved?.publicUrl && saved.status === 'running' && saved.containerId === container.containerId
      && savedStartedAt === container.startedAt && saved.restartCount === container.restartCount;
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
        const services = await Promise.all(APP_SERVICES.map((service) => this.inspect(service)));
        if (!services.every((service) => service?.running && service.health === 'healthy')) {
          throw new Error('INTERNAL_READINESS_FAILED');
        }
        const readiness = await this.compose('app', ['exec', '-T', 'nginx', 'wget', '-T', '10', '-q', '-O', '-', 'http://127.0.0.1/api/health/ready']);
        if (!postgresReady(JSON.parse(readiness))) throw new Error('INTERNAL_READINESS_FAILED');
        await this.compose('app', ['exec', '-T', 'nginx', 'wget', '-T', '10', '-q', '-O', '/dev/null', 'http://127.0.0.1/']);
        return;
      } catch { await this.sleep(1000); }
    }
    throw new Error('INTERNAL_READINESS_FAILED');
  }

  async publicReady(publicUrl, pathname, timeout = 10_000) {
    validateQuickTunnelUrl(publicUrl);
    let response;
    try {
      response = await this.fetcher(`${publicUrl}${pathname}`, {
        redirect: 'error', signal: AbortSignal.timeout(timeout), headers: { Origin: publicUrl },
      });
      if (!response.ok) return false;
      if (pathname === '/api/health/ready') return postgresReady(await response.json());
      if (pathname === '/healthz') {
        const body = await response.json();
        return body?.status === 'ok' && body.service === 'nginx';
      }
      return true;
    } catch { return false; }
    finally {
      try { await response?.body?.cancel(); } catch { /* JSON consumption may already have closed the stream. */ }
    }
  }

  async smoke(publicUrl) {
    validateQuickTunnelUrl(publicUrl);
    const paths = ['/', '/api/health/ready', '/healthz'];
    for (const pathname of paths) {
      let passed = false;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        passed = await this.publicReady(publicUrl, pathname);
        if (passed) break;
        await this.sleep(1000);
      }
      if (!passed) throw new Error('PUBLIC_HTTPS_SMOKE_FAILED');
    }
    this.report('PUBLIC_HTTPS_SMOKE=PASS (root, nginx, PostgreSQL readiness; full public QA remains pending)');
  }

  async appImages(services, { required = true } = {}) {
    const images = [];
    for (const service of services) {
      const container = await this.inspect(service);
      if (required && !container?.running) throw new Error('APP_NOT_RUNNING');
      if (container?.imageId && container.imageTag) {
        images.push({ service, imageId: container.imageId, imageTag: container.imageTag });
      } else if (required) throw new Error('APP_NOT_RUNNING');
    }
    return images;
  }

  async rollbackApp(images) {
    if (!images.length) return;
    let rollback = 'PASS';
    try {
      // Restore only app images captured before this operation. Preserve database and tunnel.
      for (const image of images) await this.docker(['tag', image.imageId, image.imageTag]);
      await this.compose('app', ['up', '-d', '--no-deps', '--no-build', '--pull', 'never', '--force-recreate', '--wait', ...images.map(({ service }) => service)]);
      await this.reloadNginx();
      await this.internalReady();
    } catch { rollback = 'FAILED_REPAIR_APP_REQUIRED'; }
    this.report(`APP_ROLLBACK=${rollback}`);
  }

  async start() {
    return this.locked(async () => {
      await this.preflight();
      const existing = await this.tunnel();
      // Reject configuration drift before changing application services,
      // whether the existing cloudflared container is running or stopped.
      if (existing && !existing.tunnelConfigValid) throw new Error('TUNNEL_RUNTIME_CONFIG_MISMATCH');
      let before;
      if (existing?.running) {
        before = await this.capture(existing);
        this.report('TUNNEL_ALREADY_RUNNING');
      }
      this.env.PUBLIC_ORIGIN = before?.publicUrl ?? BOOTSTRAP_ORIGIN;
      if (before) {
        const services = await Promise.all(APP_SERVICES.map((service) => this.inspect(service)));
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
      const images = await this.appImages(['api', 'web', 'nginx'], { required: false });
      try {
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
      } catch (error) {
        await this.rollbackApp(images);
        if (before) await this.assertLifetime(before);
        throw error;
      }
      this.reportRunning(before);
    });
  }

  recordRunning(container) {
    this.saveState({ publicUrl: container.publicUrl, containerId: container.containerId, containerStartedAt: container.startedAt,
      restartCount: container.restartCount, capturedAt: new Date().toISOString(), status: 'running', qaStatus: 'PENDING' });
  }

  reportRunning(container) {
    this.report(`E01=RUNNING\nPUBLIC_URL=${container.publicUrl}\nURL_STABILITY_SCOPE=SAME_CLOUDFLARED_LIFETIME`);
  }

  reportLifetime(stage, container) {
    this.report(`URL_${stage}=${container.publicUrl}\nTUNNEL_CONTAINER_${stage}=${container.containerId.slice(0, 12)}\nTUNNEL_STARTED_AT_${stage}=${container.startedAt}\nTUNNEL_RESTART_COUNT_${stage}=${container.restartCount}`);
  }

  async status() {
    let container = await this.tunnel();
    let current;
    if (container?.running) {
      try { current = await this.capture(container); } catch (error) { this.report(`URL_STATUS=${safeErrorCode(error)}`); }
    }
    // A remembered URL proves its identity, not that the edge is connected now.
    let connected = current ? await this.publicReady(current.publicUrl, '/healthz', 5000) : false;
    if (current) {
      container = await this.tunnel();
      if (!container?.tunnelConfigValid || !sameTunnelLifetime(current, { ...container, publicUrl: current.publicUrl })) {
        current = undefined;
        connected = false;
        this.report('URL_STATUS=TUNNEL_LIFECYCLE_REGRESSION');
      }
    }
    const services = {};
    for (const service of ['nginx', 'api', 'db']) services[service] = await this.inspect(service);
    const saved = this.readStateSafe();
    const publicUrl = current?.publicUrl ?? (saved?.publicUrl ? 'STALE_OR_UNVERIFIED' : 'NOT_CREATED');
    const connection = connected ? 'CONNECTED' : container || saved?.status ? 'DISCONNECTED' : 'NOT_STARTED';
    const origin = current && services.api?.publicOrigin === current.publicUrl ? 'MATCH' : 'MISMATCH';
    const safe = { cloudflared: container?.running ? 'RUNNING' : 'STOPPED',
      quickTunnel: connection,
      container: container?.containerId?.slice(0, 12) ?? 'NOT_CREATED',
      publicUrl,
      publicUrlStatus: current ? 'CURRENT' : publicUrl === 'NOT_CREATED' ? 'UNAVAILABLE' : 'STALE_OR_UNVERIFIED',
      nginx: services.nginx?.running && services.nginx.health === 'healthy' ? 'healthy' : 'unhealthy',
      api: services.api?.running && services.api.health === 'healthy' ? 'healthy' : 'unhealthy',
      postgres: services.db?.running && services.db.health === 'healthy' ? 'healthy' : 'unhealthy',
      publicOrigin: origin,
      // Keep the old key as a compatibility alias while the CLI uses MATCH/MISMATCH.
      publicOriginMatch: origin };
    this.report(JSON.stringify(safe, null, 2));
    return safe;
  }

  async stop() {
    return this.locked(async () => {
      const container = await this.tunnel();
      if (container?.running) await this.docker(['stop', container.containerId]);
      const state = this.readStateSafe();
      this.saveState({ publicUrl: state?.publicUrl, containerId: container?.containerId ?? state?.containerId,
        containerStartedAt: state?.containerStartedAt ?? state?.startedAt, restartCount: state?.restartCount,
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
      const updatedServices = nginx ? ['api', 'web', 'nginx'] : ['api', 'web'];
      const images = await this.appImages(updatedServices);
      this.reportLifetime('BEFORE', before);
      try {
        await this.compose('app', ['build', '--quiet', 'api', 'web']);
        await this.compose('app', ['up', '-d', '--no-deps', '--force-recreate', '--wait', 'api', 'web']);
        if (nginx) await this.compose('app', ['up', '-d', '--no-deps', '--force-recreate', '--wait', 'nginx']);
        await this.reloadNginx();
        await this.internalReady();
        await this.assertLifetime(before);
        await this.smoke(before.publicUrl);
      } catch (error) {
        await this.rollbackApp(images);
        await this.assertLifetime(before);
        throw error;
      }
      await this.assertLifetime(before);
      this.reportLifetime('AFTER', before);
      this.report('PASS — QUICK TUNNEL URL PRESERVED DURING APP REDEPLOY');
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
