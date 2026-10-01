import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const REQUIRED_ENV = Object.freeze([
  'PERSISTENCE_DRIVER',
  'APP_ENV',
  'PUBLIC_ORIGIN',
  'COOKIE_SECURE',
  'SESSION_SECRET',
  'POSTGRES_PASSWORD',
  'CLOUDFLARE_TUNNEL_TOKEN',
  'CLOUDFLARE_HOSTNAME',
]);

// DATABASE_URL is included in the public-runtime gate because a postgres
// driver without an explicit URL would otherwise silently use a bad default.
const SUPPORTING_ENV = Object.freeze(['DATABASE_URL']);
const DEFAULT_SESSION_SECRET = 'change_me_minimum_32_chars';
const DEFAULT_POSTGRES_PASSWORD = 'change_me';
const DEFAULT_HOSTNAME = 'farm.example.com';
const EXPECTED_TUNNEL_TARGET = 'http://nginx:80';
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
  const values = {};
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

function loadLocalEnv(root, processEnv) {
  const base = parseDotEnv(readText(root, '.env'));
  const selectedEnvironment = envValue(processEnv, 'APP_ENV') || base.APP_ENV || 'local';
  const selected = parseDotEnv(readText(root, `.env.${selectedEnvironment}`));
  // Explicit process variables always win over ignored dotenv files. The
  // files are read only to mirror Compose's local configuration resolution.
  return { ...base, ...selected, ...processEnv };
}

function isPlaceholder(value, defaults = []) {
  if (!value) return false;
  return defaults.includes(value) || PLACEHOLDER_RE.test(value) || value.includes('<inject-');
}

function hostnameValid(value) {
  if (!value || value.length > 253 || value.includes('..')) return false;
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(value)) return false;
  return value.split('.').every((label) => label.length > 0 && label.length <= 63 && !label.startsWith('-') && !label.endsWith('-'));
}

