import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { formatReport, loadLocalEnv, REQUIRED_ENV, runPreflight } from '../tools/e01-preflight.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicOrigin = 'https://farm-owner.test';
const validPublicEnv = Object.freeze({
  PERSISTENCE_DRIVER: 'postgres', APP_ENV: 'demo', COOKIE_SECURE: 'true',
  SESSION_SECRET: 'owner-only-session-secret-012345678901',
  POSTGRES_PASSWORD: 'owner-only-db-password-012345',
  DATABASE_URL: 'postgresql://mo_farm:owner-only-db-password-012345@db:5432/mo_farm',
  PUBLIC_ORIGIN: publicOrigin,
  CLOUDFLARE_HOSTNAME: 'farm-owner.test',
  CLOUDFLARE_TUNNEL_TOKEN: 'dummy-owner-named-token-0123456789',
});
const fixtureFiles = [
  'compose.yaml', 'compose.tunnel.yaml',
  'infra/cloudflared/quick-tunnel-contract.json', 'infra/cloudflared/named-tunnel-contract.json',
  'apps/web/server.mjs', 'apps/web/Dockerfile', 'apps/web/sw.js',
  'apps/api/src/server.mjs', 'apps/api/src/security/rateLimiter.mjs',
  'infra/nginx/conf.d/default.conf', 'infra/nginx/nginx.conf',
];

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mo-farm-preflight-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const file of fixtureFiles) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), path.join(root, file));
  }
  return root;
}

