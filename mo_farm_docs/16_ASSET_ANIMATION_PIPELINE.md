# 16 — ASSET & ANIMATION PRODUCTION PIPELINE

> **Version: 1.1 — High-DPI / Directional Animation Update**

Tài liệu này mô tả **cách tạo animation**, không chỉ cách load animation ở runtime. Một animation chỉ được coi là hoàn thành khi có source frame, manifest, atlas, preview, mapping vào renderer và đã kiểm tra chất lượng trên PWA/mobile High-DPI.

## 1. Nguyên tắc sản xuất

- Không dùng một ảnh farm khổng lồ làm background gameplay.
- Farm được tách thành terrain, building, crop, animal, pond và effects.
- Mọi frame của một animation phải có cùng canvas size, pivot và hướng sáng.
- Runtime không tự cắt ảnh hoặc tự đoán anchor.
- Asset source phải có license hoặc được tạo nội bộ; không commit asset không rõ nguồn.
- Bản runtime là output có thể tái tạo từ source, không chỉnh tay trực tiếp trong atlas.
- Animation state chỉ mô tả hiển thị. Server vẫn lưu timer/state economy, không lưu frame hiện tại.

## 2. Style lock trước khi tạo frame

Trước khi vẽ asset đầu tiên, chốt một style sheet gồm:

```text
Perspective: isometric 2.5D
Tile logical size: 128x64
Light direction: top-left
Outline: consistent dark-green/brown outline
Shadow: soft, same direction and opacity
Palette: cream, wood, grass green, water blue, gold
Camera scale: one world tile = one logical tile
```

Mỗi asset mới phải được so với style sheet trước khi đưa vào atlas. Không nhận asset đúng hình nhưng sai perspective, scale hoặc hướng sáng.

## 3. Folder source

```text
assets-src/
├── style/
│   ├── style-sheet.md
│   ├── palette.aseprite
│   └── reference-board/
├── terrain/
├── buildings/
├── crops/
├── animals/
├── ponds/
├── decor/
├── effects/
├── ui/
└── manifests/
    ├── buildings.json
    ├── crops.json
    ├── animals.json
    └── effects.json
```

Output đã pack:

```text
apps/web/public/assets/
├── atlases/
│   ├── farm_common.webp
│   ├── farm_common.json
│   ├── crops.webp
│   ├── crops.json
│   ├── chicken.webp
│   ├── chicken.json
│   └── effects.webp
└── manifests/
    └── animation-manifest.json
```

## 4. Công cụ tạo source

Source có thể được tạo bằng một trong các công cụ sau, miễn output tuân thủ cùng contract:

- Krita hoặc Aseprite cho frame-by-frame raster.
- Blender orthographic camera cho building/pond render từ cùng một góc isometric.
- SVG/Illustrator cho icon UI tĩnh nếu cần.

Quy tắc bắt buộc:

- Master source giữ layer hoặc frame gốc, không chỉ giữ file WebP đã flatten.
- Export intermediate là PNG RGBA để giữ alpha và kiểm tra frame.
- Runtime format là WebP/PNG theo atlas pipeline.
- Không đưa file PSD/ORA/BLEND nặng vào web bundle.
- Ghi tool, phiên bản, license và người tạo trong `asset-manifest`.

## 5. Canvas, scale và pivot

- World tile logical: `128x64`.
- Asset source tạo ở scale 2x logical nếu là raster: một tile tương đương `256x128` source pixels.
- Runtime atlas giữ metadata scale để renderer không tự đoán.
- Tất cả frame trong cùng animation có cùng kích thước canvas.
- Vùng trong suốt phải giữ nguyên để pivot không nhảy giữa frame.
- Anchor lưu normalized `0..1` và được kiểm tra trên debug grid.

Ví dụ:

```json
{
  "anchor": { "x": 0.5, "y": 0.86 },
  "footprint": { "w": 3, "h": 2 },
  "sourceScale": 2
}
```


### 5.1. Công thức xác định độ phân giải nguồn

`sourceScale = 2` là baseline của MVP, nhưng không được hiểu là mọi asset luôn chỉ cần 2x. Asset phải đủ độ phân giải cho kích thước hiển thị lớn nhất thực tế trên thiết bị mục tiêu.

Công thức kiểm tra:

```text
Required Source Resolution
>=
Maximum Logical Display Size
× Target Renderer DPR
× Maximum Camera Zoom
```

Trong đó:

```text
Maximum Logical Display Size
= kích thước object thực tế khi hiển thị trong world,
  không nhất thiết bằng toàn bộ transparent canvas.

Target Renderer DPR
= DPR render mục tiêu của quality profile.

Maximum Camera Zoom
= mức zoom lớn nhất cho phép trên thiết bị đó.
```

Ví dụ Chicken:

```text
visible logical width ≈ 80 px
target DPR            = 2
mobile max zoom       = 1.30

80 × 2 × 1.30 = 208 px
```

Source khoảng `256 px` theo chiều rộng là đủ an toàn.

Ví dụ Farmhouse:

```text
visible logical width ≈ 400 px
target DPR            = 2
mobile max zoom       = 1.30

400 × 2 × 1.30 = 1040 px
```

Có thể dùng source khoảng `1024–1152 px` tùy silhouette/padding. Nếu source không đủ, phải:

1. tăng source resolution; hoặc
2. giảm `maxZoom`; hoặc
3. dùng quality/LOD phù hợp.

Không upscale source nhỏ chỉ để đạt kích thước file yêu cầu.

### 5.2. Quy tắc source scale

Baseline:

```text
terrain/common world asset: @2x
animal/character/hero building thường zoom gần: @2x đến @3x khi cần
UI raster: @3x
UI vector: ưu tiên SVG
```

`sourceScale` trong manifest là metadata bắt buộc đối với raster asset có logical size xác định.

## 6. Asset animation bắt buộc của MVP

MVP dùng `Pixi AnimatedSprite + JSON atlas`. Spine không nằm trong MVP; chỉ xem xét ở phase future khi có nhu cầu rig phức tạp và license riêng.

### Terrain

| Asset | Loại | Số frame | FPS | Loop |
|---|---|---:|---:|---|
| `terrain_grass_tile` | Static | 1 | — | — |
| `terrain_grass_variant_01..04` | Static variants | 1 mỗi variant | — | — |

### Buildings

| Asset | Loại | Số frame | FPS | Loop |
|---|---|---:|---:|---|
| `building_farmhouse_lv1` | Static | 1 | — | — |
| `building_warehouse_lv1` | Static | 1 | — | — |
| `building_chicken_coop_lv1` | Static | 1 | — | — |
| `pond_small_lv1_base` | Static | 1 | — | — |

### Pond

| Animation | Số frame | FPS | Loop | Ghi chú |
|---|---:|---:|---|---|
| `pond_water` | 8 | 12 | Yes | Water surface |
| `pond_ripple` | 6 | 10 | Yes | Nhẹ, không fluid simulation |
| `pond_sparkle` | 4 | 8 | Yes | Có thể tắt ở Low quality |

Không tạo fish shadow hoặc fishing animation trong MVP.

### Crops

Mỗi crop có 5 texture tĩnh, không cần AnimatedSprite:

```text
seed
stage_1
stage_2
stage_3
ready
```

Danh sách bắt buộc:

```text
rice_seed, rice_stage_1, rice_stage_2, rice_stage_3, rice_ready
carrot_seed, carrot_stage_1, carrot_stage_2, carrot_stage_3, carrot_ready
corn_seed, corn_stage_1, corn_stage_2, corn_stage_3, corn_ready
tomato_seed, tomato_stage_1, tomato_stage_2, tomato_stage_3, tomato_ready
```

`ready` có thể dùng `crop_ready_glow` chung:

```text
frames: 4
fps: 8
loop: yes
```

### Chicken

| State | Số frame | FPS | Loop |
|---|---:|---:|---|
| `idle` | 4 | 6 | Yes |
| `walk` | 6 | 8 | Yes |
| `eat` | 5 | 10 | No, giữ frame cuối |
| `happy` | 4 | 8 | No |
| `sleep` | 2 | 3 | Yes |
| `product_ready` | 2 | 2 | Yes |

Chicken MVP có 4 hướng isometric cố định:

```text
NE, SE, SW, NW
```

Mỗi state có frame set riêng theo hướng. Nếu direction chưa có asset, dùng `idle` cùng hướng làm fallback. Chicken movement chỉ local trong coop bounds. Không đồng bộ pixel position lên server.

### Effects

| Effect | Số frame | FPS | Loop |
|---|---:|---:|---|
| `fx_harvest` | 6 | 12 | No |
| `fx_build_success` | 6 | 12 | No |
| `fx_coin_gain` | 8 | 12 | No |
| `fx_egg_collect` | 6 | 12 | No |

