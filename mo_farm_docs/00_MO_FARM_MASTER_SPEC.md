# MỠ FARM — MASTER SPECIFICATION

> Tài liệu tổng cho dự án web game nông trại **Mỡ Farm**. Đây là tài liệu đầu vào chính để giao cho Codex/Claude Code hoặc đội phát triển. Các file chi tiết bên dưới phải được đọc cùng tài liệu này.

---

## 1. Mục tiêu sản phẩm

Mỡ Farm là web game nông trại đồ họa **2.5D isometric**, có animation, chạy bằng renderer WebGL, giao diện và cảm giác tổng thể theo các ảnh tham chiếu đã chốt: màu tươi sáng, cozy farm, panel kem/wood, icon lớn rõ ràng, HUD nổi, Market/Warehouse dạng modal lớn.

Mục tiêu kỹ thuật:

- Chạy trên **Docker Desktop**.
- Client là **PWA**, có thể Add to Home Screen.
- Mobile ưu tiên **màn hình ngang**.
- Giao diện touch-friendly, responsive cho điện thoại/tablet/desktop.
- Farm world render bằng **PixiJS/WebGL**, không dựng bằng DOM.
- HUD/menu/modal dùng **React**.
- Backend đơn giản, monolith, dễ bảo trì.
- Không có hệ thống account/email/password.
- Người chơi nhập **tên nhân vật** để load hoặc khởi tạo dữ liệu.
- Dữ liệu game lưu server.
- Không có kênh nước/irrigation canal.
- **Ao nước** là một công trình có footprint trên grid.
- Public qua **persistent Cloudflare Named Tunnel**, dedicated tunnel, fixed hostname và native environment token; lifecycle cloudflared riêng với application Compose.
- App rebuild giữ cloudflared sống; configured fixed hostname/PUBLIC_ORIGIN giữ nguyên. Canonical E01 không dùng Quick Tunnel/generated origin.

---

## 2. Stack đã chốt

| Thành phần | Công nghệ |
|---|---|
| Frontend | React + TypeScript + Vite |
| Renderer | PixiJS 8 + WebGL |
| State | Zustand |
| UI animation | GSAP |
| Game animation | Pixi AnimatedSprite + JSON atlas ở MVP; Spine chỉ future |
| Audio | Howler.js |
| Backend | Node.js + TypeScript + Fastify |
| ORM | Prisma |
| Database | PostgreSQL |
| Reverse proxy | Nginx |
| PWA | vite-plugin-pwa |
| Deployment | Docker Compose |
| Public access | Persistent Cloudflare Named Tunnel (fixed hostname; separate lifecycle) |
| Asset format | WebP/PNG RGBA + JSON Texture Atlas; AVIF chỉ dùng background future |

---

## 3. Kiến trúc tổng

```text
Browser / PWA
│
├── React UI Layer
│   ├── Login Character
│   ├── HUD
│   ├── Quest
│   ├── Inventory
│   ├── Warehouse
│   ├── Market
│   ├── Orders
│   └── Settings
│
├── PixiJS Game Layer
│   ├── Isometric World
│   ├── Terrain
│   ├── Buildings
│   ├── Crops
│   ├── Animals
│   ├── Pond
│   ├── Effects
│   └── Camera
│
└── API Client
    │
    ▼
Nginx
│
├── /        -> Web
└── /api/*   -> Fastify API
                │
                ▼
              PostgreSQL
```

---

## 4. Nguyên tắc kiến trúc bắt buộc

### 4.1 Tách renderer và dữ liệu game

Không lưu tọa độ màn hình:

```json
{
  "screenX": 1540,
  "screenY": 721
}
```

Phải lưu tọa độ grid:

```json
{
  "type": "pond_small",
  "gridX": 12,
  "gridY": 8,
  "rotation": 0,
  "level": 1
}
```

Renderer tự chuyển grid → screen.

### 4.2 React không render farm world

Farm world phải nằm trong `<canvas>`.

React chỉ render:

- HUD.
- Overlay.
- Modal.
- Login.
- Menu.
- Optional onboarding hint.
- Settings.
- Market/Warehouse/Orders.

### 4.3 Không microservice ở MVP

Backend là một ứng dụng Fastify duy nhất.

### 4.4 Server là nguồn dữ liệu chuẩn

Coin, item, building, crop timer, reward, quest progress đều được xác nhận server.

---

## 5. Character login

Không có:

- User account.
- Email.
- Password.
- Register.
- OAuth.
- Forgot password.

Flow:

```text
Nhập tên nhân vật
    ↓
POST /api/character/enter
    ↓
Tên tồn tại?
├── Có  -> tạo session -> load
└── Không -> tạo character + farm mặc định -> session
    ↓
GET /api/game/bootstrap
    ↓
Render game
```

Tên nhân vật là unique display name; các bảng nội bộ liên kết bằng `character_id` UUID.

---

## 6. Bootstrap một lần

Sau khi enter character, client thực hiện **một request chính**:

```http
GET /api/game/bootstrap
```

Response gom:

- Character.
- Farm.
- Farm objects.
- Crops.
- Animals.
- Inventory.
- Warehouse.
- Quests.
- Orders.
- Settings.
- Unlocks.

Mục tiêu: tránh tình trạng tải dữ liệu khi mở trang rồi tải lại lần hai khi vào farm.

---

## 7. Renderer 2.5D

Grid isometric:

```ts
screenX = (gridX - gridY) * tileWidth / 2;
screenY = (gridX + gridY) * tileHeight / 2;
```

Gợi ý:

```text
tileWidth  = 128
tileHeight = 64
```

Sorting:

```ts
zIndex = screenY + elevation + renderOffset;
```

Game phải hỗ trợ:

- Pan.
- Pinch zoom.
- Click/tap.
- Drag building trong Build Mode.
- Viewport culling.
- Sprite batching.
- Texture atlas.

---

## 8. Game loop chính

```text
Plant
  ↓
Grow theo timestamp server
  ↓
Harvest
  ↓
Inventory/Warehouse
  ↓
Sell / Order
  ↓
Coin + XP
  ↓
Level / Unlock
  ↓
Build / Upgrade
  ↓
Plant tiếp
```

Animal loop:

```text
Build coop
  ↓
Add animal
  ↓
Feed
  ↓
Timer
  ↓
Collect product
  ↓
Warehouse / Order
```

Pond loop ban đầu:

```text
Build Pond
  ↓
Animation / Decoration
  ↓
Upgrade
  ↓
Mở fishing/fish ở phase sau
```

---

## 9. Build Mode

Category:

```text
Buildings | Farming | Water | Roads | Decor
```

`Water` không có canal. Chỉ có các công trình nước, bắt đầu với Pond.

Placement state:

```text
SELECT
→ GHOST
→ VALIDATE
→ CONFIRM
→ SERVER SAVE
→ COMMIT WORLD
```

Cell:

- Xanh = hợp lệ.
- Đỏ = không hợp lệ.

---

## 10. PWA và mobile

Thiết kế landscape-first.

Các target quan trọng:

```text
1920x1080
1366x768
1280x720
932x430
915x412
844x390
740x360
```

Portrait:

```text
Ẩn game
Hiện overlay "Hãy xoay ngang để chơi Mỡ Farm"
```

Manifest:

```json
{
  "name": "Mỡ Farm",
  "short_name": "Mỡ Farm",
  "display": "fullscreen",
  "orientation": "landscape",
  "start_url": "/"
}
```

Screen Orientation API chỉ dùng best-effort; luôn có overlay fallback.

---

## 11. Deployment

Docker Compose services:

```text
web
api
db
nginx
cloudflared
```

Production-like local flow:

```text
Internet
  ↓
Cloudflare
  ↓
Persistent Named Tunnel (separate Compose lifecycle)
  ↓
nginx
├── web
└── api
```

App update phải giữ cloudflared container/process và configured fixed PUBLIC_ORIGIN; kiểm tra ID, StartedAt, RestartCount và origin trước/sau thực tế. Owner cấu hình fixed hostname/token và HTTPS origin trước startup, ingress `http://nginx:80`. Runbook hiện hành: [`E01_PERSISTENT_NAMED_TUNNEL.md`](../docs/implementation/tasks/E01_PERSISTENT_NAMED_TUNNEL.md). Correction chỉ repository; runtime chờ lệnh riêng của Project Owner.

---

## 12. MVP bắt buộc

MVP không cần nhiều nội dung. Chỉ cần hoàn thiện vòng lặp:

- Login bằng tên nhân vật.
- New character / existing character.
- Bootstrap một lần.
- Farmhouse.
- Warehouse.
- 6 plots.
- 4 crop types.
- 1 pond.
- Chicken coop.
- 1 chicken.
- Plant.
- Grow.
- Harvest.
- Inventory.
- Warehouse.
- Market.
- Order.
- XP/Level.
- Build Mode.
- Pond placement.
- Save/load.
- Resume sau reload.
- PWA.
- Mobile landscape.
- Docker.
- Stable Cloudflare tunnel.

---

## 13. Definition of Done MVP

