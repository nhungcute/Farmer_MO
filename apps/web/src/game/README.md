# Mỡ Farm — Animation + Renderer Workstream

Thư mục này là workstream độc lập để ghép vào web app chính. Nó **không gọi API, không biết Prisma/database và không sửa economy**.

## Public renderer API

```js
import { PixiFarmRenderer } from './game/pixi/PixiFarmRenderer.js';

const renderer = new PixiFarmRenderer({
  host: document.querySelector('#game-host'),
  assetBase: '/assets',
  debug: false,
  quality: 'HIGH',
});

await renderer.init();
renderer.loadFarm(bootstrapData);
```

Hoặc truyền render world đã map sẵn:

```js
renderer.setWorld({
  width: 24,
  height: 24,
  terrainAssetId: 'terrain_grass_tile',
  buildings: [],
  crops: [],
  animals: [],
});
```

## Events

```js
renderer.on('cellSelected', ({ x, y }) => {});
renderer.on('objectSelected', (entity) => {});
renderer.on('animationEvent', (event) => {});
```

`FEED_CONSUMED` được phát đúng frame từ canonical animation manifest. Event chỉ dùng cho presentation/client feedback; economy vẫn do server xác nhận.

## Methods

```text
init()
setWorld(world)
loadFarm(farmBootstrap)
syncWorld(world)
updateEntity(entity)
selectCell(x, y, { valid })
focusGrid(x, y, zoom)
playEffectAtGrid(animationId, x, y)
setDebug(boolean)
destroy()
```

## Renderer rules

- Tile logical `128×64`.
- DPR: LOW=1, MEDIUM<=1.5, HIGH<=2.
- Mobile zoom `0.70–1.30`.
- Desktop zoom `0.65–1.50`.
- Linear texture filtering.
- Một Pixi ticker chung.
- Entity ngoài viewport bị cull.
- Pond là layered animation: base + water + ripple + sparkle.
- Crop growth dùng static stage textures; `crop_ready_glow` là animation riêng.
- Chicken animation đọc trực tiếp canonical manifest: 6 states × 4 directions.

## Standalone demo

`apps/web/renderer-demo.html` uses the same pinned local Pixi bundle as the web shell; run `npm run renderer:vendor` before opening the demo.

Production integration **không nên phụ thuộc CDN**. Hãy cài `pixi.js` v8 trong package manager/bundler của web app.

## Web shell integration

`apps/web/src/game/integration/mountPixiFarmRenderer.js` is the only boundary between the web shell and Pixi. `main.js` loads it dynamically after bootstrap; if Pixi or an atlas cannot load, the existing Canvas renderer remains active.

Data flow:

```text
API bootstrap DTO -> mapBootstrapToWorld -> PixiFarmRenderer
API mutation response -> application farm state -> updateFarm -> scene sync
```

The renderer never calls the API and never changes coins, XP, inventory, or timers. `FEED_CONSUMED` is presentation-only; the server response remains authoritative. The DOM HUD stays in the web shell while Pixi owns the world canvas.

## Shell and Pixi vendor

Run `npm run renderer:vendor` to create the pinned same-origin bundle at `apps/web/public/vendor/pixi.mjs`. The Docker image creates it from the lockfile; the service worker caches it for offline resume. If the bundle or an atlas fails, Canvas fallback remains visible and economy state is unchanged.
