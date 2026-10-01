import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateQuickTunnelUrl } from './lib/quick-tunnel.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const REQUIRED_ENV = Object.freeze([
  'PERSISTENCE_DRIVER',
  'APP_ENV',
  'COOKIE_SECURE',
  'SESSION_SECRET',
  'POSTGRES_PASSWORD',
]);

// DATABASE_URL is included in the public-runtime gate because a postgres
// driver without an explicit URL would otherwise silently use a bad default.
const SUPPORTING_ENV = Object.freeze(['DATABASE_URL']);
const DEFAULT_SESSION_SECRET = 'change_me_minimum_32_chars';
const DEFAULT_POSTGRES_PASSWORD = 'change_me';
const EXPECTED_TUNNEL_TARGET = 'http://nginx:80';
const SHARED_NETWORK = 'mo-farm-frontend';
const TUNNEL_COMMAND = ['tunnel', '--no-autoupdate', '--url', EXPECTED_TUNNEL_TARGET];
const PLACEHOLDER_RE = /^(?:<[^>]+>|change(?:[_-]?)me(?:[^ ]*)?|example(?:\.com)?|placeholder)$/i;
const ENV_STATUS = Object.freeze({ SET: 'SET', MISSING: 'MISSING', INVALID: 'INVALID', DEFAULT: 'DEFAULT', PLACEHOLDER: 'PLACEHOLDER' });

function readText(root, relativePath) {
  try {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
  } catch {
    return undefined;
  }
}

function hasText(text, pattern) {
  return typeof text === 'string' && pattern.test(text);
}