function parsePublicOrigin(value) {
  if (!value) return { valid: false };
  try {
    const origin = new URL(value);
    const valid = origin.protocol === 'https:'
      && !origin.username
      && !origin.password
      && !origin.port
      && origin.pathname === '/'
      && !origin.search
      && !origin.hash
      && hostnameValid(origin.hostname)
      && origin.hostname.toLowerCase() !== 'localhost';
    return { valid, hostname: origin.hostname.toLowerCase() };
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

function evaluateEnvironment(env = process.env, { root = ROOT, loadDotEnv = true } = {}) {
  const effectiveEnv = loadDotEnv ? loadLocalEnv(root, env) : env;
  const nginxPort = envValue(effectiveEnv, 'NGINX_PORT') || '8080';
  const defaults = {
    PERSISTENCE_DRIVER: 'file',
    APP_ENV: 'local',
    PUBLIC_ORIGIN: `http://localhost:${nginxPort}`,
    COOKIE_SECURE: 'false',
    SESSION_SECRET: DEFAULT_SESSION_SECRET,
    POSTGRES_PASSWORD: DEFAULT_POSTGRES_PASSWORD,
    CLOUDFLARE_TUNNEL_TOKEN: '',
    CLOUDFLARE_HOSTNAME: DEFAULT_HOSTNAME,
    DATABASE_URL: 'postgresql://mo_farm:change_me@db:5432/mo_farm',
  };
  const values = Object.fromEntries([...REQUIRED_ENV, ...SUPPORTING_ENV].map((name) => [name, envValue(effectiveEnv, name)]));
  const entries = [
    classify('PERSISTENCE_DRIVER', values.PERSISTENCE_DRIVER, { fallback: defaults.PERSISTENCE_DRIVER, valid: (value) => ['file', 'postgres'].includes(value.toLowerCase()) }),
    classify('APP_ENV', values.APP_ENV, { fallback: defaults.APP_ENV, valid: (value) => ['local', 'demo', 'production'].includes(value.toLowerCase()) }),
    classify('PUBLIC_ORIGIN', values.PUBLIC_ORIGIN, { fallback: defaults.PUBLIC_ORIGIN, valid: (value) => parsePublicOrigin(value).valid }),
    classify('COOKIE_SECURE', values.COOKIE_SECURE, { fallback: defaults.COOKIE_SECURE, valid: (value) => ['true', 'false'].includes(value.toLowerCase()) }),
    classify('SESSION_SECRET', values.SESSION_SECRET, { fallback: defaults.SESSION_SECRET, placeholderDefaults: [DEFAULT_SESSION_SECRET], valid: (value) => value.length >= 32 }),
    classify('POSTGRES_PASSWORD', values.POSTGRES_PASSWORD, { fallback: defaults.POSTGRES_PASSWORD, placeholderDefaults: [DEFAULT_POSTGRES_PASSWORD], valid: (value) => value.length >= 16 }),
    classify('CLOUDFLARE_TUNNEL_TOKEN', values.CLOUDFLARE_TUNNEL_TOKEN, { fallback: defaults.CLOUDFLARE_TUNNEL_TOKEN, valid: (value) => !/\s/.test(value) && value.length >= 16 }),
    classify('CLOUDFLARE_HOSTNAME', values.CLOUDFLARE_HOSTNAME, { fallback: defaults.CLOUDFLARE_HOSTNAME, placeholderDefaults: [DEFAULT_HOSTNAME], valid: hostnameValid }),
    classify('DATABASE_URL', values.DATABASE_URL, { fallback: defaults.DATABASE_URL, placeholderDefaults: [defaults.DATABASE_URL], valid: (value) => parseDatabaseUrl(value).valid && !parseDatabaseUrl(value).placeholderPassword }),
  ];
  const byName = Object.fromEntries(entries.map((entry) => [entry.name, entry]));
  const origin = parsePublicOrigin(values.PUBLIC_ORIGIN || defaults.PUBLIC_ORIGIN);
  const hostname = values.CLOUDFLARE_HOSTNAME || defaults.CLOUDFLARE_HOSTNAME;
  const comparison = {
    status: origin.valid && hostnameValid(hostname) && origin.hostname === hostname.toLowerCase() ? 'PASS' : 'BLOCKED_CONFIG',
    detail: 'PUBLIC_ORIGIN must be an HTTPS origin whose hostname exactly matches CLOUDFLARE_HOSTNAME.',
  };
  const requirements = [
    ['PERSISTENCE_DRIVER', (value) => value.toLowerCase() === 'postgres', 'PERSISTENCE_DRIVER must be postgres for public runtime.'],
    ['APP_ENV', (value) => value.toLowerCase() === 'demo', 'APP_ENV must be demo for public runtime.'],
    ['PUBLIC_ORIGIN', (value) => parsePublicOrigin(value).valid, 'PUBLIC_ORIGIN must be a fixed HTTPS origin.'],
    ['COOKIE_SECURE', (value) => value.toLowerCase() === 'true', 'COOKIE_SECURE must be true for public runtime.'],
    ['SESSION_SECRET', (value) => value.length >= 32 && !isPlaceholder(value, [DEFAULT_SESSION_SECRET]), 'SESSION_SECRET must be non-default and at least 32 characters.'],
    ['POSTGRES_PASSWORD', (value) => value.length >= 16 && !isPlaceholder(value, [DEFAULT_POSTGRES_PASSWORD]), 'POSTGRES_PASSWORD must be non-default and at least 16 characters.'],
    ['CLOUDFLARE_TUNNEL_TOKEN', (value) => value.length >= 16 && !/\s/.test(value) && !isPlaceholder(value), 'CLOUDFLARE_TUNNEL_TOKEN must be injected and non-empty.'],
    ['CLOUDFLARE_HOSTNAME', (value) => hostnameValid(value) && !isPlaceholder(value, [DEFAULT_HOSTNAME]), 'CLOUDFLARE_HOSTNAME must be a fixed non-example hostname.'],
    ['DATABASE_URL', (value) => parseDatabaseUrl(value).valid && !parseDatabaseUrl(value).placeholderPassword, 'DATABASE_URL must be a valid PostgreSQL URL with a non-default password.'],
  ];
  const failures = requirements.filter(([name, predicate]) => {
    const value = values[name] || defaults[name] || '';
    return !predicate(value);
  }).map(([name, , detail]) => ({ name: `env:${name}`, status: 'BLOCKED_CONFIG', detail }));
  if (comparison.status !== 'PASS') failures.push({ name: 'env:PUBLIC_ORIGIN_HOSTNAME_MATCH', ...comparison });
  return { entries: [...REQUIRED_ENV.map((name) => byName[name]), byName.DATABASE_URL], values, defaults, checks: failures, hostnameComparison: comparison };
}

function serviceBlock(compose, service) {
  if (!compose) return undefined;
  const escaped = service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const header = new RegExp(`^  ${escaped}:\\r?\\n`, 'm').exec(compose);
  if (!header) return undefined;
  const bodyStart = header.index + header[0].length;
  const nextService = /^  [A-Za-z0-9_-]+:/m.exec(compose.slice(bodyStart));
  const bodyEnd = nextService ? bodyStart + nextService.index : compose.length;
  return compose.slice(bodyStart, bodyEnd);
}

function checkPortExposure(compose) {
  const findings = [];
  for (const service of ['api', 'db', 'web', 'cloudflared']) {
    const block = serviceBlock(compose, service);
    if (!block) {
      findings.push({ name: `ports:${service}-service`, status: 'BLOCKED_SECURITY', detail: `Compose service ${service} is missing.` });
      continue;
    }
    if (/^[ \t]{4}ports:[ \t]*$/m.test(block)) findings.push({ name: `ports:${service}-public`, status: 'BLOCKED_SECURITY', detail: `${service} must not publish a host port.` });
    else findings.push({ name: `ports:${service}-public`, status: 'PASS', detail: `${service} has no host port mapping.` });
  }
  const nginx = serviceBlock(compose, 'nginx');
  // Use horizontal whitespace here; `\s` would also consume newlines and can
  // accidentally classify unrelated list entries as host port mappings.
  const portsBlock = nginx?.match(/^ {4}ports:\s*\r?\n((?:^ {6}-[^\r\n]*(?:\r?\n|$))+)/m)?.[1] ?? '';
  const nginxPorts = portsBlock.split(/\r?\n/).filter(Boolean);
  const nginxPublic = nginxPorts.filter((line) => !/(127\.0\.0\.1|::1|localhost)/i.test(line));
  findings.push({ name: 'ports:nginx-bind', status: nginx && nginxPublic.length === 0 ? 'PASS' : 'BLOCKED_SECURITY', detail: nginxPublic.length ? 'Nginx must bind only to loopback for this local preflight.' : 'Nginx host mapping is loopback-only.' });
  return findings;
}

function checkCloudflared(root, compose) {
  const block = serviceBlock(compose, 'cloudflared');
  const findings = [];
  if (!block) return [{ name: 'cloudflared:service', status: 'BLOCKED_SECURITY', detail: 'Compose public profile must define cloudflared.' }];
  const imagePinned = /image:\s*cloudflare\/cloudflared:\d+\.\d+\.\d+(?:[-.][A-Za-z0-9.-]+)?/i.test(block);
  findings.push({ name: 'cloudflared:image-pin', status: imagePinned ? 'PASS' : 'BLOCKED_SECURITY', detail: 'cloudflared image must use an explicit version.' });
  const command = block.match(/^\s{4}command:\s*(.+)$/m)?.[1] ?? '';
  const quickTunnel = /(?:--url|trycloudflare\.com|quick\s+tunnel)/i.test(command);
  findings.push({ name: 'cloudflared:quick-tunnel-disabled', status: quickTunnel ? 'BLOCKED_SECURITY' : 'PASS', detail: 'Quick Tunnel flags and trycloudflare.com endpoints are forbidden.' });
  const tokenInCommand = /CLOUDFLARE_TUNNEL_TOKEN|TUNNEL_TOKEN|--token/i.test(command);
  const tokenTransport = /\bTUNNEL_TOKEN:\s*\$\{CLOUDFLARE_TUNNEL_TOKEN:-\}/m.test(block);
  findings.push({ name: 'cloudflared:token-transport', status: !tokenInCommand && tokenTransport ? 'PASS' : 'BLOCKED_SECURITY', detail: 'The token must travel through cloudflared native TUNNEL_TOKEN environment, never command arguments.' });
  const dependency = /depends_on:\s*\r?\n\s+nginx:\s*\r?\n\s+condition:\s*service_healthy/m.test(block);
  findings.push({ name: 'cloudflared:nginx-dependency', status: dependency ? 'PASS' : 'BLOCKED_SECURITY', detail: 'cloudflared must wait for a healthy Nginx service.' });
  const frontendNetwork = /networks:\s*\[frontend\]/.test(block);
  findings.push({ name: 'cloudflared:frontend-network', status: frontendNetwork ? 'PASS' : 'BLOCKED_SECURITY', detail: 'cloudflared must use the frontend network.' });
  const targetConfigCandidates = ['infra/cloudflared/config.yml', 'infra/cloudflared/config.yaml', '.cloudflared/config.yml', '.cloudflared/config.yaml', 'infra/cloudflared/named-tunnel-contract.json'];
  const targetConfig = targetConfigCandidates.map((candidate) => ({ candidate, text: readText(root, candidate) })).find(({ candidate, text }) => {
    if (!text) return false;
    if (candidate.endsWith('.json')) {
      try { return JSON.parse(text).expectedOriginService === EXPECTED_TUNNEL_TARGET; } catch { return false; }
    }
    return /service:\s*['"]?http:\/\/nginx:80['"]?/i.test(text);
  });
  const composeTarget = /(?:TUNNEL_ORIGIN|TUNNEL_TARGET|CLOUDFLARE_ORIGIN):\s*['"]?http:\/\/nginx:80['"]?/i.test(block);
  findings.push({ name: 'cloudflared:target-contract', status: targetConfig || composeTarget ? 'PASS' : 'BLOCKED_SECURITY', detail: `Named Tunnel ingress must declare the fixed target ${EXPECTED_TUNNEL_TARGET} in machine-readable configuration.` });
  const contractText = readText(root, 'infra/cloudflared/named-tunnel-contract.json');
  let contract;
  try { contract = contractText ? JSON.parse(contractText) : undefined; } catch { contract = undefined; }
  const contractValid = contract?.schemaVersion === 1
    && contract?.tunnelType === 'named'
    && contract.expectedOriginService === EXPECTED_TUNNEL_TARGET
    && contract.hostnameSource === 'CLOUDFLARE_HOSTNAME'
    && contract.publicOriginSource === 'PUBLIC_ORIGIN'
    && contract.cloudflaredTokenEnv === 'TUNNEL_TOKEN'
    && contract.quickTunnelAllowed === false
    && Array.isArray(contract.requiredCommand)
    && contract.requiredCommand.join(' ') === 'tunnel --no-autoupdate run';
  findings.push({ name: 'cloudflared:contract-document', status: contractValid ? 'PASS' : 'BLOCKED_SECURITY', detail: 'Named Tunnel target, hostname, token transport and no-Quick-Tunnel policy must be declared in the local contract.' });
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

export async function runPreflight({ root = ROOT, env = process.env, loadDotEnv = true } = {}) {
  const evaluatedEnvironment = evaluateEnvironment(env, { root, loadDotEnv });
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
