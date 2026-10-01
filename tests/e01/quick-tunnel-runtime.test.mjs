import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateQuickTunnelUrl, discoverQuickTunnelUrl, sameTunnelLifetime } from '../../tools/lib/quick-tunnel.mjs';
import { QuickTunnelRuntime, safeErrorCode } from '../../tools/lib/quick-tunnel-runtime.mjs';

const publicUrl = 'https://farm-demo-123.trycloudflare.com';
const lifetime = { containerId: 'tunnel-id', startedAt: '2026-10-01T00:00:00Z', restartCount: 0, running: true, publicUrl, tunnelConfigValid: true };
const postgresReadiness = { status: 'ok', service: 'mo-farm-api', checks: { persistenceDriver: 'postgres', persistenceReady: true } };

test('URL validation rejects lookalikes, URL parser normalization and wildcard origins', () => {
  assert.equal(validateQuickTunnelUrl(publicUrl), publicUrl);
  for (const invalid of ['http://farm.trycloudflare.com', 'https://trycloudflare.com',
    'https://farm.trycloudflare.com.evil.test', 'https://farm.trycloudflare.com@evil.test',
    'https://farm.trycloudflare.com:443', 'https://farm.trycloudflare.com/',
    'https://farm.trycloudflare.com/path', 'https://farm.trycloudflare.com?x=1',
    'https://*.trycloudflare.com', 'https://-bad.trycloudflare.com', 'https://bad-.trycloudflare.com',
    'https://a.b.trycloudflare.com', 'https://localhost', 'https://farm.trycloudflare.com\n',
    `https://${'a'.repeat(64)}.trycloudflare.com`]) {
    assert.throws(() => validateQuickTunnelUrl(invalid), /INVALID_QUICK_TUNNEL_URL/, invalid);
  }
  assert.equal(discoverQuickTunnelUrl(`INF | ${publicUrl} |\n unrelated https://docs.example.com`), publicUrl);
  assert.equal(discoverQuickTunnelUrl(`INF ${publicUrl}.evil.test`), undefined);
  assert.throws(() => discoverQuickTunnelUrl(`${publicUrl} https://different.trycloudflare.com`), /AMBIGUOUS/);
});

test('lifetime comparison catches same-container process restart and URL rotation', () => {
  assert.equal(sameTunnelLifetime(lifetime, { ...lifetime }), true);
  assert.equal(sameTunnelLifetime({}, { running: true }), false);
  assert.equal(sameTunnelLifetime({ ...lifetime, running: false }, lifetime), false);
  for (const difference of [{ containerId: 'new' }, { startedAt: 'later' }, { restartCount: 1 },
    { publicUrl: 'https://new.trycloudflare.com' }, { running: false }]) {
    assert.equal(sameTunnelLifetime(lifetime, { ...lifetime, ...difference }), false);
  }
});

