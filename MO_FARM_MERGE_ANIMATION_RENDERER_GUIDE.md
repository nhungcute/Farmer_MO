# MỠ FARM — HƯỚNG DẪN CHI TIẾT GHÉP ANIMATION + PIXIJS RENDERER VÀO PROJECT

> Tài liệu thao tác thực tế để ghép gói `mo_farm_animation_renderer_patch.zip` vào project `Farmer_MO` hiện tại mà hạn chế tối đa việc ghi đè lên Backend/Web implementation đang có.
>
> Mục tiêu cuối:
>
> ```text
> Backend gameplay hiện tại
>         +
> Asset/Animation Pipeline hiện tại
>         +
> PixiJS 2.5D Renderer
>         ↓
> MỠ FARM playable trên Web/PWA
> ```

---

## 0. Phạm vi tài liệu

Tài liệu này hướng dẫn:

- Backup project trước khi merge.
- Giải nén patch đúng vị trí.
- Cài PixiJS 8.
- Kiểm tra asset pipeline.
- Chạy test Renderer.
- Chạy Renderer Demo độc lập.
- Kiểm tra animation Chicken/Pond/Crop.
- Kiểm tra camera, zoom, depth sorting và stress test.
- Ghép Renderer vào web shell hiện tại.
- Kết nối bootstrap data với Renderer.
- Đồng bộ mutation gameplay với Renderer.
- Chạy lại Docker.
- Test desktop, mobile và PWA.
- Rollback khi có lỗi.
- Xác định bước tiếp theo sau khi merge thành công.

Không thực hiện trong tài liệu này:

- Viết lại Backend.
- Đổi API contract.
- Thay economy.
- Thay database schema.
- Chuyển toàn bộ frontend sang React ngay lập tức.
- Thay placeholder bằng production artwork.

---

## 1. File và đường dẫn giả định

Project hiện tại:

```text
D:\Core_LVB_BIDC\Project\Farmer_MO
```

Patch đã tải:

```text
mo_farm_animation_renderer_patch.zip
```

Bản full snapshot:

```text
Farmer_MO_with_animation_renderer.zip
```

**Chỉ dùng patch để merge.** Bản full snapshot chỉ dùng để tham khảo/diff, không copy đè project đang tiếp tục phát triển.

---

## 2. Nguyên tắc merge bắt buộc

### 2.1 Không replace project

Sai:

```text
Xóa Farmer_MO hiện tại
→ copy snapshot mới vào
```

Đúng:

```text
Farmer_MO hiện tại
+
merge patch có chọn lọc
```

### 2.2 Không ghi đè business logic đang chạy ổn

Các vùng được coi là canonical của project hiện tại:

```text
apps/api/**
packages/content/**
compose.yaml
asset pipeline hiện tại
animation manifest hiện tại
database/migration hiện tại
localization hiện tại
```

### 2.3 Renderer không gọi API trực tiếp

Luồng đúng:

```text
API
↓
Web application
↓
bootstrap/mutation response
↓
WorldAdapter
↓
Pixi Renderer
```

Không:

```text
Pixi Renderer
↓
fetch('/api/...')
```

---

## 3. Bước 1 — Backup project

Mở PowerShell:

```powershell
cd D:\Core_LVB_BIDC\Project\Farmer_MO
```

Kiểm tra:

```powershell
git status
```

Nếu đang dùng Git:

```powershell
git add .
git commit -m "checkpoint before animation renderer merge"
git tag before-renderer-merge
```

Kiểm tra:

```powershell
git log --oneline -5
```

Nếu chưa dùng Git, copy toàn bộ project:

```text
Farmer_MO
↓
Farmer_MO_backup_before_renderer
```

### Checkpoint

- [ ] Project hiện tại đang chạy được.
- [ ] Có commit hoặc backup.
- [ ] Biết chính xác vị trí patch ZIP.

---

## 4. Bước 2 — Giải nén patch ra thư mục tạm

Không giải nén trực tiếp đè project ngay.

Ví dụ:

```text
D:\Temp\mo_farm_animation_renderer_patch\
```

