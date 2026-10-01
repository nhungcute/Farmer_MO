import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import test, { after, before, describe } from 'node:test';

import { createWebServer } from '../../apps/web/server.mjs';

let server;
let baseUrl;

before(async () => {
  server = createWebServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (!server?.listening) return;
  server.close();
  await once(server, 'close');
});

async function get(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, options);
}

describe('web static artifact boundary', () => {
  test('serves the shell entry points and required public artifacts', async () => {
    const cases = [
      ['/', 'text/html', '<html'],
      ['/index.html', 'text/html', '<title>Mỡ Farm'],
      ['/sw.js', 'text/javascript', 'mo-farm-static'],
      ['/__app/main.js', 'text/javascript', 'defaultFarm'],
      ['/__app/ui/FarmInterface.js', 'text/javascript', 'class FarmInterface'],
      ['/__app/ui/ReferenceEntry.js', 'text/javascript', 'loginMarkup'],
      ['/__app/ui/PanelLayout.js', 'text/javascript', 'alignPanel'],
      ['/__app/ui/ReferencePanels.js', 'text/javascript', 'warehouseMarkup'],
      ['/__app/ui/LiveHud.js', 'text/javascript', 'liveGameMarkup'],
      ['/__app/game/pixi/PixiFarmRenderer.js', 'text/javascript', 'class PixiFarmRenderer'],
      ['/__app/live-game.css', 'text/css', '.live-game'],
      ['/__app/reference-entry.css', 'text/css', '.reference-entry'],
      ['/__app/reference-panels.css', 'text/css', '.reference-shop'],
      ['/__app/game/pixi/scene/FarmLandscape.js', 'text/javascript', 'createFarmLandscape'],
      ['/__app/styles.css', 'text/css', '--'],
      ['/public/manifest.webmanifest', 'application/manifest+json', 'vi-VN'],
      ['/public/favicon.svg', 'image/svg+xml', '<svg'],
      ['/public/assets/manifests/animation-manifest.json', 'application/json', 'animal_chicken'],
      ['/public/assets/atlases/crops.json', 'application/json', 'frames'],
    ];

    for (const [pathname, contentType, marker] of cases) {
      const response = await get(pathname);
      assert.equal(response.status, 200, pathname);
      assert.ok((response.headers.get('content-type') ?? '').startsWith(contentType), pathname);
      assert.match(await response.text(), new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), pathname);
    }
  });

  test('does not expose application source, build files, or repository paths', async () => {
    const forbidden = [
      '/server.mjs',
      '/Dockerfile',
      '/build/vendor-pixi.mjs',
      '/README.md',
      '/renderer-demo.html',
      '/src/main.js',
      '/src/styles.css',
      '/__app/README.md',
      '/__app/game/README.md',
      '/package.json',
      '/.env',
      '/.git/config',
      '/node_modules/pixi.js',
      '/tools/export-assets/index.mjs',
      '/docs/implementation/IMPLEMENTATION_STATUS.md',
      '/public/../server.mjs',
      '/public/%2e%2e/server.mjs',
      '/%2e%2e/server.mjs',
      '/public/',
      '/src/',
    ];

    for (const pathname of forbidden) {
      const response = await get(pathname);
      assert.ok([404, 403].includes(response.status), `${pathname} returned ${response.status}`);
    }
  });

  test('rewrites shell source references to the virtual runtime artifact', async () => {
    const index = await (await get('/')).text();
    assert.match(index, /\/__app\/main\.js/);
    assert.match(index, /\/__app\/styles\.css/);
    assert.doesNotMatch(index, /\.\/src\//);

    const worker = await (await get('/sw.js')).text();
    assert.match(worker, /\/__app\/main\.js/);
    assert.match(worker, /\/__app\/locales\/vi-VN\.js/);
    assert.doesNotMatch(worker, /\.\/src\//);
  });

  test('supports a staged WEB_ROOT containing only public artifacts', async () => {
    const stagedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mo-farm-web-'));
    const appRoot = path.join(stagedRoot, 'app');
    const assetsRoot = path.join(stagedRoot, 'assets');
    await fs.mkdir(path.join(appRoot, 'locales'), { recursive: true });
    await fs.mkdir(path.join(assetsRoot, 'manifests'), { recursive: true });
    await fs.mkdir(path.join(stagedRoot, 'vendor'), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(stagedRoot, 'index.html'), '<link rel="manifest" href="./public/manifest.webmanifest"><script type="module" src="./src/main.js"></script><link rel="stylesheet" href="./src/styles.css">'),
      fs.writeFile(path.join(stagedRoot, 'sw.js'), "const STATIC_URLS = ['./src/main.js', './public/assets/manifests/animation-manifest.json'];"),
      fs.writeFile(path.join(appRoot, 'main.js'), 'export const ready = true;'),
      fs.writeFile(path.join(appRoot, 'styles.css'), 'body { color: green; }'),
      fs.writeFile(path.join(appRoot, 'locales', 'vi-VN.js'), 'export const locale = "vi-VN";'),
      fs.writeFile(path.join(stagedRoot, 'manifest.webmanifest'), '{"lang":"vi-VN"}'),
      fs.writeFile(path.join(assetsRoot, 'manifests', 'animation-manifest.json'), '{"assets":{}}'),
      fs.writeFile(path.join(stagedRoot, 'vendor', 'pixi.mjs'), 'export {};'),
    ]);

    const stagedServer = createWebServer({ rootDirectory: stagedRoot });
    stagedServer.listen(0, '127.0.0.1');
    await once(stagedServer, 'listening');
    const address = stagedServer.address();
    assert.ok(address && typeof address === 'object');
    const stagedUrl = `http://127.0.0.1:${address.port}`;
    try {
      const index = await (await fetch(`${stagedUrl}/`)).text();
      assert.match(index, /\.\/app\/main\.js/);
      assert.match(index, /\.\/manifest\.webmanifest/);
      assert.doesNotMatch(index, /\.\/src\//);
      assert.equal((await fetch(`${stagedUrl}/app/main.js`)).status, 200);
      assert.equal((await fetch(`${stagedUrl}/assets/manifests/animation-manifest.json`)).status, 200);
      assert.equal((await fetch(`${stagedUrl}/vendor/pixi.mjs`)).status, 200);
      assert.equal((await fetch(`${stagedUrl}/manifest.webmanifest`)).status, 200);
      const stagedWorker = await fetch(`${stagedUrl}/sw.js`);
      assert.equal(stagedWorker.status, 200);
      assert.match(await stagedWorker.text(), /\.\/app\/main\.js/);
      for (const pathname of ['/src/main.js', '/public/manifest.webmanifest', '/assets/%252e%252e/app/main.js', '/Dockerfile', '/README.md']) {
        assert.equal((await fetch(`${stagedUrl}${pathname}`)).status, 404, pathname);
      }
    } finally {
      stagedServer.close();
      await once(stagedServer, 'close');
      await fs.rm(stagedRoot, { recursive: true, force: true });
    }
  });

  test('supports HEAD without returning a body', async () => {
    const response = await get('/public/manifest.webmanifest', { method: 'HEAD' });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '');
    assert.equal(response.headers.get('content-length') !== null, true);
  });

  test('rejects methods outside the static read contract', async () => {
    const response = await get('/', { method: 'POST' });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
  });
});
