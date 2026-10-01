const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const QUICK_ORIGIN = new RegExp(`^https://${LABEL}\\.trycloudflare\\.com$`);

export function validateQuickTunnelUrl(value) {
  if (typeof value !== 'string' || !QUICK_ORIGIN.test(value)) throw new Error('INVALID_QUICK_TUNNEL_URL');
  const url = new URL(value);
  if (url.origin !== value || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('INVALID_QUICK_TUNNEL_URL');
  }
  return url.origin;
}

export function discoverQuickTunnelUrl(logs) {
  const urls = new Set();
  // Match whole log tokens, then parse and validate; never accept a domain substring.
  for (const token of String(logs).split(/\s+/)) {
    if (!token.startsWith('https://')) continue;
    try { urls.add(validateQuickTunnelUrl(token)); } catch { /* Ignore unrelated or malformed log URLs. */ }
  }
  if (urls.size > 1) throw new Error('AMBIGUOUS_QUICK_TUNNEL_URL');
  return urls.values().next().value;
}

export function sameTunnelLifetime(before, after) {
  return Boolean(before?.running && after?.running && typeof before.containerId === 'string' && before.containerId
    && typeof before.startedAt === 'string' && before.startedAt && typeof before.publicUrl === 'string'
    && Number.isSafeInteger(before.restartCount) && before.restartCount >= 0 && before.containerId === after.containerId
    && before.startedAt === after.startedAt && before.restartCount === after.restartCount
    && before.publicUrl === after.publicUrl);
}