Cấu trúc kỳ vọng:

```text
apps/
└── web/
    ├── renderer-demo.html
    └── src/
        └── game/
            ├── core/
            ├── pixi/
            ├── integration/
            └── demo/

tests/
└── renderer/

docs/
└── implementation/

package.renderer.dependencies.json
README_ANIMATION_RENDERER_MERGE.md
```

Nếu patch có file khác ngoài danh sách trên, review trước khi copy.

---

## 5. Bước 3 — Kiểm tra conflict trước khi copy

Kiểm tra trong project hiện tại:

```text
apps/web/src/game/
```

Nếu chưa tồn tại thì merge tương đối an toàn.

Nếu đã tồn tại, phải diff từng file trước khi overwrite.

Renderer patch dự kiến sở hữu:

```text
apps/web/src/game/core/**
apps/web/src/game/pixi/**
apps/web/src/game/integration/**
apps/web/src/game/demo/**
tests/renderer/**
```

Không để patch tự ghi đè:

```text
apps/web/src/main.js
apps/web/index.html
apps/api/**
packages/content/**
compose.yaml
package.json
```

---

## 6. Bước 4 — Copy Renderer source

Copy:

```text
PATCH/apps/web/src/game/
```

vào:

```text
Farmer_MO/apps/web/src/game/
```

Cấu trúc sau merge:

```text
apps/web/src/game/
├── core/
│   ├── iso.js
│   ├── CameraModel.js
│   ├── Culling.js
│   ├── ManifestAnimationRegistry.js
│   └── WorldAdapter.js
│
├── pixi/
│   ├── PixiAssetRegistry.js
│   ├── PixiAnimationPlayer.js
│   ├── PixiFarmRenderer.js
│   │
│   ├── entities/
│   │   ├── BuildingView.js
│   │   ├── ChickenView.js
│   │   ├── CropView.js
│   │   ├── PondView.js
│   │   └── OneShotEffectView.js
│   │
│   ├── scene/
│   │   └── FarmScene.js
│   │
│   └── systems/
│       ├── CameraController.js
│       ├── InputController.js
│       └── DebugHudController.js
│
├── integration/
│   └── mountPixiFarmRenderer.js
│
└── demo/
    └── renderer-demo.js
```

### Checkpoint

- [ ] `apps/web/src/game/` tồn tại.
- [ ] Không overwrite `main.js`.
- [ ] Không sửa API.
- [ ] Không sửa content definitions.

---

## 7. Bước 5 — Copy Renderer Demo và tests

Copy:

```text
renderer-demo.html
```

vào:

```text
apps/web/renderer-demo.html
```

Copy:

```text
tests/renderer/**
```

vào:

```text
Farmer_MO/tests/renderer/
```

Có thể copy thêm:

```text
docs/implementation/ANIMATION_RENDERER_WORKSTREAM.md
```

---

## 8. Bước 6 — Cài PixiJS 8

Từ root project:

```powershell
cd D:\Core_LVB_BIDC\Project\Farmer_MO
npm install pixi.js@^8
```

Kiểm tra:

```powershell
npm ls pixi.js
```

Kỳ vọng:

```text
pixi.js@8.x.x
```

Không cài PixiJS 7.

Nếu có lock file, review:

```powershell
git diff package.json
git diff package-lock.json
```

---

## 9. Bước 7 — Kiểm tra baseline project

Chạy:

```powershell
npm run check
```

Kỳ vọng hiện tại:

```text
Syntax checks: PASS
Localization validation: PASS
Asset validation: PASS
API tests: PASS
Strict atlas validation: PASS
```

Nếu baseline project fail, sửa baseline trước khi debug Renderer.

---

## 10. Bước 8 — Build lại Asset Pipeline

Chạy:

```powershell
npm run assets:build
```

Kỳ vọng:

```text
Asset validation PASS: 188 assets, 10 animations.
Atlas pack PASS: 6 atlas pages.
Strict output validation PASS.
Preview generation PASS.
```

Kiểm tra output:

```text
apps/web/public/assets/
├── atlases/
├── manifests/
└── preview/
```

Manifest runtime:

```text
apps/web/public/assets/manifests/animation-manifest.json
```

Không tiếp tục nếu:

- manifest thiếu;
- atlas thiếu page;
- validator fail;
- frame count sai;
- atlas JSON không hợp lệ.

---

## 11. Bước 9 — Chạy Renderer core tests

```powershell
node --test tests/renderer/*.test.mjs
```

Kỳ vọng:

```text
PASS
0 failed
```

Core test phải xác nhận ít nhất:

- isometric transform;
- camera model;
- culling;
- manifest parsing;
- animation registry;
- world mapping.

---

## 12. Bước 10 — Chạy Renderer Demo độc lập

Từ root project:

```powershell
python -m http.server 4173
```

Mở:

```text
http://127.0.0.1:4173/apps/web/renderer-demo.html
```

Nếu port 4173 bận:

```powershell
python -m http.server 5173
```

Mở:

```text
http://127.0.0.1:5173/apps/web/renderer-demo.html
```

Không dùng `file:///...` để test production-like module/asset loading.

---

## 13. Bước 11 — Kiểm tra Renderer Demo

### 13.1 World

Phải thấy các thành phần prototype như:

- isometric world/grid;
- building;
- pond;
- chicken;
- crop nếu demo có;
- debug HUD nếu bật.

### 13.2 Camera Desktop

Mouse drag:

```text
→ pan
```

Mouse wheel:

```text
→ zoom
```

Zoom không được nhảy về góc canvas; nên zoom quanh mouse position.

### 13.3 Chicken animation

Test đủ:

```text
IDLE
WALK
EAT
HAPPY
SLEEP
PRODUCT_READY
```

Test direction:

```text
NE
SE
SW
NW
```

Không được:

- mất texture;
- crash khi đổi direction;
- anchor nhảy bất thường;
- đọc sai atlas.

### 13.4 Animation event

Chọn:

```text
EAT
```

Theo dõi event:

```text
FEED_CONSUMED
```

Event phải xuất đúng animation frame, không dùng `setTimeout()` để đoán.

### 13.5 Pond

Pond phải render theo layer:

```text
Base
Water
Ripple
Sparkle
```

### 13.6 Effects

Test:

```text
Harvest FX
Build FX
```

Effect phải:

- one-shot;
- tự cleanup;
- không leak container/ticker.

---

## 14. Bước 12 — Stress Test

Test lần lượt:

```text
1 Chicken
25 Chicken
50 Chicken
100 Chicken
```

Theo dõi:

```text
FPS
DPR
Zoom
Objects
Visible
Animated
Culled
Atlas pages
```

Mục tiêu desktop:

```text
xấp xỉ 60 FPS
```

100 chicken chỉ là stress test, không phải gameplay thực tế.

---

## 15. Bước 13 — Kiểm tra High-DPI

Renderer nên dùng:

```js
resolution: Math.min(window.devicePixelRatio || 1, 2),
autoDensity: true,
antialias: true
```

Kiểm tra:

```js
window.devicePixelRatio
```

Kỳ vọng:

```text
DPR 1 → render 1
DPR 2 → render 2
DPR 3 → cap ở 2
```

Không CSS upscale một backing canvas quá nhỏ.

---

## 16. Bước 14 — Commit Renderer foundation

Khi demo chạy ổn:

```powershell
git status
```

Add có chọn lọc:

```powershell
git add apps/web/src/game
git add apps/web/renderer-demo.html
git add tests/renderer
git add package.json package-lock.json
```

Commit:

```powershell
git commit -m "add PixiJS animation renderer foundation"
```

---

## 17. Bước 15 — Chuẩn bị Web shell để mount Renderer

Không thay toàn bộ `apps/web/src/main.js` bằng demo.

HTML cần host:

```html
<div id="game-renderer-host"></div>
```

CSS cơ bản:

```css
#game-renderer-host {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

#game-renderer-host canvas {
  display: block;
  width: 100%;
  height: 100%;
}
```

