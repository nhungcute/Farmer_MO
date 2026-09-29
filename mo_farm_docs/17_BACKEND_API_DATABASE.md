# 17 — BACKEND API & DATABASE

## 1. Fastify modules

```text
character
session
health
game
farm
crop
building
animal
inventory
market
order
quest
idempotency
```

Không có tutorial module.

## 2. Prisma model canonical

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

Content definitions được seed từ config version `mvp-1`; không cần admin content table ở MVP nếu config được version và test.

## 3. Character

```text
id UUID
displayName
lookupName UNIQUE
level
xp
coins
diamonds
stateRevision BIGINT
createdAt
updatedAt
```

`lookupName` là Unicode NFC + whitespace collapse + casefold.
## 4. Farm và object

Farm:

```text
id UUID
characterId UNIQUE
width = 24
height = 24
orderCursor = 0
createdAt
updatedAt
```

FarmObject:

```text
id UUID
characterId
farmId
definitionId
gridX
gridY
rotation
level
createdAt
updatedAt
```

Server kiểm tra footprint theo definition và lock farm trước khi place.

## 5. Plot/Crop

Plot:

```text
id UUID
characterId
farmId
gridX
gridY
```

Unique:

```text
(characterId,gridX,gridY)
```

CropInstance:

```text
id UUID
plotId UNIQUE
cropId
plantedAt TIMESTAMPTZ
readyAt TIMESTAMPTZ
createdAt
updatedAt
```

## 6. Inventory/Warehouse

InventoryItem:

```text
characterId
itemId
quantity >= 0
```

Unique:

```text
(characterId, itemId)
```

Warehouse:

```text
characterId UNIQUE
capacity = 100
```

Capacity là tổng quantity của mọi item. Lock inventory/warehouse trong harvest, buy, sell, order và collect.

## 7. Animal/Order/Quest

Animal có `buildingId`, `type`, `fedAt`, `productReadyAt`, `state`.

Order có header và `OrderLine` normalized thay vì JSON tùy ý:

```text
Order: id, characterId, templateId, status, rewardCoin, rewardXp, createdAt, completedAt
OrderLine: orderId, itemId, quantity
```

QuestProgress unique theo `(characterId, questId)` và có `progress`, `target`, `completedAt`, `claimedAt`.

## 8. Session và idempotency

GameSession:

```text
tokenHash INDEX
characterId
expiresAt INDEX
revokedAt
createdAt
lastSeenAt
```

IdempotencyRecord unique theo:

```text
(characterId, actionType, key)
```

Lưu request hash và response đã commit để retry an toàn.

## 9. Transaction requirement

Bắt buộc transaction và lock phù hợp cho:

- New character.
- Plant.
- Harvest.
- Sell.
- Buy feed.
- Complete order.
- Build.
- Feed.
- Collect product.
- Quest claim.

Serialization failure được retry giới hạn; không retry vô hạn.

## 10. Routes

```text
POST /api/character/enter
GET  /api/game/bootstrap
GET  /api/health/live
GET  /api/health/ready
POST /api/crops/plant
POST /api/crops/harvest
POST /api/buildings/place
POST /api/animals/feed
POST /api/animals/collect
POST /api/market/sell
POST /api/market/buy
POST /api/orders/:id/complete
POST /api/quests/:id/claim
```

MVP không expose move/upgrade building, tutorial route hoặc add-animal route.

## 11. Validation và migration

Dùng Zod runtime validation. Không trust payload client.

Prisma migration phải được commit. Không dùng `db push` cho production-like. Seed definitions idempotent và không ghi đè runtime state.

Chi tiết request/response/error nằm trong `26_API_DATABASE_CONTRACTS.md`.






