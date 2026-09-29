import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';
import { createApiServer } from '../../apps/api/src/server.mjs';
import { FarmStore } from '../../apps/api/src/store.mjs';

// The E2E harness keeps browser requests same-origin while running the API
// with a controllable clock. This avoids relying on Docker or waiting for the
// canonical 120/600 second gameplay timers in local Playwright runs.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const webRoot = path.join(repoRoot, 'apps', 'web');
const webPort = Number(process.env.PW_PORT || 4173);
const apiPort = Number(process.env.PW_API_PORT || 3101);
let fakeNow = Date.now();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    ...headers,
  });
  response.end(body);
}

function sendJson(response, status, body) {
  send(response, status, JSON.stringify(body), {
    'content-type': 'application/json; charset=utf-8',
  });
}

function safeWebPath(requestPath) {
  try {
    const decoded = decodeURIComponent(requestPath.split('?')[0]);
    const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const absolute = path.resolve(webRoot, relative);
    if (absolute !== webRoot && !absolute.startsWith(`${webRoot}${path.sep}`)) return null;
    return absolute;
  } catch {
    return null;
  }
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function proxyApi(request, response) {
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await readBody(request);
  const headers = {};
  for (const name of ['accept', 'content-type', 'cookie', 'idempotency-key', 'origin']) {
    const value = request.headers[name];
    if (value) headers[name] = value;
  }

  const upstream = await fetch(`http://127.0.0.1:${apiPort}${request.url}`, {
    method: request.method,
    headers,
    body,
  });
  const responseHeaders = {};
  for (const name of ['content-type', 'cache-control', 'x-request-id', 'access-control-allow-origin', 'access-control-allow-credentials', 'vary']) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders[name] = value;
  }
  // Node 22 exposes getSetCookie(); the fallback keeps this compatible with
  // older Node versions used by local contributors.
  const cookies = upstream.headers.getSetCookie?.() ?? [];
  if (cookies.length) responseHeaders['set-cookie'] = cookies;
  else if (upstream.headers.get('set-cookie')) responseHeaders['set-cookie'] = upstream.headers.get('set-cookie');
  send(response, upstream.status, Buffer.from(await upstream.arrayBuffer()), responseHeaders);
}

async function serveStatic(request, response) {
  const target = safeWebPath(request.url || '/');
  if (!target) {
    send(response, 400, 'Yêu cầu không hợp lệ', { 'content-type': 'text/plain; charset=utf-8' });
    return;
  }
  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) throw new Error('not-file');
    const extension = path.extname(target).toLowerCase();
    response.writeHead(200, {
      'content-type': mime[extension] ?? 'application/octet-stream',
      'cache-control': extension === '.html' ? 'no-cache' : 'public, max-age=60',
      'x-content-type-options': 'nosniff',
    });
    createReadStream(target).on('error', () => response.end()).pipe(response);
  } catch {
    send(response, 404, 'Không tìm thấy tài nguyên', { 'content-type': 'text/plain; charset=utf-8' });
  }
}

const store = new FarmStore({ clock: () => fakeNow });
const { server: apiServer } = createApiServer({ store, clock: () => fakeNow });
await new Promise((resolve, reject) => {
  apiServer.once('error', reject);
  apiServer.listen(apiPort, '127.0.0.1', resolve);
});

const webServer = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
    if (requestUrl.pathname === '/__e2e/clock' && request.method === 'GET') {
      const advanceMs = Number(requestUrl.searchParams.get('advanceMs') || 0);
      if (Number.isFinite(advanceMs) && advanceMs >= 0) fakeNow += advanceMs;
      sendJson(response, 200, { now: new Date(fakeNow).toISOString() });
      return;
    }
    // Chromium requests a favicon implicitly on a fresh page. Returning a
    // successful empty response keeps that browser concern from becoming a
    // false console-error failure in the gameplay smoke flows.
    if (requestUrl.pathname === '/favicon.ico' && request.method === 'GET') {
      send(response, 204, Buffer.alloc(0), { 'content-type': 'image/x-icon' });
      return;
    }
    if (requestUrl.pathname.startsWith('/api/')) {
      await proxyApi(request, response);
      return;
    }
    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 502, { error: { code: 'E2E_HARNESS_ERROR', message: String(error?.message || error) } });
  }
});

await new Promise((resolve, reject) => {
  webServer.once('error', reject);
  webServer.listen(webPort, '127.0.0.1', resolve);
});

console.log(JSON.stringify({ event: 'e2e.harness.started', webPort, apiPort }));

function shutdown() {
  webServer.close();
  apiServer.close();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
process.once('exit', () => {
  if (webServer.listening) webServer.close();
  if (apiServer.listening) apiServer.close();
});
