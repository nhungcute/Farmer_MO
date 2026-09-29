# 02 — TECH ARCHITECTURE

## 1. Monorepo

Khuyến nghị monorepo:

```text
mo-farm/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── game-core/
│   ├── renderer/
│   ├── shared/
│   └── ui/
└── infra/
```

## 2. Layering

### Web

```text
React App
├── pages
├── HUD
├── modals
├── stores
└── game shell
      └── Pixi renderer
```

### Game Core

Pure TypeScript, không phụ thuộc DOM/Pixi nếu có thể.

```text
game-core
├── coordinates
├── rules
├── timers
├── build validation
├── crop definitions
├── animal definitions
├── progression
└── economy formulas
```

### Renderer

```text
renderer
├── SceneManager
├── Camera
├── WorldContainer
├── TileLayer
├── ObjectLayer
├── EntityViewFactory
├── AnimationManager
├── Effects
└── Culling
```

### Backend

```text
api
├── modules
│   ├── character
│   ├── farm
│   ├── crop
│   ├── building
│   ├── animal
│   ├── inventory
│   ├── market
│   ├── order
│   ├── quest
│   └── onboarding-hints
├── plugins
├── db
└── app.ts
```

## 3. Data ownership

| Data | Owner |
|---|---|
| Coin | Server |
| XP | Server |
| Inventory quantity | Server |
| Crop readyAt | Server |
| Building placement | Server |
| Visual animation frame | Client |
| Camera position | Client |
| Temporary UI open/close | Client |
| PWA settings | Client + server if required |

## 4. Client state split

Zustand stores:

```text
useSessionStore
useCharacterStore
useFarmStore
useInventoryStore
useUIStore
useOnboardingHintStore
useCameraStore
```

Không tạo một mega-store duy nhất.

## 5. Event bus

Game renderer và React UI giao tiếp qua typed event bus.

Ví dụ:

```ts
type GameEvent =
  | { type: "OBJECT_SELECTED"; objectId: string }
  | { type: "HARVEST_COMPLETED"; plotId: string }
  | { type: "CAMERA_MOVED"; x: number; y: number; zoom: number }
  | { type: "BUILD_GHOST_MOVED"; gridX: number; gridY: number };
```

Không import component React trực tiếp từ renderer.

## 6. API style

REST đủ cho MVP.

Action endpoint:

```text
POST /api/crops/plant
POST /api/crops/harvest
POST /api/buildings/place
POST /api/animals/feed
POST /api/orders/:id/complete
POST /api/market/buy
```

Read:

```text
GET /api/game/bootstrap
GET /api/warehouse
```

## 7. Time

Server timestamps UTC.

Client chỉ format thời gian.

Crop growth dựa trên:

```text
plantedAt
readyAt
serverNow
```

Bootstrap trả:

```json
{
  "serverNow": "2026-09-29T08:00:00.000Z"
}
```

Client tính offset để hiển thị countdown.

## 8. Error model

Chuẩn hóa:

```json
{
  "error": {
    "code": "NOT_ENOUGH_COINS",
    "message": "Not enough coins",
    "details": {}
  }
}
```

Client map `code` → message tiếng Việt.

## 9. Versioning

Bootstrap có:

```json
{
  "schemaVersion": 1,
  "contentVersion": "2026.09.1"
}
```

Dễ migrate sau này.


## 10. Canonical amendment

Không có Tutorial module trong MVP. Onboarding hint là local UI state, không có server persistence, không nằm trong bootstrap và không được chặn action.