function rewrite(root, file, transform) {
  const target = path.join(root, file);
  fs.writeFileSync(target, transform(fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n')));
}

function statuses(report) {
  return Object.fromEntries(report.environment.entries.map(({ name, status }) => [name, status]));
}

function checkStatus(report, name) {
  return report.staticChecks.find((check) => check.name === name)?.status;
}

test('Named pre-start requires fixed origin, hostname and externally injected token', async () => {
  const report = await runPreflight({ env: validPublicEnv, loadDotEnv: false });
  assert.equal(report.status, 'PASS');
  assert.equal(statuses(report).PUBLIC_ORIGIN, 'SET');
  assert.equal(report.environment.checks.length, 0);
  assert.equal(report.environment.hostnameComparison.status, 'PASS');
  for (const name of ['PUBLIC_ORIGIN', 'CLOUDFLARE_TUNNEL_TOKEN', 'CLOUDFLARE_HOSTNAME']) assert.ok(REQUIRED_ENV.includes(name));
  assert.doesNotMatch(JSON.stringify(report), /owner-only-session-secret|owner-only-db-password|dummy-owner-named-token|postgresql:\/\//);
  for (const name of ['ports:api-public', 'ports:db-public', 'cloudflared:named-command', 'cloudflared:token-transport', 'cloudflared:quick-tunnel-disabled', 'cloudflared:app-lifecycle-isolation', 'cloudflared:frontend-network', 'pwa:service-worker-api-exclusion', 'api:rate-limiter']) assert.equal(checkStatus(report, name), 'PASS', name);
});

test('preflight reports defaults and blockers without exposing placeholder values', async () => {
  const report = await runPreflight({ env: {}, loadDotEnv: false });
  assert.equal(report.status, 'BLOCKED_CONFIG');
  assert.deepEqual(statuses(report), {
    PERSISTENCE_DRIVER: 'DEFAULT', APP_ENV: 'DEFAULT', PUBLIC_ORIGIN: 'MISSING',
    COOKIE_SECURE: 'DEFAULT', SESSION_SECRET: 'PLACEHOLDER', POSTGRES_PASSWORD: 'PLACEHOLDER',
    CLOUDFLARE_TUNNEL_TOKEN: 'MISSING', CLOUDFLARE_HOSTNAME: 'PLACEHOLDER', DATABASE_URL: 'PLACEHOLDER',
  });
  assert.doesNotMatch(formatReport(report), /change_me_minimum_32_chars|postgresql:\/\//);
  assert.ok(report.staticChecks.every((check) => check.status === 'PASS'));
});

test('noncanonical public origins including Quick domains fail without value echoing', async () => {
  const invalidOrigins = [
    'http://farm-owner.test', 'https://localhost', 'https://127.0.0.1', 'https://[::1]',
    'https://trycloudflare.com', 'https://farm-owner.trycloudflare.com',
    'https://nested.farm-owner.trycloudflare.com', 'https://farm.local',
    'https://-farm.test', 'https://farm-.test', 'https://farm_owner.test',
    'https://user:password@farm-owner.test', 'https://farm-owner.test:443', 'https://farm-owner.test:8443',
    'https://farm-owner.test/', 'https://farm-owner.test/path',
    'https://farm-owner.test?query=1', 'https://farm-owner.test#fragment',
    ' https://farm-owner.test', 'https://farm-owner.test ', 'https://FARM-OWNER.test',
    'https://*.farm-owner.test', '*', 'not-a-url',
  ];
  for (const PUBLIC_ORIGIN of invalidOrigins) {
    const report = await runPreflight({ env: { ...validPublicEnv, PUBLIC_ORIGIN }, loadDotEnv: false });
    assert.equal(report.status, 'BLOCKED_CONFIG', PUBLIC_ORIGIN);
    assert.equal(statuses(report).PUBLIC_ORIGIN, 'INVALID', PUBLIC_ORIGIN);
    assert.ok(!formatReport(report, { json: true }).includes(JSON.stringify(PUBLIC_ORIGIN)), PUBLIC_ORIGIN);
  }
});

test('origin must exactly match the fixed hostname before any tunnel start', async () => {
  for (const env of [
    { ...validPublicEnv, PUBLIC_ORIGIN: 'https://different-owner.test' },
    { ...validPublicEnv, CLOUDFLARE_HOSTNAME: 'different-owner.test' },
    { ...validPublicEnv, PUBLIC_ORIGIN: '' },
    { ...validPublicEnv, CLOUDFLARE_HOSTNAME: '' },
  ]) {
    const report = await runPreflight({ env, loadDotEnv: false });
    assert.equal(report.status, 'BLOCKED_CONFIG');
    assert.equal(report.environment.hostnameComparison.status, 'BLOCKED_CONFIG');
    assert.ok(report.environment.checks.some((check) => check.name === 'env:PUBLIC_ORIGIN_HOSTNAME_MATCH'));
    assert.doesNotMatch(formatReport(report, { json: true }), /different-owner\.test|farm-owner\.test/);
  }
});

test('invalid and missing Named credentials cannot pass the public gate', async () => {
  const invalidValues = {
    CLOUDFLARE_TUNNEL_TOKEN: ['', 'short', '<inject-token>', 'change_me_owner_token_123456789', 'dummy token with spaces', ' dummy-owner-named-token-0123456789'],
    CLOUDFLARE_HOSTNAME: ['', 'example.com', 'farm.example.com', 'foo.example.com', 'localhost', 'farm.local', 'farm.internal', '127.0.0.1', '[::1]', 'trycloudflare.com', 'farm.trycloudflare.com', '*.farm-owner.test', 'farm_owner.test', 'farm-owner.test/path', 'farm-owner.test:443', 'FARM-OWNER.test', ' farm-owner.test'],
  };
  for (const [name, values] of Object.entries(invalidValues)) {
    for (const value of values) {
      const report = await runPreflight({ env: { ...validPublicEnv, [name]: value }, loadDotEnv: false });
      assert.equal(report.status, 'BLOCKED_CONFIG', name);
      assert.ok(report.environment.checks.some((check) => check.name === 'env:' + name), name);
      assert.doesNotMatch(formatReport(report), /dummy-owner-named-token-0123456789|dummy token with spaces/);
    }
  }
});

test('all public persistence and secret gates remain mandatory', async () => {
  const invalidValues = {
    PERSISTENCE_DRIVER: ['file', 'sqlite', 'POSTGRES'], APP_ENV: ['local', 'production', 'DEMO'], COOKIE_SECURE: ['false', 'maybe', 'TRUE'],
    SESSION_SECRET: ['change_me_minimum_32_chars', 'short'], POSTGRES_PASSWORD: ['change_me', 'short'],
    DATABASE_URL: ['postgresql://mo_farm:change_me@db:5432/mo_farm', 'mysql://user:password@db/farm', 'postgresql://mo_farm@db/mo_farm'],
  };
  for (const [name, values] of Object.entries(invalidValues)) {
    for (const value of [...values, '']) {
      const report = await runPreflight({ env: { ...validPublicEnv, [name]: value }, loadDotEnv: false });
      assert.equal(report.status, 'BLOCKED_CONFIG', name);
      assert.ok(report.environment.checks.some((check) => check.name === `env:${name}`), name);
    }
  }
});

test('local dotenv resolution is shared, process-first, and does not follow APP_ENV paths', (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, '.env'), 'APP_ENV=demo\nCOOKIE_SECURE=false\nSESSION_SECRET=base-value\n');
  fs.writeFileSync(path.join(root, '.env.demo'), 'COOKIE_SECURE=true\nSESSION_SECRET="selected-value"\n');
  const resolved = loadLocalEnv(root, { SESSION_SECRET: 'process-value' });
  assert.equal(resolved.APP_ENV, 'demo');
  assert.equal(resolved.COOKIE_SECURE, 'true');
  assert.equal(resolved.SESSION_SECRET, 'process-value');
  assert.equal(loadLocalEnv(root, { APP_ENV: '../demo' }).COOKIE_SECURE, 'false');
  assert.equal(loadLocalEnv(root, { APP_ENV: 'local' }).COOKIE_SECURE, 'false');
});

test('unsafe tunnel lifecycle, credentials, command and network mutations block static gates', async (t) => {
  const cases = [
    ['cloudflared:named-command', (text) => text.replace('"run"', '"run", "--token", "dummy-command-token-0123456789"')],
    ['cloudflared:named-command', (text) => text.replace('    restart:', '    entrypoint: ["sh", "-c"]\n    restart:')],
    ['cloudflared:quick-tunnel-disabled', (text) => text.replace('"run"', '"--url", "http://nginx:80"')],
    ['cloudflared:quick-tunnel-disabled', (text) => text.replace('"run"', '"--url", "https://farm.trycloudflare.com"')],
    ['cloudflared:image-pin', (text) => text.replace('2025.9.1', 'latest')],
    ['cloudflared:token-transport', (text) => text.replace('TUNNEL_TOKEN:', 'CLOUDFLARE_TUNNEL_TOKEN:')],
    ['cloudflared:token-transport', (text) => text.replace('$' + '{CLOUDFLARE_TUNNEL_TOKEN:-}', 'literal-token-that-must-never-be-committed')],
    ['cloudflared:token-transport', (text) => text.replace('      TUNNEL_TOKEN:', '      OTHER_SECRET: unused\n      TUNNEL_TOKEN:')],
    ['cloudflared:internal-metrics', (text) => text.replace('TUNNEL_METRICS: 0.0.0.0:2000', 'TUNNEL_METRICS: 127.0.0.1:2000')],
    ['cloudflared:no-mounted-credentials', (text) => text.replace('    restart:', '    volumes: ["./config.yml:/etc/cloudflared/config.yml:ro"]\n    restart:')],
    ['cloudflared:no-app-dependencies', (text) => text.replace('    restart:', '    depends_on: [nginx]\n    restart:')],
    ['cloudflared:no-app-dependencies', (text) => text.replace('    restart:', '    build: .\n    restart:')],
    ['cloudflared:no-host-ports', (text) => text.replace('    restart:', '    ports: ["8081:80"]\n    restart:')],
    ['cloudflared:restart-policy', (text) => text.replace('unless-stopped', 'no')],
    ['cloudflared:bounded-logs', (text) => text.replace('max-size: "10m"', 'max-size: "0"')],
    ['cloudflared:bounded-logs', (text) => text.replace('max-file: "3"', 'max-file: "0"')],
    ['cloudflared:frontend-network', (text) => text.replace('external: true', 'external: false')],
    ['cloudflared:frontend-network', (text) => text.replace('name: mo-farm-frontend', 'name: wrong-network')],
    ['cloudflared:tunnel-project', (text) => text.replace('name: mo-farm-tunnel', 'name: mo-farm')],
    ['cloudflared:tunnel-only-service', (text) => text.replace('networks:\n  frontend:', '  web:\n    image: nginx:1.27.1-alpine\n\nnetworks:\n  frontend:')],
  ];
  for (const [name, mutate] of cases) {
    const root = fixture(t);
    rewrite(root, 'compose.tunnel.yaml', mutate);
    const report = await runPreflight({ root, env: validPublicEnv, loadDotEnv: false });
    assert.equal(report.status, 'BLOCKED_SECURITY', name);
    assert.equal(checkStatus(report, name), 'BLOCKED_SECURITY', name);
    assert.doesNotMatch(formatReport(report), /dummy-command-token|literal-token-that/);
  }
});

test('app-side public ports, tunnel ownership and shared network changes are rejected', async (t) => {
  for (const [name, mutate] of [
    ['ports:api-public', (text) => text.replace('  api:\n', '  api:\n    ports: ["3000:3000"]\n')],
    ['ports:nginx-bind', (text) => text.replace('"127.0.0.1:', '"0.0.0.0:')],
    ['ports:nginx-bind', (text) => text.replace(/    ports:\n      -[^\n]*/, '    ports: ["8080:80"]')],
    ['cloudflared:app-lifecycle-isolation', (text) => text.replace('services:\n', 'services:\n  cloudflared:\n    image: cloudflare/cloudflared:2025.9.1\n')],
    ['cloudflared:frontend-network', (text) => text.replace('name: mo-farm-frontend', 'name: other-frontend')],
  ]) {
    const root = fixture(t);
    rewrite(root, 'compose.yaml', mutate);
    const report = await runPreflight({ root, env: validPublicEnv, loadDotEnv: false });
    assert.equal(report.status, 'BLOCKED_SECURITY', name);
    assert.equal(checkStatus(report, name), 'BLOCKED_SECURITY', name);
  }
});

test('Named contract mutations and canonical Quick Tunnel evidence are rejected', async (t) => {
  for (const [file, key, value, name] of [
    ['named-tunnel-contract.json', 'tunnelType', 'quick', 'cloudflared:contract-document'],
    ['named-tunnel-contract.json', 'canonical', false, 'cloudflared:contract-document'],
    ['named-tunnel-contract.json', 'tokenRequired', false, 'cloudflared:contract-document'],
    ['named-tunnel-contract.json', 'fixedHostnameRequired', false, 'cloudflared:contract-document'],
    ['named-tunnel-contract.json', 'quickTunnelAllowed', true, 'cloudflared:contract-document'],
    ['named-tunnel-contract.json', 'originService', 'http://api:3000', 'cloudflared:contract-document'],
    ['named-tunnel-contract.json', 'appRedeployMustPreserveTunnel', false, 'cloudflared:contract-document'],
    ['quick-tunnel-contract.json', 'status', 'ACTIVE', 'cloudflared:quick-contract-superseded'],
    ['quick-tunnel-contract.json', 'canonical', true, 'cloudflared:quick-contract-superseded'],
    ['quick-tunnel-contract.json', 'e01ReleasePath', true, 'cloudflared:quick-contract-superseded'],
  ]) {
    const root = fixture(t);
    rewrite(root, 'infra/cloudflared/' + file, (text) => JSON.stringify({ ...JSON.parse(text), [key]: value }));
    const report = await runPreflight({ root, env: validPublicEnv, loadDotEnv: false });
    assert.equal(report.status, 'BLOCKED_SECURITY', name);
    assert.equal(checkStatus(report, name), 'BLOCKED_SECURITY', name);
  }
});

test('missing secrets never conceal existing security blockers', async (t) => {
  const root = fixture(t);
  rewrite(root, 'apps/web/sw.js', (text) => text.replace(/pathname\.startsWith\((['"])\/api\/\1\)/g, "pathname.startsWith('/not-api/')"));
  const report = await runPreflight({ root, env: {}, loadDotEnv: false });
  assert.equal(report.status, 'BLOCKED_CONFIG');
  assert.equal(checkStatus(report, 'pwa:service-worker-api-exclusion'), 'BLOCKED_SECURITY');
});
