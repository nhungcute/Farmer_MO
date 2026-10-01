import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateNamedTunnelHostname, validateNamedTunnelOrigin, sameTunnelLifetime } from '../../tools/lib/named-tunnel.mjs';
import { NamedTunnelRuntime, safeErrorCode } from '../../tools/lib/named-tunnel-runtime.mjs';

const hostname = 'farm-owner.test';
const publicOrigin = `https://${hostname}`;
const token = 'synthetic-named-token-0123456789';
const lifetime = { containerId: 'tunnel-id', startedAt: '2026-10-01T00:00:00Z', restartCount: 0,
  running: true, publicOrigin, tunnelConfigValid: true };

test('fixed hostname and exact origin reject Quick Tunnel, private hosts and parser normalization', () => {
  assert.equal(validateNamedTunnelHostname(hostname), hostname);
  assert.equal(validateNamedTunnelOrigin(publicOrigin, hostname), publicOrigin);
  for (const invalid of ['localhost', 'app.localhost', '127.0.0.1', '127.1', '192.168.1.1', '::1',
    'trycloudflare.com', 'app.trycloudflare.com', 'a.b.trycloudflare.com', '*.example.com',
    '-bad.test', 'bad-.test', 'a..test', 'https://farm.test', 'farm.test/', 'Farm.test',
    `https://${'a'.repeat(64)}.test`, 'farm.internal', 'farm.local']) {
    assert.throws(() => validateNamedTunnelHostname(invalid), /INVALID_NAMED_TUNNEL_HOSTNAME/, invalid);
  }
  for (const invalid of ['*', 'http://farm-owner.test', 'https://other-owner.test',
    `${publicOrigin}/`, `${publicOrigin}:443`, `${publicOrigin}/path`, `${publicOrigin}?query=1`,
    `${publicOrigin}#fragment`, ` ${publicOrigin}`, `${publicOrigin}\n`,
    'https://user:password@farm-owner.test', 'https://quick.trycloudflare.com']) {
    assert.throws(() => validateNamedTunnelOrigin(invalid, hostname), /INVALID_NAMED_TUNNEL_ORIGIN/, invalid);
  }
});

test('ordinary app deployment must preserve tunnel container/process and fixed origin', () => {
  assert.equal(sameTunnelLifetime(lifetime, { ...lifetime }), true);
  for (const difference of [{ containerId: 'new' }, { startedAt: 'later' }, { restartCount: 1 },
    { publicOrigin: 'https://other-owner.test' }, { running: false }]) {
    assert.equal(sameTunnelLifetime(lifetime, { ...lifetime, ...difference }), false);
  }
});

