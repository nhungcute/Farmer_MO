# MỠ FARM — ANIMATION + RENDERER WORKSTREAM HANDOFF

## Status

```text
Workstream: Animation Runtime + Renderer Foundation
Status: READY TO MERGE
Scope owner: apps/web/src/game/** + renderer demo + renderer tests
Canonical asset pipeline: READ ONLY
Backend/API/database/economy: NOT MODIFIED
```

## 1. Mục tiêu đã triển khai

Workstream này nối canonical asset pipeline hiện có vào renderer 2.5D bằng PixiJS v8 mà không sửa schema manifest/atlas.

Đã triển khai:

- Manifest animation registry.
- Direction/state resolution.
- Per-frame duration support.
- Animation event support.
- `FEED_CONSUMED` runtime event.
- Pixi atlas loader cho multi-page atlas hiện tại.
- Texture slicing trực tiếp từ atlas metadata.
- Linear texture filtering.
- Chicken runtime: IDLE/WALK/EAT/HAPPY/SLEEP/PRODUCT_READY.
- 4 hướng NE/SE/SW/NW.
- Isometric transform 128×64.
- Camera pan/zoom.
- Touch pinch zoom.
- Zoom quanh cursor/pinch midpoint.
- Camera bounds.
- Entity depth sorting.
- Basic viewport culling.
- Static building renderer.
- Crop stage renderer + ready glow.
- Pond layered renderer: base/water/ripple/sparkle.
- One-shot effects.
- Object/cell selection events.
- Debug HUD.
- Stress-test demo 1/25/50/100 chickens.
- Engine-agnostic unit tests.

## 2. Files owned bởi workstream

```text
apps/web/src/game/**
apps/web/renderer-demo.html
apps/web/src/renderer-demo.css
tests/renderer/**
package.renderer.dependencies.json
docs/implementation/ANIMATION_RENDERER_WORKSTREAM.md
```

Không yêu cầu overwrite:

```text
apps/web/src/main.js
apps/web/src/styles.css
apps/api/**
assets-src/**
tools/export-assets/**
package.json
```

Điều này giúp merge vào branch đang được worker khác sửa với conflict thấp.

## 3. Dependency duy nhất

Production web app cần:

```text
pixi.js v8
```

Không thay `package.json` tự động vì root package có thể đang được workstream khác sửa. Merge dependency từ `package.renderer.dependencies.json`.

Ví dụ:

```bash
npm install pixi.js@^8
```

Nếu web app dùng Vite/React, imports `from 'pixi.js'` sẽ được bundler resolve bình thường.

## 4. Canonical asset inputs

Renderer đọc nguyên trạng:

```text
apps/web/public/assets/manifests/animation-manifest.json
apps/web/public/assets/atlases/*
```

Không hardcode frame file path.

Luồng:

```text
animation-manifest.json
       ↓
PixiAssetRegistry
       ↓
atlas JSON + PNG pages
       ↓
Texture slices
       ↓
ManifestAnimationRegistry
       ↓
PixiAnimationPlayer
       ↓
Entity Views
```

## 5. Integration với bootstrap

UI/API layer nhận bootstrap từ backend rồi gọi:

```js
renderer.loadFarm(bootstrapFarm);
```

`WorldAdapter` loại bỏ economy/API fields và chỉ đưa render model vào renderer.

Renderer không biết:

```text
coin
diamond
Prisma
PostgreSQL
session
API URL
server timer implementation
```

## 6. Animation event contract

Ví dụ Chicken EAT:

```text
EAT animation
frame 2
→ FEED_CONSUMED
```

Usage:

```js
renderer.on('animationEvent', (event) => {
  if (event.name === 'FEED_CONSUMED') {
    // play local sound / crumb particle only
  }
});
```

Không trừ inventory ở animation event. Inventory phải do server transaction xác nhận.

## 7. Render world contract

```js
{
  width: 24,
  height: 24,
  terrainAssetId: 'terrain_grass_tile',
  buildings: [
    {
      id: 'house-1',
      kind: 'building',
      assetId: 'building_farmhouse_lv1',
      gridX: 8,
      gridY: 4,
      footprint: [3, 3]
    }
  ],
  crops: [],
  animals: []
}
```

## 8. PWA / High-DPI

Pixi renderer khởi tạo theo profile:

```text
LOW    DPR 1.0
MEDIUM DPR <= 1.5
HIGH   DPR <= 2.0
```

`autoDensity=true`, không CSS upscale backing canvas.

Landscape mobile:

```text
minZoom 0.70
maxZoom 1.30
```

Desktop:

```text
minZoom 0.65
maxZoom 1.50
```

## 9. Standalone renderer demo

Mở qua HTTP server:

```bash
python -m http.server 4173
```

Sau đó:

```text
http://localhost:4173/apps/web/renderer-demo.html
```

Demo dùng bundle PixiJS 8 cùng origin tại `apps/web/public/vendor/pixi.mjs`; chạy `npm run renderer:vendor` trước khi mở bằng HTTP.

Demo cho phép:

- 1 / 25 / 50 / 100 chicken.
- Force animation state.
- Test `FEED_CONSUMED`.
- Harvest FX.
- Build FX.
- Pan/zoom/pinch.
- Debug FPS/entity/culling HUD.

## 10. Tests

Core tests không cần cài Pixi:

```bash
node --test tests/renderer/*.test.mjs
```

Pixi modules có thể syntax-check độc lập:

```bash
node --check apps/web/src/game/pixi/PixiFarmRenderer.js
node --check apps/web/src/game/pixi/scene/FarmScene.js
```

Runtime Pixi/browser test phải chạy sau khi project chính cài `pixi.js` v8.

## 11. Merge order

Khuyến nghị:

```text
1. Copy apps/web/src/game/**
2. Copy tests/renderer/**
3. Add pixi.js v8 dependency
4. Run existing assets:build
5. Run renderer core tests
6. Mount PixiFarmRenderer vào web shell hiện tại
7. Run mobile/PWA QA
```

Không cần thay canonical asset pipeline.

## 12. Production art

Các atlas hiện tại vẫn chứa `placeholder: true`. Renderer foundation không biến placeholder thành production art.

Khi art team thay PNG source đúng asset ID rồi chạy:

```bash
npm run assets:build
```

renderer tự dùng atlas mới mà không sửa code.

## 13. Definition of Done của workstream này

- [x] Canonical manifest được đọc runtime.
- [x] Multi-page atlas được load.
- [x] Animation state/direction resolver.
- [x] Per-frame timing support.
- [x] Frame events support.
- [x] Chicken 6 states × 4 directions.
- [x] Isometric 128×64.
- [x] Pan + wheel + pinch zoom.
- [x] Camera bounds.
- [x] Depth sorting.
- [x] Culling cơ bản.
- [x] Pond layered animation.
- [x] Crop ready glow.
- [x] One-shot FX.
- [x] Debug HUD.
- [x] 100 chicken stress-demo option.
- [x] Core unit tests.
- [ ] Production art — separate art task.
- [ ] Device FPS sign-off — phải test trên project/browser thật sau merge.

## Local buildless integration

The standalone demo and the web shell use the pinned same-origin bundle generated by `npm run renderer:vendor`; the web Docker image generates the same file from `package-lock.json` and removes `node_modules` from the runtime layer.
