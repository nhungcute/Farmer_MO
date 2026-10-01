import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const root = path.resolve(process.env.WEB_ROOT ?? defaultRoot);
const port = Number(process.env.PORT ?? 4173);
const SHELL_FILES = new Set(['index.html', 'sw.js']);
const RUNTIME_EXTENSIONS = new Set(['.css', '.js', '.mjs']);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
};

function canonicalPath(value) {
  try { return realpathSync.native(value); } catch { return path.resolve(value); }
}

function isWithin(parent, candidate) {
  const relative = path.relative(canonicalPath(parent), canonicalPath(candidate));
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function artifactConfig(webRoot) {
  const staged = existsSync(path.join(webRoot, 'app')) && existsSync(path.join(webRoot, 'assets'));
  return staged
    ? {
      staged,
      publicRoot: webRoot,
      runtimeRoot: path.join(webRoot, 'app'),
      runtimePrefix: '/app/',
    }
    : {
      staged,
      publicRoot: path.join(webRoot, 'public'),
      runtimeRoot: path.join(webRoot, 'src'),
      runtimePrefix: '/__app/',
    };
}

/**
 * Resolve only files intended for the public web artifact.
 *
 * The Docker image copies the application workspace because the buildless
 * shell uses root-relative `./public/...` URLs. Keep the two shell entry files
 * available, but never make the source tree itself a static namespace.
 */
export function safePath(requestPath, rootDirectory = root) {
  try {
    const decoded = decodeURIComponent(requestPath.split('?')[0]);
    if (!decoded.startsWith('/') || decoded.includes('\0') || decoded.includes('\\')) return null;
    const webRoot = path.resolve(rootDirectory);
    const config = artifactConfig(webRoot);
    if (decoded === '/') return path.join(webRoot, 'index.html');

    const relative = decoded.slice(1);
    if (SHELL_FILES.has(relative)) return path.join(webRoot, relative);
    if (decoded.startsWith(config.runtimePrefix)) {
      const runtimeRelative = decoded.slice(config.runtimePrefix.length);
      const absolute = path.resolve(config.runtimeRoot, runtimeRelative);
      if (!RUNTIME_EXTENSIONS.has(path.extname(absolute).toLowerCase()) || !isWithin(config.runtimeRoot, absolute)) return null;
      return absolute;
    }
    if (!config.staged) {
      if (!decoded.startsWith('/public/')) return null;
      const absolute = path.resolve(config.publicRoot, decoded.slice('/public/'.length));
      if (!isWithin(config.publicRoot, absolute)) return null;
      return absolute;
    }
    const stagedRelative = decoded.slice(1);
    if (stagedRelative === 'manifest.webmanifest' || stagedRelative === 'favicon.svg' || stagedRelative === 'vendor/pixi.mjs') {
      return path.join(config.publicRoot, stagedRelative);
    }
    if (!stagedRelative.startsWith('assets/')) return null;
    const assetsRoot = path.join(config.publicRoot, 'assets');
    const absolute = path.resolve(assetsRoot, stagedRelative.slice('assets/'.length));
    if (!isWithin(assetsRoot, absolute)) return null;
    return absolute;
  } catch {
    return null;
  }
}

function artifactKind(target, webRoot) {
  const config = artifactConfig(webRoot);
  const relative = path.relative(webRoot, target).replaceAll(path.sep, '/');
  if (relative === 'index.html') return 'index';
  if (relative === 'sw.js') return 'service-worker';
  if (isWithin(config.runtimeRoot, target)) return 'runtime';
  if (isWithin(config.publicRoot, target)) return 'public';
  return null;
}

function rewriteShell(content, webRoot) {
  const config = artifactConfig(webRoot);
  const withRuntime = content.replaceAll('./src/', `.${config.runtimePrefix}`);
  return config.staged ? withRuntime.replaceAll('./public/', './') : withRuntime;
}

function notFound(response) {
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Không tìm thấy tài nguyên');
}

export function createWebServer({ rootDirectory = root } = {}) {
  const webRoot = path.resolve(rootDirectory);
  const config = artifactConfig(webRoot);
  return http.createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' }).end('Phương thức không được hỗ trợ');
      return;
    }
    const target = safePath(request.url ?? '/', webRoot);
    if (!target) { notFound(response); return; }
    try {
      const stat = await fs.stat(target);
      if (!stat.isFile()) throw new Error('not-file');
      // Refuse a symlink that escapes the selected shell/public artifact roots.
      const realTarget = await fs.realpath(target);
      const kind = artifactKind(target, webRoot);
      const allowed = kind === 'runtime'
        ? isWithin(config.runtimeRoot, realTarget)
        : kind === 'index' || kind === 'service-worker'
          ? isWithin(webRoot, realTarget)
          : kind === 'public' && isWithin(config.publicRoot, realTarget);
      if (!allowed) throw new Error('outside-public-root');
      const extension = path.extname(target).toLowerCase();
      const raw = kind === 'index' || kind === 'service-worker' ? await fs.readFile(realTarget, 'utf8') : null;
      const body = raw === null ? null : rewriteShell(raw, webRoot);
      const bodyLength = body === null ? stat.size : Buffer.byteLength(body);
      const headers = {
        'content-type': mime[extension] ?? 'application/octet-stream',
        'content-length': String(bodyLength),
        'cache-control': kind === 'index' || kind === 'service-worker' || kind === 'runtime' ? 'no-cache' : 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      };
      response.writeHead(200, headers);
      if (request.method === 'HEAD') { response.end(); return; }
      if (body !== null) { response.end(body); return; }
      createReadStream(realTarget).on('error', () => {
        if (!response.headersSent) response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Không tìm thấy tài nguyên');
      }).pipe(response);
    } catch {
      notFound(response);
    }
  });
}

export async function start({ port: listenPort = port, host = '0.0.0.0', rootDirectory = root } = {}) {
  const server = createWebServer({ rootDirectory });
  await new Promise((resolve) => server.listen(listenPort, host, resolve));
  console.log(JSON.stringify({ event: 'web.started', host, port: listenPort, root: path.resolve(rootDirectory) }));
  return { server };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) start();
