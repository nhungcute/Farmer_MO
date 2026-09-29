# Mỡ Farm — Animation + Renderer Patch

Patch này được xây dựng từ project `Farmer_MO.rar` người dùng cung cấp.

## Mục đích

Cung cấp workstream độc lập:

```text
Animation runtime
+
PixiJS 8 Renderer Foundation
```

Không sửa backend/API/database/economy và không thay canonical asset pipeline.

## Copy vào repository

Copy nguyên các path sau:

```text
apps/web/src/game/**
apps/web/renderer-demo.html
apps/web/src/renderer-demo.css
tests/renderer/**
docs/implementation/ANIMATION_RENDERER_WORKSTREAM.md
package.renderer.dependencies.json
```

Các file này là path mới trong snapshot project được cung cấp nên mục tiêu là giảm tối đa merge conflict với worker đang sửa `main.js`, API hoặc asset pipeline.

## Dependency

Merge dependency sau vào package web/root đang dùng:

```json
"pixi.js": "^8.0.0"
```

Nếu repository hiện đã có PixiJS 8 thì không cần thêm lần nữa.

## Test core trước khi tích hợp UI

```bash
node --test tests/renderer/*.test.mjs
```

Kết quả ở snapshot khi tạo patch:

```text
6 tests
6 pass
0 fail
```

Asset pipeline hiện hữu cũng đã được chạy lại thành công:

```text
Asset validation PASS: 188 assets, 10 animations.
Atlas pack PASS: 6 atlas pages.
Strict output validation PASS.
Preview generation PASS.
```

## Standalone preview

Từ root repository:

```bash
python -m http.server 4173
```

Mở:

```text
http://localhost:4173/apps/web/renderer-demo.html
```

`renderer-demo.html` dùng CDN import map cho PixiJS v8 chỉ để preview độc lập. Production app nên dùng package manager/bundler.

## Mount vào web app

Ví dụ tối thiểu:

```js
import { mountPixiFarmRenderer } from './game/integration/mountPixiFarmRenderer.js';

const session = await mountPixiFarmRenderer({
  host: document.querySelector('#game-renderer-host'),
  farm: bootstrapData,
  assetBase: '/assets',
  debug: location.search.includes('debug=1'),
  onCellSelected(cell) {
    console.log('cell', cell);
  },
  onObjectSelected(entity) {
    console.log('entity', entity);
  },
  onAnimationEvent(event) {
    console.log('animation event', event);
  },
});
```

Khi state farm từ backend thay đổi:

```js
session.updateFarm(nextFarm);
```

## Không merge theo cách này

Không copy đè:

```text
apps/web/src/main.js
apps/web/src/styles.css
apps/api/**
assets-src/**
tools/export-assets/**
package.json
```

Patch cố ý không chứa các file trên để tránh dẫm chân workstream khác.

## Production art

Renderer sử dụng đúng canonical ID hiện tại. Asset hiện tại vẫn là placeholder. Khi production art thay PNG trong `assets-src` và chạy lại `npm run assets:build`, renderer không cần đổi code nếu asset ID/manifest contract giữ nguyên.