MVP được coi là hoàn thành khi:

1. Người chơi mở PWA trên điện thoại.
2. Nếu portrait, game yêu cầu xoay ngang.
3. Nhập tên nhân vật.
4. Nếu chưa tồn tại, tạo farm mới.
5. Vào farm trực tiếp sau bootstrap; không có tutorial blocking.
6. Có thể pan/zoom bằng touch.
7. Có thể thu hoạch/trồng lại.
8. Có thể mở Warehouse/Market/Orders.
9. Có thể xây ao.
10. Có thể xây chuồng gà, cho ăn và thu trứng.
11. Reload trình duyệt không mất dữ liệu.
12. Đóng PWA rồi mở lại load đúng dữ liệu.
13. Rebuild Docker không làm đổi public hostname.
14. Mobile trung bình đạt mục tiêu khoảng 50–60 FPS trong farm MVP.
15. Không có request bootstrap dư thừa.

---

## 14. Danh mục tài liệu chi tiết

1. `01_PRODUCT_VISION_AND_SCOPE.md`
2. `02_TECH_ARCHITECTURE.md`
3. `03_SOURCE_STRUCTURE.md`
4. `04_CHARACTER_LOGIN_AND_BOOTSTRAP.md`
5. `05_RENDERER_2_5D.md`
6. `06_CAMERA_INPUT_MOBILE.md`
7. `07_WORLD_GRID_AND_BUILD_MODE.md`
8. `08_CROP_SYSTEM.md`
9. `09_ANIMAL_SYSTEM.md`
10. `10_POND_SYSTEM.md`
11. `11_INVENTORY_WAREHOUSE.md`
12. `12_MARKET_ORDERS_ECONOMY.md`
13. `13_QUEST_LEVEL_PROGRESSION.md`
14. `14_TUTORIAL_SYSTEM.md` (đã loại khỏi MVP)
15. `15_UI_UX_RESPONSIVE_PWA.md`
16. `16_ASSET_ANIMATION_PIPELINE.md`
17. `17_BACKEND_API_DATABASE.md`
18. `18_SAVE_SYNC_AND_SECURITY.md`
19. `19_DOCKER_CLOUDFLARE_DEPLOY.md`
20. `20_PERFORMANCE_QA_TESTING.md`
21. `21_IMPLEMENTATION_ROADMAP.md`
22. `22_CODING_RULES_AND_ACCEPTANCE.md`
23. `23_HANDOFF_PROMPT_FOR_AI_CODER.md`
24. `24_DECISIONS_AND_PROTOTYPE_SCOPE.md`
25. `25_MVP_CONTENT_DEFINITIONS.md`
26. `26_API_DATABASE_CONTRACTS.md`
27. `27_INFRASTRUCTURE_AND_LOCAL_DEVELOPMENT.md`
28. `28_REQUIREMENT_TRACEABILITY_AND_QA.md`
29. `29_RISK_REGISTER.md`

---

## 15. Thứ tự đọc cho người triển khai

```text
00 Master
↓
01 Product
↓
02 Architecture
↓
03 Source Structure
↓
04 Login/Bootstrap
↓
05 Renderer
↓
06 Camera/Input
↓
07 Grid/Build
↓
08-13 Gameplay Systems
↓
14 Tutorial (retired)
↓
15 UI/PWA
↓
16 Assets
↓
17-19 Backend/Deploy
↓
20 QA
↓
21 Roadmap
↓
22 Rules
↓
23 Handoff Prompt
↓
24 Decisions
↓
25 Content Definitions
↓
26 API/Database Contracts
↓
27 Infrastructure
↓
28 Traceability/QA
↓
29 Risk Register
```

Không được bỏ qua kiến trúc và làm trực tiếp UI mockup trước renderer.


---

## 16. Canonical amendment — direct-entry prototype

Mỡ Farm là prototype/demo; dữ liệu farm không được coi là riêng tư. Người biết tên nhân vật có thể vào farm. Sau `POST /api/character/enter`, client gọi đúng một `GET /api/game/bootstrap` rồi vào farm ngay.

Tutorial đã bị loại khỏi MVP. Không tạo TutorialProgress, tutorial field, tutorial store, tutorial overlay, tutorial reward hoặc crop timer đặc biệt. Onboarding chỉ là hint tùy chọn ở client.

Toàn bộ số liệu và contract đã chốt nằm trong `24_DECISIONS_AND_PROTOTYPE_SCOPE.md` đến `29_RISK_REGISTER.md`; các giá trị gợi ý cũ phải được thay bằng các bảng canonical đó.



