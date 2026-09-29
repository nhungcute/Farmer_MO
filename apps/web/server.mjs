import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT ?? 4173);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
};

function safePath(requestPath) {
  try {
    const decoded = decodeURIComponent(requestPath.split('?')[0]);
    const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const absolute = path.resolve(root, relative);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) return null;
    return absolute;
  } catch {
    return null;
  }
}

const server = http.createServer(async (request, response) => {
  const target = safePath(request.url ?? '/');
  if (!target) { response.writeHead(400).end('Yêu cầu không hợp lệ'); return; }
  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) throw new Error('not-file');
    const extension = path.extname(target).toLowerCase();
    response.writeHead(200, { 'content-type': mime[extension] ?? 'application/octet-stream', 'cache-control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' });
    createReadStream(target).on('error', () => {
      if (!response.headersSent) response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Không tìm thấy tài nguyên');
    }).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Không tìm thấy tài nguyên');
  }
});
server.listen(port, '0.0.0.0', () => console.log(JSON.stringify({ event: 'web.started', port, root })));
