# 05 — 2.5D RENDERER

## 1. Công nghệ

PixiJS 8 + WebGL.

## 2. Logical coordinate system

Tile:

```text
width = 128
height = 64
```

Isometric transform:

```ts
export function isoToScreen(x: number, y: number) {
  return {
    x: (x - y) * TILE_W / 2,
    y: (x + y) * TILE_H / 2
  };
}
```

Reverse transform dùng cho hit-test / placement.

## 3. Scene graph

```text
FarmScene
├── BackgroundLayer
├── GroundLayer
├── GroundDecorLayer
├── BuildingLayer
├── CropLayer
├── AnimalLayer
├── EffectsLayer
├── SelectionLayer
└── DebugLayer
```

Có thể gom object vào một depth-sorted world layer nếu cần crossing phức tạp.

## 4. Depth sorting

Base:

```ts
depth = screenY;
```

Thêm offset:

```ts
depth = screenY + elevation + renderOffset;
```

Object lớn cần anchor tại "chân" công trình.

Ví dụ farmhouse sprite anchor ở cửa/chân nhà thay vì tâm ảnh.

## 5. Entity view

Mỗi domain object có view:

```text
BuildingModel -> BuildingView
CropModel -> CropView
AnimalModel -> AnimalView
PondModel -> PondView
```

View không tự gọi API.

## 6. Crop animation

State:

```text
EMPTY
STAGE_1
STAGE_2
STAGE_3
READY
HARVEST_FX
```

Renderer chọn texture theo progress.

Crop stage textures là static frame. `READY` có thể thêm `crop_ready_glow` loop theo manifest; không tự tạo frame nếu manifest thiếu.

## 7. Pond animation

Layers:

```text
base
water
shore details
ripple
fish shadows (future)
sparkle
lotus
```

Không simulation fluid.

## 8. Animal animation

State machine:

```text
IDLE
WALK
EAT
SLEEP
HAPPY
PRODUCT_READY
```

Movement local trong area của pen/co-op.

Server không cần sync từng pixel.

Chicken MVP dùng 4 hướng `NE`, `SE`, `SW`, `NW`. Animation state và direction được lấy từ `AnimationRegistry`; nếu thiếu direction dùng idle fallback cùng hướng.

## 9. Animation ticker

Không tạo `requestAnimationFrame` riêng cho từng entity.

Dùng Pixi ticker chung.

## 10. Culling

Object nằm ngoài camera bounds + margin:

- `renderable = false`
- hoặc detach theo zone.

Margin để animation không pop khi vừa vào viewport.

## 11. Asset loading

Stage:

```text
BOOT:
UI core + common textures

FARM:
terrain + current buildings + current crops

LAZY:
market/warehouse decorative assets
future building sprites
rare animals
```

## 12. Resolution

Renderer:

```ts
resolution = Math.min(window.devicePixelRatio, 2);
autoDensity = true;
```

Có Quality Mode sau này:

```text
Low  -> DPR 1
Medium -> DPR 1.5
High -> DPR 2
```

## 13. Debug mode

Dev overlay:

- FPS.
- Draw calls.
- Visible objects.
- Grid coordinates.
- Camera position.
- Selected object.
- Hitbox.
- Footprint.

Bật bằng query:

```text
?debug=1
```

## 14. Acceptance criteria

- Object không xuyên depth sai rõ ràng.
- Pan/zoom không rung.
- Resize không reload scene.
- Mobile landscape không blur quá mức.
- Farm MVP đạt 50–60 FPS mục tiêu.

## 15. Canonical renderer rules

- World origin là grid `(0, 0)`; camera lưu world offset và zoom riêng.
- Render transform: `viewportCenter + (isoToScreen(grid) - cameraOffset) * zoom`.
- Hit-test phải inverse camera transform trước, sau đó dùng `screenToIso`.
- Depth dùng base anchor của object, không dùng tâm sprite. Tie-break cố định theo `gridX + gridY`, `gridY`, `gridX`, rồi `objectId`.
- Multi-cell building sort theo ô chân công trình và footprint đã rotate.
- `sortableChildren = true` chỉ trên container depth-sorted đã chọn; không trộn nhiều parent depth khác nhau nếu object có thể crossing.
- Culling không được xóa model hoặc làm mất hit-test state; chỉ tắt render/interaction theo policy.
- Canvas dùng `touch-action: none`, Pixi pointer capture và xử lý `pointercancel`.
- Nếu WebGL context bị mất, hiển thị recovery state; nếu thiết bị không hỗ trợ WebGL, hiển thị màn hình unsupported thay vì render DOM farm.
- DPR mặc định adaptive: bắt đầu ở 1 hoặc 1.5 trên mobile; chỉ dùng 2 khi frame-time cho phép.
