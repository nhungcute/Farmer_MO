# 26 — API & DATABASE CONTRACTS

Đây là contract canonical cho MVP. Runtime validation dùng Zod. API trả JSON UTF-8 và dùng cùng origin qua Nginx.

## 1. HTTP conventions

- Base path: `/api`.
- Content-Type request/response: `application/json`.
- Timestamp: ISO-8601 UTC.
- Currency, quantity, XP: integer không âm.
- Client không gửi price, XP, readyAt, reward hoặc level.
- Mutation yêu cầu session cookie.
- Mutation có thể retry phải gửi header `Idempotency-Key` dạng UUID.
- Plant, harvest, sell, buy, complete order, build, feed, collect và quest claim đều bắt buộc `Idempotency-Key`. Enter dùng unique constraint + retry lookup.
- Mỗi response có `requestId` để tra log.

Error format:

```json
{
  "error": {
    "code": "NOT_ENOUGH_COINS",
    "message": "Không đủ Xu",
    "details": {}
  },
  "requestId": "uuid"
}
```

Mã lỗi là technical ID dùng trong code. Client phải map sang tiếng Việt trước khi hiển thị; không render trực tiếp `code` hoặc message mặc định bằng English.

Mã lỗi tối thiểu:

```text
INVALID_INPUT
UNAUTHORIZED
SESSION_EXPIRED
CHARACTER_NAME_TAKEN_RACE
NOT_FOUND
NOT_ENOUGH_COINS
NOT_ENOUGH_ITEM
WAREHOUSE_FULL
NOT_UNLOCKED
PLOT_NOT_EMPTY
CROP_NOT_READY
BUILDING_COLLISION
INVALID_ROTATION
UNIQUE_BUILDING_EXISTS
ORDER_NOT_COMPLETABLE
ANIMAL_NOT_READY
IDEMPOTENCY_KEY_REUSED
RATE_LIMITED
INTERNAL_ERROR
```

## 2. Direct enter flow

### POST `/api/character/enter`

Request:

```json
{ "name": "Mỡ Ú" }
```

Server normalize:

1. Trim đầu/cuối.
2. Unicode NFC.
3. Collapse mọi whitespace liên tiếp thành một space.
4. Casefold để tạo `lookupName`.
5. Từ chối control character.
6. Độ dài 2–24 ký tự Unicode.

Response `200`:

```json
{
  "status": "created",
  "character": {
    "id": "uuid",
    "displayName": "Mỡ Ú",
    "level": 1,
    "xp": 0,
    "coins": 1000,
    "diamonds": 5
  },
  "requestId": "uuid"
}
```

Existing character dùng `status: "existing"` và trả dữ liệu character hiện tại.

Server đồng thời set:

```text
Set-Cookie: mo_farm_session=<opaque>; HttpOnly; SameSite=Lax; Path=/
```

Cookie `Secure` bắt buộc ở `APP_ENV=demo`.

Mutation kiểm tra `Origin` khớp `PUBLIC_ORIGIN`; request không có hoặc sai origin bị từ chối.

New character transaction tạo:

```text
Character
Farm
FarmObject starter buildings
Plot x6
CropInstance ready Rice x3
Inventory starter chicken_feed x1
Warehouse
Order x3, slot đầu order_rice_3
QuestProgress x4 with progress 0
GameSession
```

Concurrent request cùng tên chỉ được tạo một Character nhờ unique index và retry lookup sau unique conflict.

### GET `/api/game/bootstrap`

Đây là request chính duy nhất sau enter hoặc reload.

Response gồm:

```json
{
  "schemaVersion": 2,
  "contentVersion": "mvp-1",
  "serverNow": "2026-09-29T08:00:00.000Z",
  "stateRevision": 1,
  "character": {},
  "farm": { "id": "uuid", "width": 24, "height": 24, "orderCursor": 0 },
  "objects": [],
  "plots": [],
  "crops": [],
  "animals": [],
  "inventory": [],
  "warehouse": { "capacity": 100, "used": 0 },
  "orders": [],
  "quests": [],
  "unlocks": [],
  "settings": {}
}
```

Không có field `tutorial`.