function harness(t, { running = true, state = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mo-farm-quick-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const calls = [];
  let current = { ...lifetime, running };
  let apiOrigin = running ? publicUrl : 'https://bootstrap.invalid';
  const runtime = new QuickTunnelRuntime({ root, env: {}, sleep: async () => {}, report: () => {} });
  runtime.preflight = async () => {};
  runtime.docker = async (args) => {
    calls.push(args);
    if (args[0] === 'logs') return `INF | ${publicUrl} |`;
    if (args[0] === 'stop') current.running = false;
    return '';
  };
  runtime.inspect = async (service) => service === 'cloudflared' ? { ...current }
    : { running: true, containerId: `${service}-id`, imageId: `${service}-old-image`,
      imageTag: `mo-farm-${service}:latest`, publicOrigin: service === 'api' ? apiOrigin : undefined, health: 'healthy' };
  runtime.compose = async (stack, args) => {
    calls.push([stack, ...args]);
    if (stack === 'tunnel' && args[0] === 'up') current = { ...lifetime };
    if (stack === 'app' && args[0] === 'up' && args.includes('api')) apiOrigin = runtime.env.PUBLIC_ORIGIN;
    if (args[0] === 'exec' && args.at(-1) === 'http://127.0.0.1/api/health/ready') return JSON.stringify(postgresReadiness);
    return '';
  };
  runtime.fetcher = async (url) => ({ ok: true, body: { cancel: async () => {} },
    json: async () => url.endsWith('/healthz') ? { status: 'ok', service: 'nginx' } : postgresReadiness });
  if (state) runtime.saveState({ ...lifetime, status: 'running', capturedAt: '2026-10-01T00:00:00Z' });
  return { runtime, calls, setCurrent: (value) => { current = { ...current, ...value }; } };
}

test('first start binds exact origin after capture and repeated start never calls tunnel compose', async (t) => {
  const { runtime, calls } = harness(t, { running: false, state: false });
  await runtime.start();
  assert.equal(runtime.env.PUBLIC_ORIGIN, publicUrl);
  assert.equal(runtime.readState().publicUrl, publicUrl);
  assert.equal(runtime.readState().containerStartedAt, lifetime.startedAt);
  assert.equal(runtime.readState().status, 'running');
  const tunnelCommands = calls.filter((call) => call[0] === 'tunnel');
  assert.deepEqual(tunnelCommands, [['tunnel', 'up', '-d', '--no-recreate', 'cloudflared']]);
  assert.ok(calls.some((call) => call[0] === 'app' && call.includes('--force-recreate') && call.at(-1) === 'api'));
  calls.length = 0;
  await runtime.start();
  assert.equal(calls.some((call) => call[0] === 'tunnel'), false);
  assert.equal(calls.some((call) => call.includes('build') || call.includes('up') || call.includes('migrate')), false);
  assert.equal(runtime.readState().publicUrl, publicUrl);
});

test('application redeploy preserves process and origin, reloads DNS, never modifies db/tunnel', async (t) => {
  const { runtime, calls } = harness(t);
  await runtime.update({ nginx: true });
  assert.equal(runtime.env.PUBLIC_ORIGIN, publicUrl);
  assert.equal(calls.some((call) => call[0] === 'tunnel' || call.includes('cloudflared') || call.includes('db') || call.includes('down')), false);
  assert.ok(calls.some((call) => call.includes('--force-recreate') && call.includes('nginx')));
  assert.ok(calls.some((call) => call.includes('-s') && call.includes('reload')));
});

test('unexpected restart during update reports regression without restarting cloudflared', async (t) => {
  const { runtime, calls, setCurrent } = harness(t);
  const compose = runtime.compose.bind(runtime);
  runtime.compose = async (stack, args) => {
    const result = await compose(stack, args);
    if (args[0] === 'build') setCurrent({ restartCount: 1, startedAt: '2026-10-01T01:00:00Z' });
    return result;
  };
  await assert.rejects(runtime.update(), /TUNNEL_LIFECYCLE_REGRESSION/);
  assert.equal(calls.some((call) => call[0] === 'tunnel'), false);
});

test('failed app deployment restores old images, keeps tunnel alive, and returns failure', async (t) => {
  const { runtime, calls } = harness(t);
  const compose = runtime.compose.bind(runtime);
  let failOnce = true;
  runtime.compose = async (stack, args) => {
    if (args[0] === 'up' && args.includes('api') && failOnce) { failOnce = false; throw new Error('APP_UPDATE_FAILED'); }
    return compose(stack, args);
  };
  await assert.rejects(runtime.update(), /APP_UPDATE_FAILED/);
  assert.ok(calls.some((call) => call[0] === 'tag' && call[1] === 'api-old-image'));
  assert.equal(calls.some((call) => call[0] === 'tunnel' || call.includes('stop') || call.includes('db')), false);
});

test('stop affects tunnel only and makes runtime origin stale', async (t) => {
  const { runtime, calls } = harness(t);
  await runtime.stop();
  assert.deepEqual(calls, [['stop', 'tunnel-id']]);
  assert.equal(runtime.readState().status, 'stale');
  assert.doesNotMatch(fs.readFileSync(path.join(runtime.runtimePath, 'quick-tunnel.env'), 'utf8'), /PUBLIC_ORIGIN=/);
});

test('log eviction reuses state only for the same live process; status never returns credentials', async (t) => {
  const { runtime, setCurrent } = harness(t);
  runtime.docker = async () => '';
  assert.equal((await runtime.capture(await runtime.tunnel())).publicUrl, publicUrl);
  const status = await runtime.status();
  assert.equal(status.quickTunnel, 'CONNECTED');
  assert.equal(status.publicOrigin, 'MATCH');
  assert.equal(status.publicOriginMatch, 'MATCH');
  assert.equal(status.publicUrlStatus, 'CURRENT');
  assert.doesNotMatch(JSON.stringify(status), /imageId|SESSION_SECRET|POSTGRES_PASSWORD|cookie|DATABASE_URL/);
  setCurrent({ startedAt: '2026-10-02T00:00:00Z', restartCount: 1 });
  await assert.rejects(runtime.capture(await runtime.tunnel()), /QUICK_TUNNEL_URL_NOT_FOUND/);
});

test('status distinguishes an absent tunnel from a running process without a captured URL', async (t) => {
  const { runtime } = harness(t, { running: false, state: false });
  const tunnel = runtime.tunnel.bind(runtime);
  runtime.tunnel = async () => undefined;
  const absent = await runtime.status();
  assert.equal(absent.cloudflared, 'STOPPED');
  assert.equal(absent.quickTunnel, 'NOT_STARTED');
  assert.equal(absent.publicUrlStatus, 'UNAVAILABLE');
  runtime.tunnel = tunnel;

  const runningTunnel = { ...lifetime, running: true };
  const inspect = runtime.inspect.bind(runtime);
  runtime.inspect = async (service) => service === 'cloudflared' ? runningTunnel : inspect(service);
  runtime.docker = async (args) => args[0] === 'logs' ? '' : '';
  const disconnected = await runtime.status();
  assert.equal(disconnected.cloudflared, 'RUNNING');
  assert.equal(disconnected.quickTunnel, 'DISCONNECTED');
  assert.equal(disconnected.publicOrigin, 'MISMATCH');
});

test('status does not echo an invalid URL from tampered runtime state', async (t) => {
  const { runtime } = harness(t, { running: false, state: false });
  fs.mkdirSync(runtime.runtimePath, { recursive: true });
  fs.writeFileSync(path.join(runtime.runtimePath, 'quick-tunnel.json'), JSON.stringify({
    status: 'stale', publicUrl: 'https://attacker.example/?secret=private',
  }));
  const status = await runtime.status();
  assert.equal(status.publicUrl, 'NOT_CREATED');
  assert.equal(status.publicUrlStatus, 'UNAVAILABLE');
  assert.doesNotMatch(JSON.stringify(status), /attacker|private/);
});

test('concurrent lifecycle mutations are refused by the runtime lock', async (t) => {
  const { runtime } = harness(t);
  await runtime.locked(async () => {
    const owner = JSON.parse(fs.readFileSync(path.join(runtime.runtimePath, 'quick-tunnel.lock', 'owner.json'), 'utf8'));
    assert.equal(owner.pid, process.pid);
    await assert.rejects(runtime.stop(), /TUNNEL_OPERATION_LOCKED/);
  });
  assert.equal(fs.existsSync(path.join(runtime.runtimePath, 'quick-tunnel.lock')), false);
});

test('status and CLI diagnostics never echo secret-bearing external exceptions', async (t) => {
  const { runtime } = harness(t);
  const reports = [];
  runtime.report = (value) => reports.push(value);
  runtime.capture = async () => { throw new Error('SESSION_SECRET=PRIVATE_VALUE'); };
  assert.equal(safeErrorCode(new Error('SESSION_SECRET=PRIVATE_VALUE')), 'QUICK_TUNNEL_OPERATION_FAILED');
  await runtime.status();
  assert.doesNotMatch(reports.join('\n'), /SESSION_SECRET|PRIVATE_VALUE/);
});

test('stop invalidates corrupt state without changing application services', async (t) => {
  const { runtime, calls } = harness(t);
  fs.writeFileSync(path.join(runtime.runtimePath, 'quick-tunnel.json'), 'broken JSON');
  await runtime.stop();
  assert.deepEqual(calls, [['stop', 'tunnel-id']]);
  assert.equal(runtime.readState().status, 'stale');
});

test('existing tunnel runtime configuration drift blocks reuse without recreating it', async (t) => {
  const { runtime, setCurrent, calls } = harness(t);
  setCurrent({ tunnelConfigValid: false });
  await assert.rejects(runtime.start(), /TUNNEL_RUNTIME_CONFIG_MISMATCH/);
  assert.equal(calls.some((call) => call[0] === 'tunnel' || call.includes('up')), false);
});

test('stopped tunnel configuration drift blocks before application startup', async (t) => {
  const { runtime, setCurrent, calls } = harness(t, { running: false, state: false });
  setCurrent({ tunnelConfigValid: false });
  await assert.rejects(runtime.start(), /TUNNEL_RUNTIME_CONFIG_MISMATCH/);
  assert.equal(calls.some((call) => call.includes('build') || call.includes('up') || call[0] === 'tunnel'), false);
});

test('Docker inspection returns only safe selected fields and checks the actual tunnel command', async (t) => {
  const { runtime } = harness(t);
  delete runtime.inspect;
  const raw = { Id: 'full-id', Image: 'image-id', RestartCount: 0,
    State: { Running: true, StartedAt: lifetime.startedAt },
    Config: { Image: 'cloudflare/cloudflared:2025.9.1', Entrypoint: ['cloudflared', '--no-autoupdate'],
      Cmd: ['tunnel', '--no-autoupdate', '--url', 'http://nginx:80'],
      Env: ['SESSION_SECRET=private-session', 'DATABASE_URL=private-db'] },
    HostConfig: { RestartPolicy: { Name: 'unless-stopped' }, PortBindings: {} },
    NetworkSettings: { Networks: { 'mo-farm-frontend': {} } }, Mounts: [] };
  runtime.docker = async (args) => args[0] === 'ps' ? 'short-id' : JSON.stringify(raw);
  let result = await runtime.tunnel();
  assert.equal(result.tunnelConfigValid, true);
  assert.doesNotMatch(JSON.stringify(result), /private-session|private-db|SESSION_SECRET|DATABASE_URL/);
  raw.Config.Cmd = ['tunnel', '--url', 'http://api:3000'];
  result = await runtime.tunnel();
  assert.equal(result.tunnelConfigValid, false);
  raw.Config.Cmd = ['tunnel', '--no-autoupdate', '--url', 'http://nginx:80'];
  raw.Config.Entrypoint = ['other-program'];
  assert.equal((await runtime.tunnel()).tunnelConfigValid, false);
});

test('stopped or replaced tunnel after an update is always a lifecycle regression', async (t) => {
  const { runtime, setCurrent } = harness(t);
  for (const difference of [{ running: false }, { running: true, containerId: 'replacement' }]) {
    setCurrent(difference);
    await assert.rejects(runtime.assertLifetime(lifetime), /TUNNEL_LIFECYCLE_REGRESSION/);
  }
});

test('a captured URL alone cannot report CONNECTED when the edge probe fails', async (t) => {
  const { runtime } = harness(t);
  const failures = [
    async () => ({ ok: false, body: { cancel: async () => {} } }),
    async () => ({ ok: true, json: async () => ({ status: 'ok', service: 'other' }) }),
    async () => { throw new Error('private proxy credential'); },
  ];
  for (const fetcher of failures) {
    runtime.fetcher = fetcher;
    const status = await runtime.status();
    assert.equal(status.quickTunnel, 'DISCONNECTED');
    assert.equal(status.publicUrl, publicUrl);
    assert.equal(status.publicUrlStatus, 'CURRENT');
    assert.equal(status.publicOrigin, 'MATCH');
  }
});

test('status probes only the validated origin and rechecks lifetime after the response', async (t) => {
  const { runtime, setCurrent } = harness(t);
  runtime.fetcher = async (url, options) => {
    assert.equal(url, `${publicUrl}/healthz`);
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Origin, publicUrl);
    assert.ok(options.signal instanceof AbortSignal);
    setCurrent({ running: false });
    return { ok: true, json: async () => ({ status: 'ok', service: 'nginx' }) };
  };
  const status = await runtime.status();
  assert.equal(status.cloudflared, 'STOPPED');
  assert.equal(status.quickTunnel, 'DISCONNECTED');
  assert.equal(status.publicUrlStatus, 'STALE_OR_UNVERIFIED');
});

