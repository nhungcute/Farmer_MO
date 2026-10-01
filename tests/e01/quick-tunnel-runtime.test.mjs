import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateQuickTunnelUrl, discoverQuickTunnelUrl, sameTunnelLifetime } from '../../tools/lib/quick-tunnel.mjs';
import { QuickTunnelRuntime, safeErrorCode } from '../../tools/lib/quick-tunnel-runtime.mjs';

const publicUrl = 'https://farm-demo-123.trycloudflare.com';
const lifetime = { containerId: 'tunnel-id', startedAt: '2026-10-01T00:00:00Z', restartCount: 0, running: true, publicUrl, tunnelConfigValid: true };

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
    return '';
  };
  runtime.fetcher = async () => ({ ok: true, body: { cancel: async () => {} },
    json: async () => ({ checks: { persistenceDriver: 'postgres', persistenceReady: true } }) });
  if (state) runtime.saveState({ ...lifetime, status: 'running', capturedAt: '2026-10-01T00:00:00Z' });
  return { runtime, calls, setCurrent: (value) => { current = { ...current, ...value }; } };
}

test('first start binds exact origin after capture and repeated start never calls tunnel compose', async (t) => {
  const { runtime, calls } = harness(t, { running: false, state: false });
  await runtime.start();
  assert.equal(runtime.env.PUBLIC_ORIGIN, publicUrl);
  assert.equal(runtime.readState().publicUrl, publicUrl);
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
  assert.equal(status.publicOriginMatch, 'PASS');
  assert.doesNotMatch(JSON.stringify(status), /imageId|SESSION_SECRET|POSTGRES_PASSWORD|cookie|DATABASE_URL/);
  setCurrent({ startedAt: '2026-10-02T00:00:00Z', restartCount: 1 });
  await assert.rejects(runtime.capture(await runtime.tunnel()), /QUICK_TUNNEL_URL_NOT_FOUND/);
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

test('Docker inspection returns only safe selected fields and checks the actual tunnel command', async (t) => {
  const { runtime } = harness(t);
  delete runtime.inspect;
  const raw = { Id: 'full-id', Image: 'image-id', RestartCount: 0,
    State: { Running: true, StartedAt: lifetime.startedAt },
    Config: { Image: 'cloudflare/cloudflared:2025.9.1', Cmd: ['tunnel', '--no-autoupdate', '--url', 'http://nginx:80'],
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
});

test('stopped or replaced tunnel after an update is always a lifecycle regression', async (t) => {
  const { runtime, setCurrent } = harness(t);
  for (const difference of [{ running: false }, { running: true, containerId: 'replacement' }]) {
    setCurrent(difference);
    await assert.rejects(runtime.assertLifetime(lifetime), /TUNNEL_LIFECYCLE_REGRESSION/);
  }
});