HUD nằm trên canvas:

```css
.game-hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.game-hud button,
.game-hud input,
.game-hud .interactive {
  pointer-events: auto;
}
```

---

## 18. Bước 16 — Import Renderer integration

Trong web application:

```js
import {
  mountPixiFarmRenderer
} from './game/integration/mountPixiFarmRenderer.js';
```

Không import trực tiếp các entity view vào `main.js`.

---

## 19. Bước 17 — Mount Renderer sau Bootstrap

Flow:

```text
Nhập tên
↓
POST /api/character/enter
↓
GET /api/game/bootstrap
↓
mount Pixi Renderer
```

Ví dụ:

```js
let gameRenderer = null;

async function startFarm(bootstrapData) {
  if (gameRenderer) {
    gameRenderer.destroy?.();
    gameRenderer = null;
  }

  gameRenderer = await mountPixiFarmRenderer({
    host: document.querySelector('#game-renderer-host'),
    farm: bootstrapData,
    assetBase: '/assets',
    debug: new URLSearchParams(location.search).has('debug'),

    onCellSelected(cell) {
      console.log('Selected cell:', cell);
    },

    onObjectSelected(object) {
      console.log('Selected object:', object);
    },

    onAnimationEvent(event) {
      console.log('Animation event:', event);
    }
  });
}
```

Sau bootstrap:

```js
await startFarm(bootstrapData);
```

---

## 20. Bước 18 — Nếu Bootstrap schema khác Renderer schema

Không để Renderer phụ thuộc trực tiếp API DTO.

Tạo:

```text
apps/web/src/game/integration/mapBootstrapToWorld.js
```

Ví dụ:

```js
export function mapBootstrapToWorld(data) {
  return {
    farm: data.farm,
    objects: data.objects ?? [],
    crops: data.crops ?? [],
    animals: data.animals ?? []
  };
}
```

Luồng:

```text
API DTO
↓
Mapper
↓
Renderer Model
```

---

## 21. Bước 19 — Đồng bộ Harvest

Flow:

```text
Tap crop
↓
Web application quyết định action
↓
POST /api/crops/harvest
↓
Server response
↓
Update application state
↓
Renderer update
↓
Harvest FX
```

Ví dụ:

```js
const result = await api.harvest(plotId);

applyServerState(result);

gameRenderer.updateFarm(
  buildCurrentRendererState()
);

gameRenderer.playEffect?.({
  type: 'HARVEST',
  gridX: result.gridX,
  gridY: result.gridY
});
```

Renderer không tự cộng inventory/XP.

---

## 22. Bước 20 — Đồng bộ Plant

Flow:

```text
Select Plot
↓
Select Crop
↓
POST /api/crops/plant
↓
Server validates
↓
Response
↓
Renderer shows seed/stage
```

Server quyết định:

```text
coin
crop
plantedAt
readyAt
```

Renderer chỉ hiển thị.

---

## 23. Bước 21 — Đồng bộ Chicken

Feed:

```text
POST /api/animals/feed
```

Sau success:

```text
Chicken EAT
↓
FEED_CONSUMED
↓
IDLE/WALK
```

Server state vẫn sở hữu:

```text
productReadyAt
```

Khi product ready, application mapping chuyển animation state sang:

```text
PRODUCT_READY
```

Renderer không tự tạo economy state.

---

## 24. Bước 22 — Đồng bộ Pond

Build pond:

```text
POST /api/buildings/place
```

Server trả object mới.

Application cập nhật state:

```js
gameRenderer.updateFarm(currentState);
```

Renderer tạo:

```text
PondView
├── Base
├── Water
├── Ripple
└── Sparkle
```

---

## 25. Bước 23 — Đồng bộ Build Mode

Flow chuẩn:

```text
Select building
↓
Renderer ghost
↓
Drag grid
↓
Client preview valid/invalid
↓
Confirm
↓
POST /api/buildings/place
↓
Server validation
↓
Commit hoặc reject
```

Chỉ ghost được optimistic. Building thật chỉ commit sau server success.

---

## 26. Bước 24 — Selection callback