function envValue(env, name) {
  const value = env?.[name];
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function parseDotEnv(text) {
  const values = Object.create(null);
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

export function loadLocalEnv(root = ROOT, processEnv = process.env) {
  const base = parseDotEnv(readText(root, '.env'));
  const selectedEnvironment = envValue(processEnv, 'APP_ENV') || base.APP_ENV || 'local';
  // Never turn an untrusted APP_ENV into a path outside the root directory.
  const selected = /^[a-z][a-z0-9_-]*$/i.test(selectedEnvironment)
    ? parseDotEnv(readText(root, `.env.${selectedEnvironment}`))
    : {};
  // Explicit process variables always win over ignored dotenv files. The
  // files are read only to mirror Compose's local configuration resolution.
  return { ...base, ...selected, ...processEnv };
}

function isPlaceholder(value, defaults = []) {
  if (!value) return false;
  return defaults.includes(value) || PLACEHOLDER_RE.test(value) || value.includes('<inject-');
}

function parsePublicOrigin(value) {
  try {
    return { valid: true, origin: validateQuickTunnelUrl(value) };
  } catch {
    return { valid: false };
  }
}

function parseDatabaseUrl(value) {
  if (!value) return { valid: false };
  try {
    const url = new URL(value);
    const protocolValid = url.protocol === 'postgres:' || url.protocol === 'postgresql:';
    return {
      valid: protocolValid && Boolean(url.hostname) && Boolean(url.username) && Boolean(url.password) && Boolean(url.pathname.slice(1)),
      placeholderPassword: isPlaceholder(decodeURIComponent(url.password ?? ''), [DEFAULT_POSTGRES_PASSWORD]),
    };
  } catch {
    return { valid: false, placeholderPassword: false };
  }
}

function classify(name, raw, { fallback, placeholderDefaults = [], valid } = {}) {
  const explicit = raw !== '';
  if (!explicit) {
    if (fallback === undefined || fallback === '') return { name, status: ENV_STATUS.MISSING, source: 'environment' };
    if (isPlaceholder(fallback, placeholderDefaults)) return { name, status: ENV_STATUS.PLACEHOLDER, source: 'repository-default' };
    return { name, status: ENV_STATUS.DEFAULT, source: 'repository-default' };
  }
  if (isPlaceholder(raw, placeholderDefaults)) return { name, status: ENV_STATUS.PLACEHOLDER, source: 'environment' };
  if (typeof valid === 'function' && !valid(raw)) return { name, status: ENV_STATUS.INVALID, source: 'environment' };
  return { name, status: ENV_STATUS.SET, source: 'environment' };
}

function evaluateEnvironment(env = process.env, { root = ROOT, loadDotEnv = true, runtime = false, publicUrl } = {}) {
  const effectiveEnv = loadDotEnv ? loadLocalEnv(root, env) : env;
  const defaults = {
    PERSISTENCE_DRIVER: 'file',
    APP_ENV: 'local',
    PUBLIC_ORIGIN: '',
    COOKIE_SECURE: 'false',
    SESSION_SECRET: DEFAULT_SESSION_SECRET,
    POSTGRES_PASSWORD: DEFAULT_POSTGRES_PASSWORD,
    DATABASE_URL: 'postgresql://mo_farm:change_me@db:5432/mo_farm',
  };
  const values = Object.fromEntries([...REQUIRED_ENV, 'PUBLIC_ORIGIN', ...SUPPORTING_ENV].map((name) => [name, envValue(effectiveEnv, name)]));
  // Origin equality uses the supplied bytes, including forbidden whitespace.
  if (typeof effectiveEnv.PUBLIC_ORIGIN === 'string') values.PUBLIC_ORIGIN = effectiveEnv.PUBLIC_ORIGIN;
  const entries = [
    classify('PERSISTENCE_DRIVER', values.PERSISTENCE_DRIVER, { fallback: defaults.PERSISTENCE_DRIVER, valid: (value) => ['file', 'postgres'].includes(value) }),
    classify('APP_ENV', values.APP_ENV, { fallback: defaults.APP_ENV, valid: (value) => ['local', 'demo', 'production'].includes(value) }),
    classify('PUBLIC_ORIGIN', values.PUBLIC_ORIGIN, { fallback: defaults.PUBLIC_ORIGIN, valid: (value) => parsePublicOrigin(value).valid }),
    classify('COOKIE_SECURE', values.COOKIE_SECURE, { fallback: defaults.COOKIE_SECURE, valid: (value) => ['true', 'false'].includes(value) }),
    classify('SESSION_SECRET', values.SESSION_SECRET, { fallback: defaults.SESSION_SECRET, placeholderDefaults: [DEFAULT_SESSION_SECRET], valid: (value) => value.length >= 32 }),
    classify('POSTGRES_PASSWORD', values.POSTGRES_PASSWORD, { fallback: defaults.POSTGRES_PASSWORD, placeholderDefaults: [DEFAULT_POSTGRES_PASSWORD], valid: (value) => value.length >= 16 }),
    classify('DATABASE_URL', values.DATABASE_URL, { fallback: defaults.DATABASE_URL, placeholderDefaults: [defaults.DATABASE_URL], valid: (value) => parseDatabaseUrl(value).valid && !parseDatabaseUrl(value).placeholderPassword }),
  ];
  const origin = parsePublicOrigin(values.PUBLIC_ORIGIN);
  const generated = parsePublicOrigin(publicUrl);
  const comparison = {
    status: runtime
      ? origin.valid && generated.valid && values.PUBLIC_ORIGIN === publicUrl ? 'PASS' : 'BLOCKED_CONFIG'
      : !values.PUBLIC_ORIGIN || origin.valid ? 'PASS' : 'BLOCKED_CONFIG',
    detail: runtime
      ? 'PUBLIC_ORIGIN must exactly equal the validated generated Quick Tunnel URL.'
      : 'PUBLIC_ORIGIN may be absent before start; an explicit value must be a strict HTTPS Quick Tunnel origin.',
  };
  const requirements = [
    ['PERSISTENCE_DRIVER', (value) => value === 'postgres', 'PERSISTENCE_DRIVER must be postgres for public runtime.'],
    ['APP_ENV', (value) => value === 'demo', 'APP_ENV must be demo for public runtime.'],
    ['PUBLIC_ORIGIN', (value) => (!runtime && !value) || parsePublicOrigin(value).valid, 'An explicit PUBLIC_ORIGIN must be a strict HTTPS Quick Tunnel origin.'],
    ['COOKIE_SECURE', (value) => value === 'true', 'COOKIE_SECURE must be true for public runtime.'],
    ['SESSION_SECRET', (value) => value.length >= 32 && !isPlaceholder(value, [DEFAULT_SESSION_SECRET]), 'SESSION_SECRET must be non-default and at least 32 characters.'],
    ['POSTGRES_PASSWORD', (value) => value.length >= 16 && !isPlaceholder(value, [DEFAULT_POSTGRES_PASSWORD]), 'POSTGRES_PASSWORD must be non-default and at least 16 characters.'],
    ['DATABASE_URL', (value) => parseDatabaseUrl(value).valid && !parseDatabaseUrl(value).placeholderPassword, 'DATABASE_URL must be a valid PostgreSQL URL with a non-default password.'],
  ];
  const failures = requirements.filter(([name, predicate]) => {
    const value = values[name] || defaults[name] || '';
    return !predicate(value);
  }).map(([name, , detail]) => ({ name: `env:${name}`, status: 'BLOCKED_CONFIG', detail }));
  if (comparison.status !== 'PASS') failures.push({ name: 'env:PUBLIC_ORIGIN_GENERATED_MATCH', ...comparison });
  return { entries, checks: failures, hostnameComparison: comparison };
}

function sectionBlock(compose, section) {
  const header = new RegExp(`^${section}:\\r?\\n`, 'm').exec(compose ?? '');
  if (!header) return undefined;
  const start = header.index + header[0].length;
  const next = /^[A-Za-z0-9_-]+:/m.exec(compose.slice(start));
  return compose.slice(start, next ? start + next.index : compose.length);
}

function serviceBlock(compose, service, section = 'services') {
  const services = sectionBlock(compose, section);
  if (!services) return undefined;
  const escaped = service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const header = new RegExp(`^  ${escaped}:\\r?\\n`, 'm').exec(services);
  if (!header) return undefined;
  const bodyStart = header.index + header[0].length;
  const nextService = /^  [A-Za-z0-9_-]+:/m.exec(services.slice(bodyStart));
  const bodyEnd = nextService ? bodyStart + nextService.index : services.length;
  return services.slice(bodyStart, bodyEnd);
}

function composeStructureSupported(compose) {
  if (typeof compose !== 'string') return false;
  const seen = new Map();
  let section = '';
  let service = '';
  let nestedAllowed = false;
  for (const line of compose.split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    // Canonical boundary checks inspect plain, explicit mappings. Reject YAML
    // imports, aliases and overrides that could change the effective model.
    if (/^\s*<<\s*:|^\s*[^:#]+:[ \t]*[&*!]|^\s*-[ \t]+[&*!]/.test(line)) return false;
    const indent = line.search(/\S/);
    if (indent > 4) {
      if (!nestedAllowed) return false;
      continue;
    }
    nestedAllowed = false;
    const field = /^( *)([A-Za-z0-9_-]+):(?:[ \t]*(.*))?$/.exec(line);
    if (!field || ![0, 2, 4].includes(indent)) return false;
    const [, , key, value = ''] = field;
    const parent = indent === 0 ? '' : indent === 2 ? section : `${section}/${service}`;
    if (!seen.has(parent)) seen.set(parent, new Set());
    if (seen.get(parent).has(key)) return false;
    seen.get(parent).add(key);
    if (indent === 0) {
      if (!['name', 'services', 'volumes', 'networks'].includes(key)) return false;
      if (key !== 'name' && value.trim()) return false;
      section = key;
    } else if (indent === 2) {
      if (value.trim()) return false;
      service = key;
    } else {
      nestedAllowed = !value.trim() || /^[|>][+-]?$/.test(value.trim());
    }
  }
  return seen.get('')?.has('services') ?? false;
}

function propertyLines(block, property) {
  const lines = String(block ?? '').split(/\r?\n/);
  const headers = lines.flatMap((line, index) => new RegExp(`^ {4}${property}:`).test(line) ? [index] : []);
  if (headers.length !== 1) return undefined;
  const start = headers[0];
  if (!new RegExp(`^ {4}${property}:[ \\t]*$`).test(lines[start])) return undefined;
  const values = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    if (line.search(/\S/) <= 4) break;
    values.push(line);
  }
  return values;
}

function checkPortExposure(compose) {
  const findings = [];
  findings.push({ name: 'compose:app-explicit-model', status: composeStructureSupported(compose) ? 'PASS' : 'BLOCKED_SECURITY', detail: 'Application Compose must use explicit mappings without imports, aliases, duplicate fields or hidden overrides.' });
  const services = [...(sectionBlock(compose, 'services') ?? '').matchAll(/^  ([A-Za-z0-9_-]+):/gm)].map((match) => match[1]);
  const expectedServices = new Set(['db', 'api', 'web', 'nginx', 'migrate', 'seed']);
  findings.push({ name: 'compose:app-services', status: services.every((service) => expectedServices.has(service)) ? 'PASS' : 'BLOCKED_SECURITY', detail: 'Application Compose must contain only the application stack and its migration or seed jobs.' });
  for (const service of services) {
    const isolated = !/^ {4}(?:network_mode|extends|links|volumes_from):/m.test(serviceBlock(compose, service));
    findings.push({ name: `ports:${service}-network-isolation`, status: isolated ? 'PASS' : 'BLOCKED_SECURITY', detail: `${service} must use explicit Compose networks without inherited or host network access.` });
  }
  for (const service of ['api', 'db', 'web']) {
    const block = serviceBlock(compose, service);
    if (!block) {
      findings.push({ name: `ports:${service}-service`, status: 'BLOCKED_SECURITY', detail: `Compose service ${service} is missing.` });
      continue;
    }
    if (/^[ \t]{4}ports:/m.test(block)) findings.push({ name: `ports:${service}-public`, status: 'BLOCKED_SECURITY', detail: `${service} must not publish a host port.` });
    else findings.push({ name: `ports:${service}-public`, status: 'PASS', detail: `${service} has no host port mapping.` });
  }
  const nginx = serviceBlock(compose, 'nginx');
  const nginxPorts = propertyLines(nginx, 'ports');
  const hasPorts = /^ {4}ports:/m.test(nginx ?? '');
  const safeBind = Boolean(nginx) && (!hasPorts || Boolean(nginxPorts?.length)
    && nginxPorts.every((line) => /^ {6}-[ \t]+['"]?(?:127\.0\.0\.1|\[::1\]):/.test(line)));
  findings.push({ name: 'ports:nginx-bind', status: safeBind ? 'PASS' : 'BLOCKED_SECURITY', detail: safeBind ? 'Nginx host mapping is loopback-only.' : 'Nginx must use an explicit loopback-only host port mapping.' });
  return findings;
}

function checkCloudflared(root, compose) {
  const tunnelCompose = readText(root, 'compose.tunnel.yaml');
  const block = serviceBlock(tunnelCompose, 'cloudflared');
  const findings = [];
  const check = (name, passed, detail) => findings.push({ name: 'cloudflared:' + name, status: passed ? 'PASS' : 'BLOCKED_SECURITY', detail });
  check('explicit-model', composeStructureSupported(tunnelCompose), 'Tunnel Compose must use explicit mappings without imports, aliases, duplicate fields or hidden overrides.');
  check('app-lifecycle-isolation', !serviceBlock(compose, 'cloudflared') && !/cloudflared|compose\.tunnel/i.test(compose ?? ''), 'Application Compose must not include or manage cloudflared.');
  check('tunnel-project', /^name:\s*mo-farm-tunnel\s*$/m.test(tunnelCompose ?? ''), 'Tunnel Compose must use the independent mo-farm-tunnel project.');
  const serviceNames = [...(sectionBlock(tunnelCompose, 'services') ?? '').matchAll(/^  ([A-Za-z0-9_-]+):/gm)].map((match) => match[1]);
  check('tunnel-only-service', serviceNames.length === 1 && serviceNames[0] === 'cloudflared', 'Tunnel Compose must contain only cloudflared.');
  if (!block) {
    check('service', false, 'The independent tunnel Compose must define cloudflared.');
    return findings;
  }
  check('image-pin', /^ {4}image:\s*cloudflare\/cloudflared:2025\.9\.1\s*$/m.test(block), 'cloudflared image must be pinned to repository version 2025.9.1.');
  let command;
  try { command = JSON.parse(block.match(/^ {4}command:\s*(.+)$/m)?.[1] ?? ''); } catch { command = undefined; }
  check('quick-command', Array.isArray(command) && JSON.stringify(command) === JSON.stringify(TUNNEL_COMMAND), 'Quick Tunnel command must exactly target http://nginx:80 without extra arguments.');
  check('no-named-credentials', !/TUNNEL_TOKEN|CLOUDFLARE_HOSTNAME|--token|credentials|(?:^|[\s/])config\.ya?ml|^ {4}(?:environment|env_file|volumes|configs|secrets):/im.test(block), 'Quick Tunnel must not mount configuration or carry Named Tunnel credentials.');
  check('no-app-dependencies', !/^ {4}(?:build|depends_on|links|extends|network_mode|volumes_from):/m.test(block), 'cloudflared must have no application build or lifecycle dependencies.');
  check('no-command-overrides', !/^ {4}(?:entrypoint|post_start|pre_stop|develop):/m.test(block), 'cloudflared must use the pinned image entrypoint without lifecycle hooks or development overrides.');
  check('no-host-ports', !/^ {4}ports:/m.test(block), 'cloudflared must not publish host ports.');
  check('restart-policy', /^ {4}restart:\s*unless-stopped\s*$/m.test(block), 'cloudflared must persist with restart unless-stopped.');
  const logging = block.match(/^ {4}logging:\s*\r?\n((?:^ {6,}[^\r\n]*(?:\r?\n|$))+)/m)?.[1] ?? '';
  const boundedLogs = /^ {6}driver:\s*json-file\s*$/m.test(logging)
    && /^ {8}max-size:\s*['"]?[1-9]\d*[kmg]['"]?\s*$/im.test(logging)
    && /^ {8}max-file:\s*['"]?[1-9]\d*['"]?\s*$/m.test(logging);
  check('bounded-logs', boundedLogs, 'Tunnel logging must use json-file with bounded max-size and max-file.');
  const appNetwork = serviceBlock(compose, 'frontend', 'networks');
  const tunnelNetwork = serviceBlock(tunnelCompose, 'frontend', 'networks');
  const shared = /^ {4}networks:\s*\[frontend\]\s*$/m.test(block)
    && /^ {4}name:\s*mo-farm-frontend\s*$/m.test(appNetwork ?? '')
    && /^ {4}name:\s*mo-farm-frontend\s*$/m.test(tunnelNetwork ?? '')
    && /^ {4}external:\s*true\s*$/m.test(tunnelNetwork ?? '')
    && /^ {4}networks:\s*\[[^\]\r\n]*\bfrontend\b[^\]\r\n]*\]\s*$/m.test(serviceBlock(compose, 'nginx') ?? '');
  check('frontend-network', shared, 'Application Nginx and independent tunnel must share the explicitly named mo-farm-frontend network.');
  let contract;
  try { contract = JSON.parse(readText(root, 'infra/cloudflared/quick-tunnel-contract.json')); } catch { contract = undefined; }
  const expectedContract = {
    schemaVersion: 1,
    canonical: true,
    e01ReleasePath: true,
    tunnelType: 'quick',
    originService: EXPECTED_TUNNEL_TARGET,
    publicHostnameType: 'ephemeral-trycloudflare',
    hostnameSuffix: '.trycloudflare.com',
    tokenRequired: false,
    fixedHostnameRequired: false,
    publicOriginMode: 'runtime-generated-exact',
    persistentContainerLifecycle: true,
    appRedeployMustPreserveTunnel: true,
    quickTunnelAllowed: true,
    requiredCommand: TUNNEL_COMMAND,
    sharedNetwork: SHARED_NETWORK,
  };
  check('contract-document', Object.entries(expectedContract).every(([key, value]) => JSON.stringify(contract?.[key]) === JSON.stringify(value))
    && contract?.status !== 'SUPERSEDED',
  'Quick Tunnel deployment, exact origin and independent container lifecycle must match the canonical contract.');
  return findings;
}

function checkStaticWebExposure(root) {
  const server = readText(root, 'apps/web/server.mjs');
  const dockerfile = readText(root, 'apps/web/Dockerfile');
  const findings = [];
  const broadRoot = hasText(server, /const\s+(?:defaultRoot|root)\s*=\s*path\.resolve\(path\.dirname\(fileURLToPath\(import\.meta\.url\)\)\)/);
  const scopedArtifactRouting = hasText(server, /function\s+artifactConfig|function\s+safePath/) && hasText(server, /publicRoot|runtimeRoot/) && hasText(server, /runtimePrefix/);
  findings.push({ name: 'web:static-root', status: broadRoot && !scopedArtifactRouting ? 'BLOCKED_SECURITY' : 'PASS', detail: broadRoot && !scopedArtifactRouting ? 'The web server root resolves to the application source tree without a scoped artifact router.' : 'The web server exposes only a scoped public artifact router.' });
  const sourceCopy = hasText(dockerfile, /COPY\s+apps\/web\s+\.\/apps\/web/);
  findings.push({ name: 'web:image-source-copy', status: sourceCopy && !scopedArtifactRouting ? 'BLOCKED_SECURITY' : 'PASS', detail: sourceCopy && !scopedArtifactRouting ? 'The web image copies the complete source tree without a scoped public router.' : 'The web image is paired with a scoped public router.' });
  const forbiddenGuard = scopedArtifactRouting && hasText(server, /notFound|isWithin|SHELL_FILES|RUNTIME_EXTENSIONS/);
  findings.push({ name: 'web:internal-path-guard', status: forbiddenGuard ? 'PASS' : 'BLOCKED_SECURITY', detail: forbiddenGuard ? 'Internal web paths have a deny guard.' : 'No machine-readable deny guard exists for server/source/config paths.' });
  return findings;
}

function checkServiceWorker(root) {
  const sw = readText(root, 'apps/web/sw.js');
  const excludesApi = hasText(sw, /pathname\.startsWith\(['"]\/api\//);
  const guardBeforeRespond = excludesApi && sw.indexOf('pathname.startsWith') < sw.indexOf('event.respondWith');
  const cachedApi = /(?:STATIC_URLS|cache\.add|cache\.put)[\s\S]{0,300}\/api\//.test(sw ?? '');
  return [{ name: 'pwa:service-worker-api-exclusion', status: excludesApi && guardBeforeRespond && !cachedApi ? 'PASS' : 'BLOCKED_SECURITY', detail: 'Service worker must bypass and never cache /api/** requests.' }];
}

function checkRateLimiter(root) {
  const server = readText(root, 'apps/api/src/server.mjs');
  const limiter = readText(root, 'apps/api/src/security/rateLimiter.mjs');
  const implemented = hasText(limiter, /class\s+ApiRateLimiter/) && hasText(limiter, /consume\s*\(/) && hasText(limiter, /maxClients/) && hasText(limiter, /windowMs/);
  const wired = hasText(server, /ApiRateLimiter/) && hasText(server, /rateLimiter\?\.consume/) && hasText(server, /RATE_LIMITED/) && hasText(server, /429/);
  return [{ name: 'api:rate-limiter', status: implemented && wired ? 'PASS' : 'BLOCKED_SECURITY', detail: 'API must use a bounded rate limiter and return a stable 429 response.' }];
}

function checkSecurityHeaders(root) {
  const config = readText(root, 'infra/nginx/conf.d/default.conf');
  const mainConfig = readText(root, 'infra/nginx/nginx.conf') ?? '';
  const headerConfig = `${config ?? ''}\n${mainConfig}`;
  const required = [
    ['x-content-type-options', /add_header\s+X-Content-Type-Options\s+nosniff/i, 'X-Content-Type-Options nosniff'],
    ['referrer-policy', /add_header\s+Referrer-Policy\s+\S+/i, 'Referrer-Policy'],
    ['x-frame-options', /add_header\s+X-Frame-Options\s+\S+/i, 'X-Frame-Options'],
    ['content-security-policy', /add_header\s+Content-Security-Policy\s+"?[^\r\n]*default-src/i, 'Content-Security-Policy'],
    ['strict-transport-security', /add_header\s+Strict-Transport-Security\s+"?max-age=\d+|map\s+\$http_x_forwarded_proto\s+\$strict_transport_security[\s\S]*https\s+"?max-age=\d+/i, 'Strict-Transport-Security'],
    ['permissions-policy', /add_header\s+Permissions-Policy\s+/i, 'Permissions-Policy'],
  ];
  const findings = required.map(([name, pattern, label]) => ({ name: `headers:${name}`, status: hasText(headerConfig, pattern) ? 'PASS' : 'BLOCKED_SECURITY', detail: `${label} must be set by the public edge configuration.` }));
  findings.push({ name: 'headers:server-tokens', status: hasText(mainConfig, /server_tokens\s+off/i) ? 'PASS' : 'BLOCKED_SECURITY', detail: 'Nginx server version tokens must be disabled.' });
  const forwardedHeadersSafe = hasText(config, /proxy_set_header\s+X-Forwarded-For\s+\$remote_addr;/i)
    && hasText(config, /proxy_set_header\s+X-Forwarded-Proto\s+\$scheme;/i)
    && !hasText(config, /\$proxy_add_x_forwarded_for/i);
  findings.push({ name: 'headers:trusted-forwarded', status: forwardedHeadersSafe ? 'PASS' : 'BLOCKED_SECURITY', detail: 'Nginx must overwrite forwarded client identity headers at the trusted boundary.' });
  findings.push({ name: 'headers:autoindex', status: hasText(headerConfig, /autoindex\s+on/i) ? 'BLOCKED_SECURITY' : 'PASS', detail: 'Directory listing must remain disabled.' });
  return findings;
}

export async function runPreflight({ root = ROOT, env = process.env, loadDotEnv = true, runtime = false, publicUrl } = {}) {
  const evaluatedEnvironment = evaluateEnvironment(env, { root, loadDotEnv, runtime, publicUrl });
  // Keep raw values private to this module. Even programmatic consumers get
  // status-only environment data, so accidental logging cannot leak secrets.
  const environment = {
    entries: evaluatedEnvironment.entries,
    checks: evaluatedEnvironment.checks,
    hostnameComparison: evaluatedEnvironment.hostnameComparison,
  };
  const compose = readText(root, 'compose.yaml');
  const staticChecks = [
    ...checkPortExposure(compose),
    ...checkCloudflared(root, compose),
    ...checkStaticWebExposure(root),
    ...checkServiceWorker(root),
    ...checkRateLimiter(root),
    ...checkSecurityHeaders(root),
  ];
  const hasConfigBlock = environment.checks.length > 0;
  const hasSecurityBlock = staticChecks.some((check) => check.status !== 'PASS');
  const status = hasConfigBlock ? 'BLOCKED_CONFIG' : hasSecurityBlock ? 'BLOCKED_SECURITY' : 'PASS';
  return { status, environment, staticChecks, generatedBy: 'tools/e01-preflight.mjs' };
}

export function formatReport(report, { json = false } = {}) {
  if (json) {
    return `${JSON.stringify({ status: report.status, environment: report.environment.entries, hostnameComparison: report.environment.hostnameComparison, checks: [...report.environment.checks, ...report.staticChecks] }, null, 2)}\n`;
  }
  const lines = [`E01 preflight: ${report.status}`, '', 'Environment (values are never printed):'];
  for (const entry of report.environment.entries) lines.push(`- ${entry.name}=${entry.status}`);
  lines.push('', 'Checks:');
  for (const check of [...report.environment.checks, ...report.staticChecks]) lines.push(`- ${check.name}: ${check.status} — ${check.detail}`);
  lines.push('', 'Static checks are evaluated independently of missing or placeholder secrets.');
  return `${lines.join('\n')}\n`;
}

function exitCode(status) {
  if (status === 'PASS') return 0;
  if (status === 'BLOCKED_CONFIG') return 2;
  if (status === 'BLOCKED_SECURITY') return 3;
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await runPreflight();
  process.stdout.write(formatReport(report, { json: process.argv.includes('--json') }));
  process.exitCode = exitCode(report.status);
}
