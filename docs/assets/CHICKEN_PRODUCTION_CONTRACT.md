# MỠ FARM — Chicken Production Contract (B02.2)

| Trường | Giá trị |
|---|---|
| Trạng thái | CONTRACT LOCKED; PRODUCTION CANDIDATE BLOCKED |
| Animation ID | `animal_chicken` |
| Atlas | `chicken` |
| Source of truth | `assets-src/manifests/animation-manifest.json` |
| Source directory | `assets-src/animals/chicken/` |
| Frame count | 92 unique PNG source frames |
| Canvas | `256 × 256` mỗi frame |
| Format | RGBA PNG, alpha thật |
| Source scale | `2` |
| Anchor | `{ x: 0.5, y: 0.9 }` |
| Render offset | `{ x: 0, y: 0 }` |
| Default direction | `SE` |
| Directions | `NE`, `SE`, `SW`, `NW` |
| Mirror | Không được phép (`mirrorAllowed=false`) |

Tài liệu này ghi lại contract bất biến để thay placeholder bằng Chicken production candidate. Nó không thay đổi manifest hoặc runtime. `approved=true` chỉ được đặt sau technical review, style review và owner/release approval ngoài agent.

## 1. Bất biến bắt buộc

Production source phải giữ nguyên:

- asset ID và frame ID;
- animation ID `animal_chicken`;
- atlas `chicken`;
- state name;
- direction name và thứ tự `NE`, `SE`, `SW`, `NW`;
- frame count và frame order;
- FPS, loop và holdLast;
- event name/frame;
- canvas `256 × 256`;
- RGBA PNG và alpha trong suốt;
- `sourceScale=2`;
- anchor `0.5,0.9`;
- render offset `0,0`;
- không mirror;
- đường dẫn `assets-src/animals/chicken/<frame-id>.png`.

Không tự thêm pivot field: manifest Chicken hiện không có pivot riêng; anchor và render offset là dữ liệu canonical. Không sửa renderer, atlas packer, animation runtime hoặc manifest schema để phù hợp artwork.

## 2. Tổng contract theo state

Mỗi state có bốn direction. Tổng cộng 24 state-direction clip và 92 frame reference/source PNG.

| State | Frame/direction | Tổng frame | FPS | Loop | Hold last | Event |
|---|---:|---:|---:|---|---|---|
| `IDLE` | 4 | 16 | 6 | Có | Không | — |
| `WALK` | 6 | 24 | 8 | Có | Không | — |
| `EAT` | 5 | 20 | 10 | Không | Có | `FEED_CONSUMED@2` |
| `HAPPY` | 4 | 16 | 8 | Không | Có | — |
| `SLEEP` | 2 | 8 | 3 | Có | Không | — |
| `PRODUCT_READY` | 2 | 8 | 2 | Có | Không | — |
| **Tổng** | — | **92** | — | — | — | — |

`FEED_CONSUMED@2` xuất hiện trên cả bốn hướng của `EAT`. Đây là zero-based frame index theo manifest, không được chuyển sang frame khác vì timing artwork.

## 3. Direction matrix và frame IDs

Mỗi dòng dưới đây áp dụng cho cả `NE`, `SE`, `SW`, `NW`; `<dir>` trong ID phải được thay bằng chữ thường tương ứng (`ne`, `se`, `sw`, `nw`).

| State | Frame IDs theo direction | Số direction | Tổng |
|---|---|---:|---:|
| `IDLE` | `animal_chicken_idle_<dir>_00..03` | 4 | 16 |
| `WALK` | `animal_chicken_walk_<dir>_00..05` | 4 | 24 |
| `EAT` | `animal_chicken_eat_<dir>_00..04` | 4 | 20 |
| `HAPPY` | `animal_chicken_happy_<dir>_00..03` | 4 | 16 |
| `SLEEP` | `animal_chicken_sleep_<dir>_00..01` | 4 | 8 |
| `PRODUCT_READY` | `animal_chicken_product_ready_<dir>_00..01` | 4 | 8 |

Canonical source examples:

```text
assets-src/animals/chicken/animal_chicken_idle_ne_00.png
assets-src/animals/chicken/animal_chicken_walk_se_05.png
assets-src/animals/chicken/animal_chicken_eat_sw_02.png
assets-src/animals/chicken/animal_chicken_happy_nw_03.png
assets-src/animals/chicken/animal_chicken_sleep_ne_01.png
assets-src/animals/chicken/animal_chicken_product_ready_se_01.png
```

