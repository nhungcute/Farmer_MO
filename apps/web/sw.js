const CACHE_NAME = 'mo-farm-static-v7-ui-foundation';
const STATIC_URLS = [
  './',
  './index.html',
  './src/main.js',
  './src/locales/vi-VN.js',
  './src/styles.css',
  './src/ui/FarmInterface.js',
  './src/reference-entry.css',
  './src/reference-panels.css',
  './src/ui/ReferenceEntry.js',
  './src/ui/PanelLayout.js',
  './src/ui/ReferencePanels.js',
  './src/ui/LiveHud.js',
  './src/ui/foundation/index.js',
  './src/ui/foundation/foundation.css',
  './src/ui/foundation/tokens.css',
  './src/ui/foundation/content.js',
  './src/ui/foundation/content.generated.mjs',
  ...['contract', 'html', 'icons', 'primitives', 'runtime', 'shell'].map(name => `./src/ui/foundation/${name}.js`),
  './src/live-game.css',
  './src/game/integration/mountPixiFarmRenderer.js',
  './src/game/pixi/PixiFarmRenderer.js',
  './public/assets/design/sprites/orchard-tree-v1.png',
  ...['01_Login', '02_Loading', '05_Warehouse', '06_Shop'].map((name) => `./public/assets/design/reference/${name}.png`),
  './public/manifest.webmanifest',
  './public/vendor/pixi.mjs?v=8.21.0-csp1',
  './public/assets/manifests/animation-manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(STATIC_URLS.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && new URL(request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      })),
  );
});
