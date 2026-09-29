# 07 — WORLD GRID & BUILD MODE

## 1. Grid data

Farm dùng grid nguyên:

```text
gridX: integer
gridY: integer
```

Footprint:

```json
{
  "width": 2,
  "height": 2
}
```

Rotation có thể đổi footprint cho object không vuông.

## 2. Occupancy map

Client tạo map để preview nhanh:

```text
EMPTY
BUILDING
PLOT
ROAD
POND
BLOCKED
```

Server vẫn validate lại.

## 3. Build categories

```text
Buildings
Farming
Water
Roads
Decor
```

Water MVP:

```text
Small Pond
```

Không canal, pump, gate, junction, irrigation connection.

## 4. Build state machine

```text
IDLE
SELECTING_ITEM
PLACING
VALID
INVALID
CONFIRMING
SAVING
COMPLETE
```

## 5. Ghost

- Opacity khoảng 0.55–0.7.
- Footprint grid overlay.
- Green cells valid.
- Red cells invalid.
- Tooltip reason khi invalid nếu cần.

## 6. Validation

Server check:

- Object definition tồn tại.
- Object unlocked.
- Đủ coin/material.
- Vị trí trong farm.
- Cell không bị chiếm.
- Terrain phù hợp.
- Rotation hợp lệ.
- Build limit.
- Không duplicate unique building.

## 7. API

```http
POST /api/buildings/place
```

```json
{
  "definitionId": "pond_small",
  "gridX": 12,
  "gridY": 8,
  "rotation": 0
}
```

Server response:

```json
{
  "building": {},
  "wallet": {
    "coins": 800
  }
}
```

## 8. Optimistic UI

Không commit building thật trước server success.

Có thể show ghost "saving" trong 100–300ms.

Nếu fail → giữ placement mode + error.

## 9. Move existing building (future only)

Future only.

Flow:

```text
Select building
→ Move
→ remove occupancy tạm
→ preview
→ confirm
→ server validate
```

## 10. Road (future)

Road có thể là tile object nhẹ, không cần pathfinding MVP.

## 11. Acceptance

- Không đặt đè.
- Client preview và server kết quả nhất quán.
- Reload giữ đúng vị trí.
- Pond hoạt động như building footprint bình thường.

## 12. Canonical MVP scope

Ngoài Farmhouse/Warehouse starter, MVP chỉ cho place:

```text
pond_small_lv1: 2x2, 200 coin, unlock level 2
chicken_coop_lv1: 3x2, 300 coin, unlock level 2
```

Road/decor placement, move và upgrade không được triển khai trong MVP. Khi place Coop thành công, server tự tạo một Chicken.


## 13. Server occupancy lock

Client occupancy map chỉ là preview. Server phải lock Farm row trước khi đọc object/plot occupancy, tính toàn bộ footprint sau rotation và ghi object trong cùng transaction.

Hai request build đồng thời trên các vị trí giao nhau chỉ được phép một request thành công. Client không commit object thật trước khi nhận response server.
