import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { formatReport, loadLocalEnv, REQUIRED_ENV, runPreflight } from '../tools/e01-preflight.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicUrl = 'https://farm-owner.trycloudflare.com';
const validPublicEnv = Object.freeze({
  PERSISTENCE_DRIVER: 'postgres', APP_ENV: 'demo', COOKIE_SECURE: 'true',
  SESSION_SECRET: 'owner-only-session-secret-012345678901',
  POSTGRES_PASSWORD: 'owner-only-db-password-012345',
  DATABASE_URL: 'postgresql://mo_farm:owner-only-db-password-012345@db:5432/mo_farm',
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

test('pre-start requires safe public configuration without token, hostname or generated origin', async () => {
  const report = await runPreflight({ env: validPublicEnv, loadDotEnv: false });
  assert.equal(report.status, 'PASS');
  assert.equal(statuses(report).PUBLIC_ORIGIN, 'MISSING');
  assert.equal(report.environment.checks.length, 0);
  for (const name of ['PUBLIC_ORIGIN', 'CLOUDFLARE_TUNNEL_TOKEN', 'CLOUDFLARE_HOSTNAME']) assert.ok(!REQUIRED_ENV.includes(name));
  assert.doesNotMatch(JSON.stringify(report), /owner-only-session-secret|owner-only-db-password|postgresql:\/\//);
  for (const name of ['ports:api-public', 'ports:db-public', 'cloudflared:quick-command', 'cloudflared:no-named-credentials', 'cloudflared:app-lifecycle-isolation', 'cloudflared:frontend-network', 'cloudflared:contract-document', 'pwa:service-worker-api-exclusion', 'api:rate-limiter']) assert.equal(checkStatus(report, name), 'PASS', name);
});

test('preflight reports defaults and blockers without exposing placeholder values', async () => {
  const report = await runPreflight({ env: {}, loadDotEnv: false });
  assert.equal(report.status, 'BLOCKED_CONFIG');
  assert.deepEqual(statuses(report), {
    PERSISTENCE_DRIVER: 'DEFAULT', APP_ENV: 'DEFAULT', PUBLIC_ORIGIN: 'MISSING',
    COOKIE_SECURE: 'DEFAULT', SESSION_SECRET: 'PLACEHOLDER', POSTGRES_PASSWORD: 'PLACEHOLDER', DATABASE_URL: 'PLACEHOLDER',
  });
  assert.doesNotMatch(formatReport(report), /change_me_minimum_32_chars|postgresql:\/\//);
  assert.ok(report.staticChecks.every((check) => check.status === 'PASS'));
});

test('malformed or non-Quick explicit origins block pre-start without value echoing', async () => {
  const invalidOrigins = [
    'http://farm-owner.trycloudflare.com', 'https://localhost', 'https://farm-owner.test',
    'https://trycloudflare.com', 'https://nested.farm-owner.trycloudflare.com',
    'https://-farm.trycloudflare.com', 'https://farm-.trycloudflare.com',
    'https://farm_owner.trycloudflare.com', 'https://farm.trycloudflare.com.evil.test',
    'https://user:password@farm-owner.trycloudflare.com',
    'https://farm-owner.trycloudflare.com:443', 'https://farm-owner.trycloudflare.com:8443',
    'https://farm-owner.trycloudflare.com/', 'https://farm-owner.trycloudflare.com/path',
    'https://farm-owner.trycloudflare.com?query=1', 'https://farm-owner.trycloudflare.com#fragment',
    ' https://farm-owner.trycloudflare.com', 'https://farm-owner.trycloudflare.com ',
    'https://*.trycloudflare.com', '*', 'not-a-url',
  ];
  for (const PUBLIC_ORIGIN of invalidOrigins) {
    const report = await runPreflight({ env: { ...validPublicEnv, PUBLIC_ORIGIN }, loadDotEnv: false });
    assert.equal(report.status, 'BLOCKED_CONFIG', PUBLIC_ORIGIN);
    assert.equal(statuses(report).PUBLIC_ORIGIN, 'INVALID', PUBLIC_ORIGIN);
    assert.ok(!formatReport(report, { json: true }).includes(JSON.stringify(PUBLIC_ORIGIN)), PUBLIC_ORIGIN);
  }
});

test('runtime requires PUBLIC_ORIGIN to exactly equal a validated generated URL', async () => {
  const env = { ...validPublicEnv, PUBLIC_ORIGIN: publicUrl };
  assert.equal((await runPreflight({ env, loadDotEnv: false, runtime: true, publicUrl })).status, 'PASS');
  for (const [origin, generated] of [[undefined, publicUrl], [publicUrl, undefined], [publicUrl, 'https://different.trycloudflare.com'], [publicUrl, 'https://other.test'], ['https://FARM-OWNER.trycloudflare.com', publicUrl]]) {
    const report = await runPreflight({ env: { ...env, PUBLIC_ORIGIN: origin }, loadDotEnv: false, runtime: true, publicUrl: generated });
    assert.equal(report.status, 'BLOCKED_CONFIG');
    assert.equal(report.environment.hostnameComparison.status, 'BLOCKED_CONFIG');
    assert.ok(report.environment.checks.some((check) => check.name === 'env:PUBLIC_ORIGIN_GENERATED_MATCH'));
    assert.doesNotMatch(formatReport(report, { json: true }), /farm-owner\.trycloudflare\.com|different\.trycloudflare\.com/);
  }
});

test('all public persistence and secret gates remain mandatory', async () => {
  const invalidValues = {
    PERSISTENCE_DRIVER: ['file', 'sqlite'], APP_ENV: ['local', 'production'], COOKIE_SECURE: ['false', 'maybe'],
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
    ['cloudflared:quick-command', (text) => text.replace('http://nginx:80', 'http://api:3000')],
    ['cloudflared:quick-command', (text) => text.replace('"--url"', '"run", "--token"')],
    ['cloudflared:image-pin', (text) => text.replace('2025.9.1', 'latest')],
    ['cloudflared:no-named-credentials', (text) => text.replace('    restart:', '    environment:\n      TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN:-}\n    restart:')],
    ['cloudflared:no-named-credentials', (text) => text.replace('    restart:', '    volumes: ["./config.yml:/etc/cloudflared/config.yml:ro"]\n    restart:')],
    ['cloudflared:no-app-dependencies', (text) => text.replace('    restart:', '    depends_on: [nginx]\n    restart:')],
    ['cloudflared:no-app-dependencies', (text) => text.replace('    restart:', '    build: .\n    restart:')],
    ['cloudflared:no-command-overrides', (text) => text.replace('    restart:', '    entrypoint: ["cloudflared", "tunnel", "run"]\n    restart:')],
    ['cloudflared:no-command-overrides', (text) => text.replace('    restart:', '    post_start:\n      - command: cloudflared tunnel run\n    restart:')],
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
  }
});

test('app-side public ports, tunnel ownership and shared network changes are rejected', async (t) => {
  for (const [name, mutate] of [
    ['ports:api-public', (text) => text.replace('  api:\n', '  api:\n    ports: ["3000:3000"]\n')],
    ['ports:nginx-bind', (text) => text.replace('"127.0.0.1:', '"0.0.0.0:')],
    ['ports:nginx-bind', (text) => text.replace(/    ports:\n      -[^\n]*/, '    ports: ["8080:80"]')],
    ['ports:nginx-bind', (text) => text.replace('"127.0.0.1:${NGINX_PORT:-8080}:80"', '"127.0.0.1:${NGINX_PORT:-8080}:80"\n      # An extra mapping must still be checked.\n\n      - "0.0.0.0:8081:80"')],
    ['ports:api-network-isolation', (text) => text.replace('  api:\n', '  api:\n    network_mode: host\n')],
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

test('Compose imports, aliases, duplicate fields and quoted hidden services fail closed', async (t) => {
  for (const [file, name] of [['compose.yaml', 'compose:app-explicit-model'], ['compose.tunnel.yaml', 'cloudflared:explicit-model']]) {
    for (const mutate of [
      (text) => `include: [other.yaml]\n${text}`,
      (text) => text.replace('services:\n', 'services:\n  <<: *hidden-services\n'),
      (text) => text.replace('services:\n', 'services:\n  "hidden":\n    image: nginx:1.27.1-alpine\n'),
      (text) => `${text}\nservices:\n  injected:\n    image: nginx:1.27.1-alpine\n`,
      (text) => text.replace('    networks: [', '    networks: [host]\n    networks: ['),
      (text) => text.replace(/^(    )(?=\S)/gm, '$1  '),
    ]) {
      const root = fixture(t);
      rewrite(root, file, mutate);
      const report = await runPreflight({ root, env: validPublicEnv, loadDotEnv: false });
      assert.equal(report.status, 'BLOCKED_SECURITY', file);
      assert.equal(checkStatus(report, name), 'BLOCKED_SECURITY', file);
    }
  }
});

test('Quick contract mutations are rejected without consulting historical Named Tunnel evidence', async (t) => {
  for (const [file, key, value, name] of [
    ['quick-tunnel-contract.json', 'canonical', false, 'cloudflared:contract-document'],
    ['quick-tunnel-contract.json', 'e01ReleasePath', false, 'cloudflared:contract-document'],
    ['quick-tunnel-contract.json', 'status', 'SUPERSEDED', 'cloudflared:contract-document'],
    ['quick-tunnel-contract.json', 'tunnelType', 'named', 'cloudflared:contract-document'],
    ['quick-tunnel-contract.json', 'tokenRequired', true, 'cloudflared:contract-document'],
    ['quick-tunnel-contract.json', 'publicOriginMode', 'wildcard', 'cloudflared:contract-document'],
    ['quick-tunnel-contract.json', 'appRedeployMustPreserveTunnel', false, 'cloudflared:contract-document'],
  ]) {
    const root = fixture(t);
    rewrite(root, `infra/cloudflared/${file}`, (text) => JSON.stringify({ ...JSON.parse(text), [key]: value }));
    const report = await runPreflight({ root, env: validPublicEnv, loadDotEnv: false });
    assert.equal(report.status, 'BLOCKED_SECURITY', name);
    assert.equal(checkStatus(report, name), 'BLOCKED_SECURITY', name);
  }
  const root = fixture(t);
  rewrite(root, 'infra/cloudflared/named-tunnel-contract.json', (text) => JSON.stringify({
    ...JSON.parse(text), status: 'ACTIVE', canonical: true,
  }));
  const report = await runPreflight({ root, env: validPublicEnv, loadDotEnv: false });
  assert.equal(report.status, 'PASS');
});

test('missing secrets never conceal existing security blockers', async (t) => {
  const root = fixture(t);
  rewrite(root, 'apps/web/sw.js', (text) => text.replace(/pathname\.startsWith\((['"])\/api\/\1\)/g, "pathname.startsWith('/not-api/')"));
  const report = await runPreflight({ root, env: {}, loadDotEnv: false });
  assert.equal(report.status, 'BLOCKED_CONFIG');
  assert.equal(checkStatus(report, 'pwa:service-worker-api-exclusion'), 'BLOCKED_SECURITY');
});
