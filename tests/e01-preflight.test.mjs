import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatReport, runPreflight } from '../tools/e01-preflight.mjs';

const validPublicEnv = Object.freeze({
  PERSISTENCE_DRIVER: 'postgres',
  APP_ENV: 'demo',
  PUBLIC_ORIGIN: 'https://farm-owner.test',
  COOKIE_SECURE: 'true',
  SESSION_SECRET: 'owner-only-session-secret-012345678901',
  POSTGRES_PASSWORD: 'owner-only-db-password-012345',
  CLOUDFLARE_TUNNEL_TOKEN: 'opaque-named-tunnel-token-0123456789',
  CLOUDFLARE_HOSTNAME: 'farm-owner.test',
  DATABASE_URL: 'postgresql://mo_farm:owner-only-db-password-012345@db:5432/mo_farm',
});

function statuses(report) {
  return Object.fromEntries(report.environment.entries.map(({ name, status }) => [name, status]));
}

test('E01 preflight reports safe statuses without exposing placeholder values', async () => {
  const report = await runPreflight({ env: {}, loadDotEnv: false });
  assert.equal(report.status, 'BLOCKED_CONFIG');
  assert.deepEqual(statuses(report), {
    PERSISTENCE_DRIVER: 'DEFAULT',
    APP_ENV: 'DEFAULT',
    PUBLIC_ORIGIN: 'DEFAULT',
    COOKIE_SECURE: 'DEFAULT',
    SESSION_SECRET: 'PLACEHOLDER',
    POSTGRES_PASSWORD: 'PLACEHOLDER',
    CLOUDFLARE_TUNNEL_TOKEN: 'MISSING',
    CLOUDFLARE_HOSTNAME: 'PLACEHOLDER',
    DATABASE_URL: 'PLACEHOLDER',
  });
  const output = formatReport(report);
  assert.match(output, /CLOUDFLARE_TUNNEL_TOKEN=MISSING/);
  assert.doesNotMatch(output, /change_me_minimum_32_chars|postgresql:\/\//);
});

test('valid public environment reaches static security gates without a config block', async () => {
  const report = await runPreflight({ env: validPublicEnv, loadDotEnv: false });
  assert.equal(report.environment.checks.length, 0);
  const expectedStatus = report.staticChecks.some((check) => check.status !== 'PASS') ? 'BLOCKED_SECURITY' : 'PASS';
  assert.equal(report.status, expectedStatus);
  assert.equal(report.environment.hostnameComparison.status, 'PASS');
  assert.doesNotMatch(JSON.stringify(report), /owner-only-session-secret|owner-only-db-password|opaque-named-tunnel-token/);
  for (const name of [
    'ports:api-public',
    'ports:db-public',
    'cloudflared:quick-tunnel-disabled',
    'cloudflared:token-transport',
    'cloudflared:nginx-dependency',
    'cloudflared:frontend-network',
    'pwa:service-worker-api-exclusion',
    'api:rate-limiter',
  ]) {
    assert.equal(report.staticChecks.find((check) => check.name === name)?.status, 'PASS', name);
  }
});

test('origin and hostname mismatch is a config blocker without printing either value', async () => {
  const env = { ...validPublicEnv, PUBLIC_ORIGIN: 'https://different-owner.test' };
  const report = await runPreflight({ env, loadDotEnv: false });
  assert.equal(report.status, 'BLOCKED_CONFIG');
  assert.equal(report.environment.hostnameComparison.status, 'BLOCKED_CONFIG');
  assert.ok(report.environment.checks.some((check) => check.name === 'env:PUBLIC_ORIGIN_HOSTNAME_MATCH'));
  const output = formatReport(report, { json: true });
  assert.doesNotMatch(output, /different-owner\.test|farm-owner\.test/);
});

test('malformed public values are classified INVALID without value echoing', async () => {
  const report = await runPreflight({
    loadDotEnv: false,
    env: {
      PERSISTENCE_DRIVER: 'sqlite',
      APP_ENV: 'production-demo',
      PUBLIC_ORIGIN: 'http://localhost:8080',
      COOKIE_SECURE: 'maybe',
      SESSION_SECRET: 'too-short',
      POSTGRES_PASSWORD: 'short',
      CLOUDFLARE_TUNNEL_TOKEN: 'token with whitespace',
      CLOUDFLARE_HOSTNAME: 'bad hostname',
      DATABASE_URL: 'mysql://user:password@db/farm',
    },
  });
  const byName = statuses(report);
  for (const name of ['PERSISTENCE_DRIVER', 'APP_ENV', 'PUBLIC_ORIGIN', 'COOKIE_SECURE', 'SESSION_SECRET', 'POSTGRES_PASSWORD', 'CLOUDFLARE_TUNNEL_TOKEN', 'CLOUDFLARE_HOSTNAME', 'DATABASE_URL']) {
    assert.equal(byName[name], 'INVALID', name);
  }
  const output = formatReport(report, { json: true });
  assert.doesNotMatch(output, /token with whitespace|mysql:\/\//);
});