Thêm các asset/UI state tối thiểu:

```text
fx_plant: 4 frames @ 12fps, one-shot
build_ghost_valid: 1 static client tint
build_ghost_invalid: 1 static client tint
item icons: coin, diamond, rice, carrot, corn, tomato, chicken_feed, egg, order
rotate overlay, loading, success toast, error toast
```

UI button animation dùng CSS/GSAP; không đưa mọi UI tween vào texture atlas.
UI transition mặc định 150–220ms và phải tôn trọng `prefers-reduced-motion`.

## 7. Naming contract

Tên file phải theo format lowercase, không dấu, zero-padded frame index:

```text
building_farmhouse_lv1.webp
building_warehouse_lv1.webp
building_chicken_coop_lv1.webp
pond_small_lv1_base.webp
pond_small_lv1_water_00.webp
pond_small_lv1_water_01.webp
crop_rice_seed.webp
crop_rice_stage_01.webp
crop_rice_ready.webp
animal_chicken_idle_00.webp
animal_chicken_walk_05.webp
animal_chicken_eat_04.webp
fx_harvest_05.webp
```

Không dùng tên phụ thuộc UI tiếng Việt. UI label nằm trong localization, asset ID dùng tiếng Anh ổn định.

## 8. Animation manifest

Mỗi animation phải có manifest machine-readable. Manifest không chỉ mô tả frame order mà còn phải mô tả direction, anchor, timing, event và quy tắc mirror/fallback.

### 8.1. Direction contract

Chicken MVP có 4 hướng logic:

```text
NE, SE, SW, NW
```

Manifest phải hỗ trợ trực tiếp `state -> direction`.

Ví dụ:

```json
{
  "id": "animal_chicken",
  "atlas": "chicken",
  "directions": ["NE", "SE", "SW", "NW"],
  "defaultDirection": "SE",
  "sourceScale": 2,
  "anchor": { "x": 0.5, "y": 0.9 },
  "mirrorAllowed": true,
  "animations": {
    "IDLE": {
      "SE": {
        "frames": [
          { "id": "animal_chicken_idle_se_00", "durationMs": 650 },
          { "id": "animal_chicken_idle_se_01", "durationMs": 100 },
          { "id": "animal_chicken_idle_se_02", "durationMs": 100 },
          { "id": "animal_chicken_idle_se_03", "durationMs": 300 }
        ],
        "fps": 6,
        "loop": true,
        "holdLast": false
      },
      "SW": {
        "mirrorOf": "SE",
        "flipX": true
      }
    },
    "EAT": {
      "SE": {
        "frames": [
          { "id": "animal_chicken_eat_se_00" },
          { "id": "animal_chicken_eat_se_01" },
          { "id": "animal_chicken_eat_se_02" },
          { "id": "animal_chicken_eat_se_03" },
          { "id": "animal_chicken_eat_se_04" }
        ],
        "fps": 10,
        "loop": false,
        "holdLast": true,
        "events": [
          { "frame": 2, "name": "FEED_CONSUMED" }
        ]
      }
    }
  }
}
```

Nếu production art đã có đủ 4 hướng thì khai báo frame set thật cho cả `NE`, `SE`, `SW`, `NW` và không cần `mirrorOf`.

### 8.2. Mirror rule

Chỉ được mirror direction khi:

```text
mirrorAllowed = true
```

và sprite không có chi tiết bất đối xứng gây sai hình, ví dụ:

- chữ/logo;
- túi hoặc dụng cụ chỉ nằm một bên;
- marking đặc biệt;
- phụ kiện có hướng;
- ánh sáng/bóng được bake theo cách mirror sẽ sai.

Nếu không chắc chắn, tạo đủ 4 hướng.

Manifest validator phải fail nếu direction bị thiếu mà không có frame thật, `mirrorOf` hoặc fallback hợp lệ.

### 8.3. Per-frame duration

`fps` là timing mặc định của clip. `durationMs` trên frame là optional override.

Dùng `durationMs` cho các chuyển động cần giữ pose không đều, ví dụ:

```text
Chicken Idle:
đứng lâu
→ chớp mắt nhanh
→ trở về idle
```

Không bắt buộc mọi clip phải có `durationMs`.

Nếu frame không khai báo `durationMs`, runtime dùng timing từ `fps`.

### 8.4. Animation events

Không dùng `setTimeout()` rời rạc để đồng bộ gameplay/effect với animation.