function harness(t, { running = true, absent = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mo-farm-named-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const calls = [], reports = [];
  let current = absent ? undefined : { ...lifetime, running };
  let apiOrigin = publicOrigin;
  const runtime = new NamedTunnelRuntime({ root, env: { PUBLIC_ORIGIN: publicOrigin,
    CLOUDFLARE_HOSTNAME: hostname, CLOUDFLARE_TUNNEL_TOKEN: token },
    sleep: async () => {}, report: (value) => reports.push(value) });
  runtime.preflight = async () => {};
  runtime.docker = async (args) => { calls.push(args); if (args[0] === 'stop') current.running = false; return ''; };
  runtime.inspect = async (service) => service === 'cloudflared' ? current && { ...current }
    : { running: true, containerId: `${service}-id`, imageId: `${service}-old-image`,
      imageTag: `mo-farm-${service}:latest`, publicOrigin: service === 'api' ? apiOrigin : undefined, health: 'healthy' };
  runtime.compose = async (stack, args) => {
    calls.push([stack, ...args]);
    if (stack === 'tunnel' && args[0] === 'up') current = { ...lifetime };
    if (stack === 'app' && args[0] === 'up' && args.includes('api')) apiOrigin = runtime.env.PUBLIC_ORIGIN;
    if (args.includes('http://cloudflared:2000/ready')) return 'CONNECTED';
    return '';
  };
  runtime.fetcher = async () => ({ ok: true, body: { cancel: async () => {} },
    json: async () => ({ checks: { persistenceDriver: 'postgres', persistenceReady: true } }) });
  return { runtime, calls, reports, setApiOrigin: (value) => { apiOrigin = value; },
    setCurrent: (value) => { current = value === undefined ? undefined : { ...current, ...value }; } };
}

test('first start uses fixed origin immediately; repeat start does not rebuild or recreate services', async (t) => {
  const { runtime, calls, reports } = harness(t, { absent: true });
  await runtime.start();
  assert.equal(runtime.env.PUBLIC_ORIGIN, publicOrigin);
  assert.deepEqual(calls.filter((call) => call[0] === 'tunnel'), [['tunnel', 'up', '-d', '--no-recreate', 'cloudflared']]);
  assert.equal(calls.some((call) => call.includes('--force-recreate')), false);
  assert.equal(fs.existsSync(path.join(runtime.runtimePath, 'quick-tunnel.json')), false);
  assert.equal(fs.existsSync(path.join(runtime.runtimePath, 'quick-tunnel.env')), false);
  calls.length = 0;
  await runtime.start();
  assert.ok(reports.includes('TUNNEL_ALREADY_RUNNING'));
  assert.equal(calls.some((call) => call[0] === 'tunnel' || call.includes('build') || call.includes('up') || call.includes('migrate')), false);
});

test('stopped Named container starts without recreation and retains the configured origin', async (t) => {
  const { runtime, calls } = harness(t, { running: false });
  await runtime.start();
  assert.equal(runtime.env.PUBLIC_ORIGIN, publicOrigin);
  assert.deepEqual(calls.filter((call) => call[0] === 'tunnel'), [['tunnel', 'up', '-d', '--no-recreate', 'cloudflared']]);
});

test('app update selects only api/web and optional nginx, preserving db and tunnel', async (t) => {
  const { runtime, calls } = harness(t);
  await runtime.update({ nginx: true });
  assert.equal(runtime.env.PUBLIC_ORIGIN, publicOrigin);
  assert.equal(calls.some((call) => call[0] === 'tunnel' || call.includes('cloudflared') || call.includes('db') || call.includes('down')), false);
  assert.ok(calls.some((call) => call.includes('--force-recreate') && call.includes('nginx')));
  assert.ok(calls.some((call) => call.includes('-s') && call.includes('reload')));
});

test('unexpected restart during app update fails as a lifecycle regression without restarting tunnel', async (t) => {
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

test('failed app update restores previous app images while leaving tunnel/database alone', async (t) => {
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

test('stop affects only cloudflared and does not stale or rotate the fixed origin', async (t) => {
  const { runtime, calls } = harness(t);
  await runtime.stop();
  assert.deepEqual(calls, [['stop', 'tunnel-id']]);
  assert.equal(runtime.env.PUBLIC_ORIGIN, publicOrigin);
  assert.deepEqual(fs.readdirSync(runtime.runtimePath), []);
});

test('status uses only local readiness, prints safe statuses, and distinguishes not-started/disconnected', async (t) => {
  const { runtime, reports, setCurrent } = harness(t);
  runtime.fetcher = () => { throw new Error('STATUS_MUST_NOT_CONTACT_PUBLIC_HOST'); };
  assert.equal((await runtime.status()).namedTunnel, 'CONNECTED');
  assert.equal((await runtime.status()).publicOrigin, 'MATCH');
  assert.equal((await runtime.status()).hostname, 'CONFIGURED');
  const healthy = await runtime.status();
  assert.deepEqual({ nginx: healthy.nginx, api: healthy.api, postgres: healthy.postgres },
    { nginx: 'healthy', api: 'healthy', postgres: 'healthy' });
  assert.doesNotMatch(reports.join('\n'), /synthetic-named-token|SESSION_SECRET|POSTGRES_PASSWORD|DATABASE_URL|cookie/);
  setCurrent({ running: false });
  assert.equal((await runtime.status()).namedTunnel, 'DISCONNECTED');
  setCurrent(undefined);
  assert.equal((await runtime.status()).namedTunnel, 'NOT_STARTED');
});

test('connection readiness failure blocks startup without tunnel recreation or log scraping', async (t) => {
  const { runtime, calls } = harness(t);
  runtime.connected = async () => false;
  await assert.rejects(runtime.start(), /TUNNEL_NOT_CONNECTED/);
  assert.equal(calls.some((call) => call[0] === 'tunnel' || call.includes('logs')), false);
});

test('connection status remains accurate during Nginx downtime or local credential drift', async (t) => {
  const { runtime, setCurrent } = harness(t);
  const inspect = runtime.inspect.bind(runtime);
  runtime.inspect = async (service, project) => service === 'nginx' ? { running: false, health: 'stopped' } : inspect(service, project);
  assert.equal((await runtime.status()).namedTunnel, 'CONNECTED');
  setCurrent({ tunnelConfigValid: false });
  const status = await runtime.status();
  assert.equal(status.namedTunnel, 'CONNECTED');
  assert.equal(status.tunnelConfiguration, 'MISMATCH');
  runtime.inspect = async (service, project) => ['api', 'web', 'nginx'].includes(service)
    ? { running: false, health: 'stopped' } : inspect(service, project);
  assert.equal((await runtime.status()).namedTunnel, 'UNVERIFIED');
});

test('stopped/replaced tunnel and changed API origin are rejected after deployment', async (t) => {
  const { runtime, setCurrent, setApiOrigin } = harness(t);
  for (const difference of [{ running: false }, { running: true, containerId: 'replacement' }]) {
    setCurrent(difference);
    await assert.rejects(runtime.assertLifetime(lifetime), /TUNNEL_LIFECYCLE_REGRESSION/);
  }
  setCurrent(lifetime);
  setApiOrigin('https://different-owner.test');
  await assert.rejects(runtime.assertLifetime(lifetime), /PUBLIC_ORIGIN_MISMATCH/);
});

test('application origin mismatch refuses update before any build or recreation', async (t) => {
  const { runtime, calls, setApiOrigin } = harness(t);
  setApiOrigin('https://quick.trycloudflare.com');
  await assert.rejects(runtime.update(), /PUBLIC_ORIGIN_MISMATCH/);
  assert.equal(calls.length, 0);
});

test('exclusive lock records owner and refuses concurrent lifecycle mutations', async (t) => {
  const { runtime } = harness(t);
  await runtime.locked(async () => {
    const owner = JSON.parse(fs.readFileSync(path.join(runtime.runtimePath, 'named-tunnel.lock', 'owner.json'), 'utf8'));
    assert.equal(owner.pid, process.pid);
    await assert.rejects(runtime.stop(), /TUNNEL_OPERATION_LOCKED/);
  });
  assert.equal(fs.existsSync(path.join(runtime.runtimePath, 'named-tunnel.lock')), false);
  assert.equal(safeErrorCode(new Error(`TOKEN=${token}`)), 'NAMED_TUNNEL_OPERATION_FAILED');
});

test('actual Docker inspection checks Named command/token privately and refuses Quick configuration drift', async (t) => {
  const { runtime } = harness(t);
  delete runtime.inspect;
  const raw = { Id: 'full-id', Image: 'image-id', RestartCount: 0,
    State: { Running: true, StartedAt: lifetime.startedAt },
    Config: { Image: 'cloudflare/cloudflared:2025.9.1', Cmd: ['tunnel', '--no-autoupdate', 'run'],
      Env: [`TUNNEL_TOKEN=${token}`, 'TUNNEL_METRICS=0.0.0.0:2000', 'SESSION_SECRET=private-session', 'DATABASE_URL=private-db'] },
    HostConfig: { RestartPolicy: { Name: 'unless-stopped' }, PortBindings: {} },
    NetworkSettings: { Networks: { 'mo-farm-frontend': {} } }, Mounts: [] };
  runtime.docker = async (args) => args[0] === 'ps' ? 'short-id' : JSON.stringify(raw);
  let result = await runtime.tunnel();
  assert.equal(result.tunnelConfigValid, true);
  assert.doesNotMatch(JSON.stringify(result), /private-session|private-db|synthetic-named-token|SESSION_SECRET|DATABASE_URL/);
  raw.Config.Cmd = ['tunnel', '--url', 'http://nginx:80'];
  assert.equal((await runtime.tunnel()).tunnelConfigValid, false);
  raw.Config.Cmd = ['tunnel', '--no-autoupdate', 'run'];
  raw.Config.Env[0] = 'TUNNEL_TOKEN=different-private-token';
  assert.equal((await runtime.tunnel()).tunnelConfigValid, false);
});

test('stale Quick runtime files cannot supply a Named hostname or public origin', async (t) => {
  const { runtime, calls } = harness(t, { absent: true });
  fs.mkdirSync(runtime.runtimePath);
  fs.writeFileSync(path.join(runtime.runtimePath, 'quick-tunnel.json'), JSON.stringify({ publicUrl: 'https://old.trycloudflare.com' }));
  fs.writeFileSync(path.join(runtime.runtimePath, 'quick-tunnel.env'), 'PUBLIC_ORIGIN=https://old.trycloudflare.com\n');
  runtime.env.PUBLIC_ORIGIN = '';
  await assert.rejects(runtime.start(), /INVALID_NAMED_TUNNEL_ORIGIN/);
  assert.equal(calls.length, 0);
});