test('a stopped existing tunnel with no saved state is DISCONNECTED', async (t) => {
  const { runtime } = harness(t, { running: false, state: false });
  assert.equal((await runtime.status()).quickTunnel, 'DISCONNECTED');
});

test('internal readiness requires healthy PostgreSQL before a tunnel is created', async (t) => {
  const { runtime, calls } = harness(t, { running: false, state: false });
  const inspect = runtime.inspect.bind(runtime);
  runtime.inspect = async (service) => {
    const result = await inspect(service);
    return service === 'db' ? { ...result, health: 'unhealthy' } : result;
  };
  await assert.rejects(runtime.start(), /INTERNAL_READINESS_FAILED/);
  assert.equal(calls.some((call) => call[0] === 'tunnel'), false);
});

test('internal readiness rejects HTTP success from a file persistence API', async (t) => {
  const { runtime, calls } = harness(t, { running: false, state: false });
  const compose = runtime.compose.bind(runtime);
  runtime.compose = async (stack, args) => args.at(-1) === 'http://127.0.0.1/api/health/ready'
    ? JSON.stringify({ ...postgresReadiness, checks: { persistenceDriver: 'file', persistenceReady: true } })
    : compose(stack, args);
  await assert.rejects(runtime.start(), /INTERNAL_READINESS_FAILED/);
  assert.equal(calls.some((call) => call[0] === 'tunnel'), false);
});