Clip có thể phát event theo frame:

```json
{
  "events": [
    { "frame": 2, "name": "FEED_CONSUMED" },
    { "frame": 4, "name": "EGG_SPAWN" }
  ]
}
```

Các event runtime điển hình:

```text
FEED_CONSUMED
EGG_SPAWN
HARVEST_ITEM_FLY
BUILD_DUST
FOOTSTEP
PLAY_SFX
```

Animation event chỉ kích hoạt presentation/client feedback. Economy state cuối cùng vẫn do server xác nhận.

### 8.5. Manifest validation

Manifest phải kiểm tra được:

- Frame tồn tại trong atlas.
- Không trùng frame ID trong cùng clip nếu không có chủ đích.
- FPS > 0.
- `durationMs > 0` nếu được khai báo.
- Animation state có mapping runtime.
- Anchor nằm trong `0..1`.
- Số frame tối thiểu đúng theo asset spec.
- Mỗi event reference tới frame index hợp lệ.
- Direction nằm trong `directions`.
- Direction thiếu phải có `mirrorOf` hoặc fallback hợp lệ.
- `mirrorOf` chỉ được dùng khi `mirrorAllowed = true`.
- Không tạo vòng lặp `mirrorOf`/fallback.
- `defaultDirection` phải tồn tại hoặc resolve được.

Manifest production phải có thêm:

```text
renderOffset
fallbackFrame
sourceFile
license
placeholder
contentVersion hoặc assetHash
```

Nếu atlas packer trim transparent pixels, frame metadata phải giữ `originalSize`, `sourceSize` và `pivot` để anchor không bị thay đổi.

## 9. Quy trình tạo animation

### Bước 1 — Tạo style/reference

- Chốt style sheet, palette, light direction và tile scale.
- Ghi nguồn tham chiếu và license.
- Tạo một asset mẫu: `terrain_grass_tile`, `farmhouse`, `chicken_idle`.
- Review mẫu trước khi tạo toàn bộ asset.

### Bước 2 — Tạo source frame

- Tạo cùng canvas size cho toàn bộ state.
- Đặt pivot/anchor ở chân entity.
- Giữ cùng hướng sáng và camera.
- Không crop từng frame theo bounding box riêng.
- Đặt frame index từ `00`.

### Bước 3 — Export intermediate

- Export PNG RGBA từng frame.
- Kiểm tra alpha, kích thước, màu và đường viền.
- Chạy tên file validator.
- Đưa source và metadata vào `assets-src/`, không đưa PNG source vào web bundle.

### Bước 4 — Tạo manifest

- Khai báo state, direction, frame order, FPS, loop, anchor và atlas group.
- Khai báo `durationMs` nếu clip cần timing không đều.
- Khai báo animation event nếu effect/sound phải xảy ra đúng frame.
- Khai báo `mirrorAllowed` và `mirrorOf` nếu dùng directional mirroring.
- Không khai báo frame không tồn tại.
- Không để renderer tự suy luận animation từ tên file.

### Bước 5 — Pack atlas

Dùng một wrapper duy nhất, ví dụ:

```text
pnpm assets:validate
pnpm assets:pack
pnpm assets:preview
```

Wrapper phải tạo JSON atlas tương thích PixiJS 8 và giữ frame name nguyên vẹn. Không pack thủ công từng atlas bằng nhiều quy tắc khác nhau.

Atlas dùng padding/extrude 2–4 pixels để tránh texture bleeding. Runtime atlas không dùng AVIF; dùng WebP RGBA và PNG fallback khi browser target không hỗ trợ alpha ổn định.

Atlas group MVP:

```text
farm_common: terrain + farmhouse + warehouse + coop + pond base
crops: toàn bộ crop stage + crop_ready_glow
chicken: toàn bộ chicken states
effects: harvest/build/coin/egg/plant effects
```

Giới hạn atlas mobile MVP là `2048x2048`; vượt giới hạn phải chia group, không tự tăng lên một atlas khổng lồ.

### Bước 6 — Preview sheet

`pnpm assets:preview` phải tạo preview HTML hoặc contact sheet để kiểm tra:

- Frame order.
- Loop seam.
- Pivot.
- Scale giữa các state.
- Direction và mirrored direction.
- Per-frame timing.
- Animation event marker.
- Missing frame.
- Flicker hoặc texture bleeding.

### Bước 7 — Tích hợp runtime