Inventory must report exactly 92 Chicken entries, no missing frame, no extra frame và không có unreferenced Chicken PNG. Full generated list is maintained by `docs/assets/PRODUCTION_ASSET_INVENTORY.json` and the canonical manifest.

## 4. Visual production rules

Chicken candidate phải tuân theo [MO_FARM_PRODUCTION_STYLE_GUIDE.md](MO_FARM_PRODUCTION_STYLE_GUIDE.md):

- 2.5D isometric, cùng world camera;
- cozy, bright, cute cartoon, non-pixel, non-realistic;
- light source trên-trái, shadow về dưới-phải;
- silhouette rõ ở mobile;
- body/comb/beak/feet có asymmetry nhất quán giữa direction thật;
- không mirror vì `mirrorAllowed=false`;
- transparent RGBA, không checkerboard, không background bake-in;
- canvas/anchor/baseline ổn định, không frame jitter;
- shadow/contact treatment không nhấp nháy;
- state motion phải đọc được nhưng không thêm state hoặc effect mới.

## 5. Metadata và evidence

Mỗi frame hoặc source group phải có metadata mapping tới contract:

```text
source
creator
tool
toolVersion
license
contentVersion
placeholder
production_ready
technicalReview
styleReview
approvalRef
```

Quy tắc trạng thái:

- `placeholder=false` chỉ sau khi source thật thay placeholder.
- `production_ready=true` chỉ sau technical validation và metadata/license/source evidence đầy đủ.
- `styleReview` phải ghi kết quả review hình ảnh theo style guide.
- `technicalReview` phải ghi canvas, alpha, anchor, frame order, FPS, loop, holdLast và event.
- `approvalRef` phải trỏ tới approval record thật; không dùng text tự tạo như bằng chứng.
- `approved=true` chỉ sau owner/art/release approval; agent không tự đặt.

## 6. Technical validation

Sau mỗi replacement batch Chicken:

```powershell
node tools/asset-inventory.mjs
node tools/export-assets/index.mjs validate
node tools/export-assets/index.mjs pack
node tools/export-assets/validate.mjs --strict-output
node tools/export-assets/index.mjs preview
node tools/check-renderer-syntax.mjs
npm run renderer:test
npm run check
```

Technical pass phải xác nhận:

- 92/92 PNG đọc được;
- 92/92 PNG là RGBA `256 × 256`;
- manifest không đổi contract;
- atlas `chicken` tạo được deterministic;
- không thiếu/thừa frame;
- alpha không có nền bake-in;
- frame order/FPS/loop/holdLast/event giữ nguyên.

Technical pass không thay thế visual/style/license/release approval.

## 7. Visual, mobile và performance review

Review tại:

- `apps/web/public/assets/preview/animation-preview.html`;
- renderer demo;
- game runtime với Chicken thật.

Kiểm tra đủ sáu state × bốn direction:

- không crop frame;
- feet/base không nhảy;
- body scale ổn định;
- direction đúng;
- IDLE/WALK loop kín;
- EAT event vẫn đúng frame 2;
- HAPPY readable;
- SLEEP subtle;
- PRODUCT_READY dễ nhận biết;
- shadow ổn định;
- không texture bleeding hoặc alpha fringe.

Viewport tối thiểu:

```text
932 × 430
915 × 412
844 × 390
740 × 360
```

Stress review: 1, 25, 50 và 100 Chicken; ghi FPS, memory, animated count, culled count và DPR. Không kết luận performance từ một Chicken.

## 8. B02.2 status gate

B02.2 chỉ chuyển sang `REVIEW` khi tất cả điều kiện đạt:

- 92/92 source frame không còn placeholder;
- production candidate dùng đúng contract này;
- pipeline, renderer test và strict validation PASS;
- visual QA desktop PASS;
- mobile QA PASS;
- stress/performance QA có evidence;
- metadata/license/source đầy đủ;
- `technicalReview` và `styleReview` có evidence;
- chưa đặt `approved=true` nếu owner chưa duyệt.

Nếu thiếu production source hoặc approval evidence, giữ `BLOCKED`. Không bắt đầu crop, building, pond hoặc E01/RC01 từ contract này.