test('optional Nginx deployment failure repairs every updated app service only', async (t) => {
  const { runtime, calls } = harness(t);
  const compose = runtime.compose.bind(runtime);
  let failOnce = true;
  runtime.compose = async (stack, args) => {
    if (args[0] === 'up' && args.at(-1) === 'nginx' && failOnce) {
      failOnce = false;
      throw new Error('NGINX_DEPLOY_FAILED');
    }
    return compose(stack, args);
  };
  await assert.rejects(runtime.update({ nginx: true }), /NGINX_DEPLOY_FAILED/);
  assert.ok(calls.some((call) => call[0] === 'tag' && call[1] === 'nginx-old-image'));
  assert.ok(calls.some((call) => call.includes('--no-build') && call.includes('--pull')
    && call.includes('never') && ['api', 'web', 'nginx'].every((service) => call.includes(service))));
  assert.equal(calls.some((call) => call[0] === 'tunnel' || call.includes('db') || call.includes('stop')), false);
});

test('invalid runtime URL is rejected before any state file is written', async (t) => {
  const { runtime } = harness(t, { running: false, state: false });
  assert.throws(() => runtime.saveState({ status: 'running', publicUrl: 'https://private.example' }), /INVALID_QUICK_TUNNEL_URL/);
  assert.equal(fs.existsSync(path.join(runtime.runtimePath, 'quick-tunnel.json')), false);
});