`onCellSelected(cell)` dùng cho:

- plant;
- build;
- move;
- inspect grid.

`onObjectSelected(object)` dùng cho:

- Warehouse;
- Farmhouse;
- Pond;
- Chicken Coop;
- Crop;
- Animal.

Application quyết định UI nào mở.

---

## 27. Bước 25 — Không đưa HUD vào Pixi

Giữ phân tầng:

```text
PixiJS
→ world

DOM
→ HUD/menu/modal
```

Ví dụ:

```text
Pixi Canvas
├── Terrain
├── Building
├── Crop
├── Pond
├── Chicken
└── FX

DOM
├── Coin
├── Diamond
├── Warehouse
├── Market
├── Orders
└── Build Toolbar
```

---

## 28. Bước 26 — Chạy local Web + API

Nếu project hỗ trợ:

```powershell
npm run dev:api
npm run dev:web
```

API mặc định:

```text
127.0.0.1:3001
```

Web mặc định:

```text
127.0.0.1:4173
```

Test:

```text
Tên nhân vật
↓
Enter
↓
Bootstrap
↓
Pixi world xuất hiện
```

---

## 29. Bước 27 — Chạy full Docker

```powershell
docker compose up --build -d
```

Kiểm tra:

```powershell
docker compose ps
```

Mở:

```text
http://127.0.0.1:8080
```

Nếu port 8080 bận:

```powershell
$env:NGINX_PORT = "18080"
$env:PUBLIC_ORIGIN = "http://localhost:18080"
docker compose up --build -d
```

Mở:

```text
http://127.0.0.1:18080
```

---

## 30. Bước 28 — Kiểm tra asset qua Nginx

DevTools → Network.

Kiểm tra:

```text
/assets/manifests/animation-manifest.json
```

phải `200`.

Atlas JSON/PNG cũng phải `200`.

Không chấp nhận:

```text
404
CORS error
MIME error
```

---

## 31. Bước 29 — Test gameplay end-to-end thủ công

### New character

```text
Tên mới
↓
Farm mới
```

### Existing character

```text
Tên cũ
↓
Load farm cũ
```

Checklist:

- [ ] Harvest lúa.
- [ ] Inventory tăng.
- [ ] Coin/XP đúng.
- [ ] Plant crop.
- [ ] Crop stage render đúng.
- [ ] Market sell.
- [ ] Complete order.
- [ ] Build pond.
- [ ] Build chicken coop.
- [ ] Feed chicken.
- [ ] Chicken animation EAT.
- [ ] Egg ready.
- [ ] Collect egg.
- [ ] Reload.
- [ ] Farm vẫn đúng.

---

## 32. Bước 30 — Test Idempotency

Gửi cùng `Idempotency-Key` hai lần cho một mutation.

Kỳ vọng:

```text
coin chỉ trừ một lần
item chỉ cộng/trừ một lần
object chỉ tạo một lần
```

Renderer không được duplicate entity sau retry.

---

## 33. Bước 31 — Test Resize

Resize browser.

Không được:

```text
destroy renderer
→ reload farm
```

Đúng:

```text
renderer resize
↓
camera bounds recalc
↓
world giữ nguyên
```

---

## 34. Bước 32 — Test Mobile Landscape

Portrait:

```text
Hiện overlay yêu cầu xoay ngang
```

Landscape:

```text
Game visible
```

Checklist:

- [ ] 1 finger pan.
- [ ] 2 finger pinch.
- [ ] Tap building.
- [ ] Tap plot.
- [ ] Modal không làm pan world.
- [ ] HUD không che quá nhiều world.
- [ ] Safe area đúng.

---

## 35. Bước 33 — Test PWA

Install PWA.

Kiểm tra:

- [ ] Standalone mode.
- [ ] Landscape.
- [ ] Manifest đúng.
- [ ] Icon đúng.
- [ ] Service worker không cache `/api/`.
- [ ] Reload không mất state server.
- [ ] Resume sau background.

---

## 36. Bước 34 — Test Sharpness

Trên DPR 2/3:

Kiểm tra:

- chicken edge;
- crop leaves;
- roof edges;
- pond outline;
- particle nhỏ;
- HUD icon.

Test cả:

```text
default zoom
max mobile zoom
```

Không được blur rõ do canvas scaling.

---

## 37. Bước 35 — Performance QA

Bật:

```text
?debug=1
```

Theo dõi:

```text
FPS
DPR
objects
visible
animated
culled
zoom
```

Target mobile:

```text
50–60 FPS
```

Nếu thấp, kiểm tra theo thứ tự:

1. DPR quá cao;
2. particle quá nhiều;
3. culling chưa hoạt động;
4. animation ngoài viewport chưa pause;
5. texture quá lớn;
6. duplicate ticker listener;
7. entity update quá nhiều mỗi frame.

---

## 38. Bước 36 — Full Regression Test

Chạy:

```powershell
npm run check
npm run assets:build
node --test tests/renderer/*.test.mjs
npm run test:api
docker compose config --quiet
docker compose up --build -d
```

Không merge final nếu một bước fail.

---

## 39. Bước 37 — Commit Integration

```powershell
git status
```

Commit:

```powershell
git add .
git commit -m "integrate PixiJS renderer with farm gameplay"
git tag renderer-integration-v1
```

---

## 40. Bước 38 — Rollback khi merge lỗi

Nếu đã tạo checkpoint/tag:

```powershell
git reset --hard before-renderer-merge
```

Hoặc revert commit integration:

```powershell
git revert <commit-id>
```

Không xóa thủ công hàng loạt file nếu Git có thể rollback.

---

## 41. Lỗi thường gặp

### 41.1 `Cannot find package pixi.js`

```powershell
npm install pixi.js@^8
```

### 41.2 Atlas 404

Kiểm tra:

```text
assetBase = /assets
```

và Nginx serve đúng public directory.

### 41.3 Chicken không animation

Kiểm tra:

```text
animation-manifest.json
state
direction
frame IDs
atlas page
```

### 41.4 Pond không chạy

Kiểm tra:

```text
base texture
water clip
ripple clip
sparkle clip
```

### 41.5 Canvas mờ

Kiểm tra:

```text
devicePixelRatio
renderer resolution
autoDensity
CSS canvas scaling
```

### 41.6 UI button không click sau khi có Renderer

Đảm bảo DOM UI nhận pointer trước Renderer.

### 41.7 Modal drag làm camera pan

Pointer bắt đầu trong modal không được forward xuống Renderer input system.

### 41.8 Duplicate entity

`updateFarm()` phải reconcile theo `id`, không append vô điều kiện.

---

## 42. Definition of Done cho Merge

Merge hoàn thành khi:

```text
[ ] PixiJS 8 được cài.
[ ] Asset pipeline vẫn PASS.
[ ] Renderer core tests PASS.
[ ] Renderer demo chạy.
[ ] Atlas runtime load PASS.
[ ] Chicken 6 states hoạt động.
[ ] Chicken 4 directions hoạt động.
[ ] FEED_CONSUMED event hoạt động.
[ ] Isometric world hoạt động.
[ ] Pan desktop hoạt động.
[ ] Wheel zoom hoạt động.
[ ] Touch pan hoạt động.
[ ] Pinch zoom hoạt động.
[ ] DPR cap 2 hoạt động.
[ ] Depth sorting hoạt động.
[ ] Culling hoạt động.
[ ] Pond layered animation hoạt động.
[ ] Harvest/build effect hoạt động.
[ ] Bootstrap load vào Renderer.
[ ] Gameplay mutation cập nhật Renderer.
[ ] Reload giữ state server.
[ ] Docker PASS.
[ ] PWA landscape PASS.
[ ] Mobile QA PASS.
[ ] Backend không bị phá.
```

---

## 43. Bước tiếp theo sau khi merge thành công

Sau milestone này:

```text
Backend gameplay       DONE
Asset pipeline         DONE
Animation runtime      DONE
Pixi Renderer          DONE
Integration            DONE
```

