# 09 — ANIMAL SYSTEM

## 1. MVP scope

- Chicken Coop `chicken_coop_lv1`.
- Một `chicken_basic` tự tạo khi xây coop thành công.
- Feed bằng item `chicken_feed`.
- Egg production.

## 2. Canonical data

```json
{
  "id": "uuid",
  "type": "chicken_basic",
  "buildingId": "uuid",
  "state": "IDLE",
  "fedAt": null,
  "productReadyAt": null
}
```

Định nghĩa:

```text
Feed item       = chicken_feed
Feed/cycle      = 1
Normal timer    = 600 seconds
Product         = egg
Product quantity= 1
Egg sell price  = 20 coin
Collect XP      = 8
Max/coop        = 1
```

## 3. Nguồn thức ăn gà

`chicken_feed` có nguồn rõ ràng:

1. Farm mới nhận 1 unit trong initial inventory.
2. Market mua thêm với giá 5 coin/unit qua `POST /api/market/buy`.

`chicken_feed` không bán lại và không random drop. Không có Tutorial-only feed.

## 4. Build và feed flow

```text
Build Chicken Coop
→ server tạo đúng một chicken_basic
→ dùng starter chicken_feed hoặc mua trong Market
→ POST /api/animals/feed
→ productReadyAt = serverNow + 600s
→ POST /api/animals/collect
→ +1 Egg vào Warehouse
```

Feed server kiểm tra đủ item và trừ đúng một unit trong transaction. Double feed không tạo hai timer.

## 5. Collect

Server kiểm tra:

- Animal thuộc character hiện tại.
- `productReadyAt <= serverNow`.
- Warehouse còn ít nhất một unit capacity.
- Product chưa được collect.

Nếu warehouse đầy, collect thất bại và giữ nguyên timer/product state.

## 6. Animation

```text
IDLE
WALK
EAT
HAPPY
SLEEP
PRODUCT_READY
```

Movement chỉ local trong coop bounds, không lưu từng pixel lên server. Không tạo ticker riêng cho từng chicken.

## 7. Acceptance

- Build coop tự tạo đúng một chicken.
- Starter feed cho phép cycle đầu tiên.
- Market buy tạo được các cycle sau.
- Feed/collect dùng server time.
- Reload giữ countdown.
- Double feed/collect không duplicate.
- Warehouse full block collect.
- Animation không làm tụt FPS đáng kể.