test('valid live logs recover corrupted ignored runtime state', async (t) => {
  const { runtime } = harness(t);
  fs.writeFileSync(path.join(runtime.runtimePath, 'quick-tunnel.json'), 'broken JSON');
  assert.equal((await runtime.capture(await runtime.tunnel())).publicUrl, publicUrl);
});

test('repairing an app during start rolls back failure without changing the live tunnel', async (t) => {
  const { runtime, calls } = harness(t);
  const inspect = runtime.inspect.bind(runtime);
  const compose = runtime.compose.bind(runtime);
  let repaired = false;
  let failOnce = true;
  runtime.inspect = async (service) => {
    const result = await inspect(service);
    return service === 'web' && !repaired ? { ...result, health: 'unhealthy' } : result;
  };
  runtime.compose = async (stack, args) => {
    if (args[0] === 'up' && args.includes('api') && failOnce) {
      failOnce = false;
      throw new Error('APP_REPAIR_FAILED');
    }
    if (args.includes('--no-build')) repaired = true;
    return compose(stack, args);
  };
  await assert.rejects(runtime.start(), /APP_REPAIR_FAILED/);
  assert.equal(repaired, true);
  assert.ok(calls.some((call) => call[0] === 'tag' && call[1] === 'nginx-old-image'));
  assert.equal(calls.some((call) => call[0] === 'tunnel' || call.includes('stop') || call.includes('down')), false);
  assert.equal((await runtime.tunnel()).containerId, lifetime.containerId);
});

test('failure to repair the app is reported safely and preserves the tunnel', async (t) => {
  const { runtime, calls } = harness(t);
  const reports = [];
  runtime.report = (value) => reports.push(value);
  const compose = runtime.compose.bind(runtime);
  runtime.compose = async (stack, args) => {
    if (args[0] === 'up') throw new Error('APP_DEPLOY_FAILED');
    return compose(stack, args);
  };
  await assert.rejects(runtime.update({ nginx: true }), /APP_DEPLOY_FAILED/);
  assert.ok(reports.includes('APP_ROLLBACK=FAILED_REPAIR_APP_REQUIRED'));
  assert.equal(calls.some((call) => call[0] === 'tunnel' || call.includes('stop')), false);
});

test('app redeploy reports before and after process identity and URL explicitly', async (t) => {
  const { runtime } = harness(t);
  const reports = [];
  runtime.report = (value) => reports.push(value);
  await runtime.update();
  const output = reports.join('\n');
  for (const stage of ['BEFORE', 'AFTER']) {
    assert.ok(output.includes(`URL_${stage}=${publicUrl}`));
    assert.ok(output.includes(`TUNNEL_STARTED_AT_${stage}=${lifetime.startedAt}`));
    assert.ok(output.includes(`TUNNEL_RESTART_COUNT_${stage}=0`));
  }
  assert.ok(reports.includes('PASS — QUICK TUNNEL URL PRESERVED DURING APP REDEPLOY'));
});