- `AnimationRegistry` đọc manifest.
- `EntityViewFactory` tạo `AnimatedSprite` từ state + direction.
- Runtime hỗ trợ frame timing override và animation event callback.
- Mirrored direction chỉ được tạo khi manifest cho phép.
- Renderer dùng Pixi shared ticker, không tạo `requestAnimationFrame` cho từng entity.
- API không được gọi từ AnimationView.
- Khi state server đổi, view chuyển animation state tương ứng.

Loader contract:

```text
AssetRegistry.loadManifest()
AssetRegistry.loadAtlas(group)
AnimationRegistry.get(id, state, direction)
AnimationRegistry.fallback(id, state, direction)
```

Nếu chưa có production art ở G1/G2, dùng placeholder cùng manifest và anchor để kiểm tra renderer. Placeholder phải được đánh dấu `placeholder: true` và không được coi là art final.

Mapping canonical:

```text
Crop READY        → crop_ready + crop_ready_glow
Pond building    → water + ripple + sparkle
Chicken IDLE     → IDLE
Chicken WALK     → WALK
Chicken feeding  → EAT
Chicken product  → PRODUCT_READY
Harvest success  → fx_harvest
Build success    → fx_build_success
```

### Bước 8 — QA và sign-off

Asset owner kiểm tra style/pivot. Developer kiểm tra manifest/runtime. QA kiểm tra mobile/FPS/memory. Chỉ sau ba bước này asset mới được đánh dấu `approved`.

## 10. Texture atlas và export

Ưu tiên:

- WebP RGBA cho sprite runtime.
- PNG chỉ khi WebP alpha hoặc browser target gặp vấn đề.
- JSON atlas tương thích PixiJS 8.
- Atlas tối đa 2048x2048 cho group mobile MVP; chia group nếu vượt.
- Không để một atlas chứa toàn bộ future content.
- Tên atlas có content version hoặc asset hash để service worker không giữ asset cũ.

Canvas source chuẩn cho MVP:

```text
crop frame:    128x128 logical canvas, 256x256 source pixels ở scale 2
chicken frame: 128x128 logical canvas, 256x256 source pixels ở scale 2
pond frame:    256x192 logical canvas, 512x384 source pixels ở scale 2
building:      tối đa 512x384 logical canvas, tùy footprint
```

Các frame trong cùng clip luôn có cùng canvas size và base anchor; không crop từng frame làm entity rung.

## 11. PWA / HIGH-DPI RENDERING STANDARD

Mục tiêu của phần này là đảm bảo world art và animation không bị mờ/vỡ trên điện thoại DPR 2–3 khi chạy trong browser hoặc PWA standalone.

### 11.1. PixiJS renderer setup

Baseline:

```ts
const app = new PIXI.Application();

await app.init({
  resizeTo: window,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  autoDensity: true,
  antialias: true,
  backgroundAlpha: 0
});
```

Quy tắc:

- `autoDensity = true`.
- DPR runtime mặc định không vượt `2` ở High profile.
- Resize backing buffer thật khi viewport đổi.
- Không destroy/recreate toàn FarmScene chỉ vì resize.
- Không dùng CSS để phóng một backing canvas nhỏ lên kích thước lớn hơn.

### 11.2. CSS canvas scaling

Canvas có thể có:

```css
.game-canvas {
  width: 100vw;
  height: 100dvh;
  display: block;
}
```

nhưng Pixi phải đồng thời resize backing buffer theo viewport và `resolution`.

Không được:

```text
canvas internal: 960x540
CSS display:    1920x1080
```

vì browser sẽ upscale bitmap và làm hình mờ.

### 11.3. Texture filtering

Mỡ Farm là cartoon 2.5D, không phải pixel art.

Default texture filtering:

```text
LINEAR
```

Không dùng `NEAREST` cho world asset mặc định.

Texture atlas phải có padding/extrude `2–4 px` để tránh bleeding khi filtering/zoom.

### 11.4. Quality profile

Renderer phải có ít nhất ba quality profile:

```text
LOW
renderer DPR = 1.0
minor particles = off/low
minor decor animation = reduced

MEDIUM
renderer DPR = 1.5
particles = medium
decor animation = medium

HIGH
renderer DPR = min(devicePixelRatio, 2)
particles = full
decor animation = full
```

Có thể auto downgrade nếu frame-time vượt budget liên tục, nhưng không được làm mất tín hiệu gameplay quan trọng.

### 11.5. Camera zoom contract

Đề xuất:

```text
Mobile:
minZoom     = 0.70
defaultZoom = 0.90–1.00
maxZoom     = 1.30

Desktop/Tablet lớn:
minZoom     = 0.65
defaultZoom = 1.00
maxZoom     = 1.50
```

Nếu art không đủ source resolution tại `maxZoom`, phải giảm `maxZoom` hoặc tăng source; không chấp nhận blur rõ ràng.

### 11.6. PWA orientation

Gameplay là landscape-first.

Portrait chỉ hiển thị rotate overlay; không resize world UI thành portrait gameplay.

Manifest PWA nên có:

```json
{
  "display": "fullscreen",
  "orientation": "landscape"
}
```

Screen Orientation API chỉ là best-effort; rotate overlay luôn là fallback.

### 11.7. Mobile sharpness QA

Mỗi nhóm asset quan trọng phải được test trên thiết bị thật hoặc thiết bị tương đương:

```text
Android DPR 2
Android DPR 3
iPhone Retina
Tablet landscape
Desktop
```

Kiểm tra tại:

```text
default zoom
max mobile zoom
PWA standalone
browser landscape
```

Đặc biệt kiểm tra:

- mắt/viền animal;
- lá crop;
- cạnh mái nhà;
- đường outline;
- text/icon UI;
- ripple/particle nhỏ;
- texture bleeding;
- blur khi camera đứng yên và khi pan.

## 12. Runtime animation budget

Không để mọi object chạy 60fps.

```text
Water: 12 fps
Pond ripple: 10 fps
Animal: 6–10 fps
Effects: 12 fps
UI tween: 60fps nhưng ngắn
```

Camera xa:

- Tắt sparkle nhỏ.
- Giảm animal update.
- Dùng water static variant nếu frame-time vượt budget.
- Không tắt animation state economy-critical nếu nó làm người chơi hiểu sai; `PRODUCT_READY` phải vẫn có tín hiệu tĩnh.

## 13. Missing asset và fallback

Nếu atlas hoặc frame bị thiếu:

- Log một structured warning có asset ID.
- Dùng placeholder magenta/debug trong development.
- Dùng static fallback cùng silhouette ở production demo.
- Không crash toàn bộ scene.
- Không tự tải asset từ URL không nằm trong manifest.

Build CI phải fail với asset thiếu; fallback chỉ bảo vệ runtime khi asset bị hỏng sau deploy.

## 14. Asset QA checklist

- [ ] Có source/master file.
- [ ] Có license hoặc ghi rõ tạo nội bộ.
- [ ] Có asset ID ổn định.
- [ ] Có manifest.
- [ ] Frame cùng canvas size.
- [ ] Anchor/pivot khớp debug grid.
- [ ] Không sai perspective/light/scale.
- [ ] Source resolution đạt công thức DPR × max zoom hoặc có giới hạn zoom tương ứng.
- [ ] Direction set đầy đủ hoặc mirror/fallback hợp lệ.
- [ ] `mirrorAllowed` được kiểm tra với asset bất đối xứng.
- [ ] Per-frame duration chạy đúng nếu có.
- [ ] Animation event phát đúng frame nếu có.
- [ ] Không texture bleeding ở atlas.
- [ ] Atlas không vượt 2048x2048/mobile budget.
- [ ] Preview loop không giật.
- [ ] Missing-frame validator pass.
- [ ] Runtime mapping pass.
- [ ] Không CSS upscale canvas.
- [ ] Hình sắc nét ở PWA DPR 2 và kiểm tra DPR 3.
- [ ] Test ở max mobile zoom.
- [ ] Mobile FPS/memory pass.

## 15. Animation Definition of Done

Một animation MVP chỉ hoàn thành khi có đủ:

```text
source frame
→ naming validator
→ manifest
→ atlas
→ preview
→ renderer state/direction mapping
→ animation timing/event QA
→ PWA High-DPI sharpness QA
→ mobile FPS/memory QA
→ license/asset metadata
```

Không đánh dấu feature animation hoàn thành chỉ vì đã có một ảnh tĩnh hoặc một `AnimatedSprite` chạy được trên desktop.

Một animation production chỉ được `approved` khi:

1. loop/timing không giật;
2. anchor không nhảy;
3. direction/mirror đúng;
4. event đúng frame;
5. hình đủ nét tại mobile max zoom;
6. PWA standalone không blur do canvas scaling;
7. FPS/memory vẫn nằm trong budget.
