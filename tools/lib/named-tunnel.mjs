import { isIP } from 'node:net';

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

// Example-only domains are syntactically valid DNS names but cannot be owner
// configuration for a deployed Named Tunnel.
export function isNamedTunnelPlaceholder(value) {
  return typeof value === 'string' && /(?:^|\.)example\.com$/i.test(value);
}

export function validateNamedTunnelHostname(value) {
  if (typeof value !== 'string' || value.length > 253 || isIP(value)
    || value !== value.toLowerCase() || value.split('.').length < 2
    || !value.split('.').every((label) => LABEL.test(label))
    || !/[a-z]/.test(value.split('.').at(-1))
    || /(?:^|\.)(?:localhost|local|internal|trycloudflare\.com)$/.test(value)) {
    throw new Error('INVALID_NAMED_TUNNEL_HOSTNAME');
  }
  return value;
}

export function validateNamedTunnelOrigin(value, hostname) {
  validateNamedTunnelHostname(hostname);
  if (typeof value !== 'string' || value !== `https://${hostname}`) throw new Error('INVALID_NAMED_TUNNEL_ORIGIN');
  const url = new URL(value);
  if (url.origin !== value || url.hostname !== hostname) throw new Error('INVALID_NAMED_TUNNEL_ORIGIN');
  return url.origin;
}

export function sameTunnelLifetime(before, after) {
  return Boolean(before && after && after.running && before.containerId === after.containerId
    && before.startedAt === after.startedAt && before.restartCount === after.restartCount
    && before.publicOrigin === after.publicOrigin);
}