Bước tiếp theo là:

```text
PRODUCTION ARTWORK
```

Thứ tự ưu tiên:

```text
1. Chicken
2. Rice
3. Carrot
4. Corn
5. Tomato
6. Pond
7. Farmhouse
8. Warehouse
9. Chicken Coop
10. Effects
11. Terrain/Decor
12. UI polish
```

Giữ nguyên:

```text
asset ID
frame ID
direction
canvas size
anchor
pivot
FPS
manifest contract
```

Chỉ thay visual source.

---

## 44. Sau Production Art

Tiếp tục theo thứ tự:

```text
PostgreSQL runtime
↓
Playwright E2E
↓
Mobile performance
↓
PWA final
↓
Persistent Cloudflare Quick Tunnel (separate lifecycle)
↓
Release Candidate
```

---

## 45. Cloudflare chỉ triển khai sau khi local ổn

Không dùng public tunnel để debug lỗi cơ bản của Renderer.

Trình tự:

```text
Local Web
↓
Local Docker
↓
Mobile LAN
↓
PWA
↓
Persistent Quick Tunnel (*.trycloudflare.com)
```

Theo quyết định Project Owner ngày 2026-10-01, E01 demo dùng `compose.tunnel.yaml` riêng cho cloudflared; application `compose.yaml` quản lý PostgreSQL/API/web/Nginx. Hai stack dùng network `mo-farm-frontend`. Tunnel không dùng token hoặc fixed hostname; ingress vẫn chỉ qua Nginx.

URL runtime:

```text
https://<generated>.trycloudflare.com
```

`npm run e01:app:update` rebuild/recreate API/web và refresh Nginx routing mà giữ cloudflared sống; tùy chọn `-- --nginx` recreate Nginx. Script kiểm tra container ID, StartedAt, RestartCount và URL trước/sau. API PUBLIC_ORIGIN khớp exact runtime URL; không wildcard. Scope URL preservation là **SAME CLOUDFLARED LIFETIME**. URL không vĩnh viễn và có thể đổi khi process/container restart, host reboot hoặc Cloudflare tạo lại session. Production cần hostname ổn định nên dùng Named Tunnel sau này.

Phase 1 chỉ implementation/static regression; không start container/tunnel hoặc tạo URL. Phase 2 cần lệnh riêng từ Project Owner để start và chạy public/mobile/security/persistence/URL-preservation QA. Runbook hiện hành: [`E01_PERSISTENT_QUICK_TUNNEL.md`](docs/implementation/tasks/E01_PERSISTENT_QUICK_TUNNEL.md). RC01 không tự động bắt đầu.

---

## 46. Checklist thao tác nhanh

```text
1. Backup/commit project
2. Giải nén patch vào folder tạm
3. Copy apps/web/src/game/**
4. Copy renderer-demo.html
5. Copy tests/renderer/**
6. npm install pixi.js@^8
7. npm run check
8. npm run assets:build
9. node --test tests/renderer/*.test.mjs
10. chạy renderer-demo.html qua HTTP
11. test chicken/pond/camera/stress
12. commit renderer foundation
13. thêm #game-renderer-host
14. import mountPixiFarmRenderer
15. mount sau bootstrap
16. map API DTO → renderer model
17. sync Plant/Harvest/Build/Animal
18. npm run check
19. docker compose up --build -d
20. test desktop
21. test mobile landscape
22. test PWA
23. performance QA
24. commit integration
25. bắt đầu production artwork
```

---

## 47. Quy tắc kiến trúc cuối cùng

```text
Renderer hiển thị.
Backend quyết định gameplay.
Application điều phối.
Asset pipeline cung cấp texture/animation.
```

Kiến trúc mục tiêu:

```text
                 MỠ FARM WEB APP
                       │
        ┌──────────────┼──────────────┐
        │              │              │
       DOM         Application       Pixi
       UI             State         Renderer
        │              │              │
        └──────────────┼──────────────┘
                       │
                     API
                       │
                  PostgreSQL
```

Giữ nguyên nguyên tắc này cho các phase tiếp theo.