Client phải bảo đảm bootstrap chỉ chạy một lần cho mỗi session initialization.

## 3. Crop routes

### POST `/api/crops/plant`

```json
{ "plotId": "uuid", "cropId": "rice" }
```

Server kiểm tra unlock, plot rỗng, coin và tạo `readyAt` từ server clock.

### POST `/api/crops/harvest`

```json
{ "plotId": "uuid" }
```

Server lock plot và character inventory, kiểm tra ready, kiểm tra capacity, cộng item/XP/quest trong một transaction. Hai request đồng thời chỉ có một request thành công.

## 4. Market routes

### POST `/api/market/sell`

```json
{ "itemId": "rice", "quantity": 5 }
```

Server đọc sell price từ content definition.

### POST `/api/market/buy`

```json
{ "itemId": "chicken_feed", "quantity": 1 }
```

MVP chỉ cho mua `chicken_feed`. Server kiểm tra quantity tối đa 99/request, coin và capacity trong cùng transaction.

## 5. Order route

### POST `/api/orders/:orderId/complete`

Request body rỗng. Server lock order + inventory + character, kiểm tra đủ item, trừ item, cộng reward, cập nhật XP/quest, tạo replacement và lưu idempotency result trong cùng transaction.

## 6. Building routes

### POST `/api/buildings/place`

```json
{
  "definitionId": "pond_small_lv1",
  "gridX": 12,
  "gridY": 8,
  "rotation": 0
}
```

Server lock farm, tính footprint theo rotation, kiểm tra tất cả cell, kiểm tra unlock/cost/unique, trừ coin và tạo object.

Khi `definitionId` là `chicken_coop_lv1`, server tạo `chicken_basic` trong cùng transaction.

MVP không expose move/upgrade route.

## 7. Animal routes

### POST `/api/animals/feed`

```json
{ "animalId": "uuid" }
```

Server trừ đúng 1 `chicken_feed` và tạo `productReadyAt = serverNow + 600`.

### POST `/api/animals/collect`

```json
{ "animalId": "uuid" }
```

Server kiểm tra ready và capacity, cộng 1 Egg, clear timer. Nếu warehouse đầy, action thất bại và state không đổi.

## 8. Quest route

### POST `/api/quests/:questId/claim`

Server kiểm tra progress đã complete và chưa claim, cộng reward một lần trong transaction.

Quest không chặn enter, plant, harvest hoặc build. Không có Tutorial quest.

## 9. Database model notes

Model tối thiểu:

```text
Character
GameSession
Farm
FarmObject
Plot
CropInstance
Animal
InventoryItem
Warehouse
Order
OrderLine
QuestProgress
IdempotencyRecord
```

Các unique/index bắt buộc:

```text
Character.lookupName UNIQUE
Farm.characterId UNIQUE
GameSession.tokenHash INDEX
GameSession.expiresAt INDEX
Plot(characterId, gridX, gridY) UNIQUE
CropInstance.plotId UNIQUE
InventoryItem(characterId, itemId) UNIQUE
QuestProgress(characterId, questId) UNIQUE
IdempotencyRecord(characterId, actionType, key) UNIQUE
```

`FarmObject` phải có `characterId`, `definitionId`, `gridX`, `gridY`, `rotation`, `level`, `createdAt`, `updatedAt`.

`CropInstance` phải có `plotId`, `cropId`, `plantedAt`, `readyAt`, `createdAt`, `updatedAt`.

`GameSession` lưu `tokenHash`, `characterId`, `expiresAt`, `revokedAt`, `createdAt`, `lastSeenAt`.

Inventory và wallet mutation dùng row lock. Build dùng farm lock trước occupancy check. Serialization failure phải được retry giới hạn.

## 10. Server clock và state revision

- Database dùng UTC.
- `serverNow` có trong bootstrap.
- Mọi mutation lấy thời gian từ server.
- Không nhận `readyAt` hoặc `productReadyAt` từ client.
- Mutation response trả `serverNow` và `stateRevision`. `stateRevision` là số tăng dần trên Character và tăng đúng một lần sau mỗi mutation commit.
- Client bỏ qua delta cũ hơn revision hiện tại hoặc thực hiện bootstrap lại khi phát hiện gap.









