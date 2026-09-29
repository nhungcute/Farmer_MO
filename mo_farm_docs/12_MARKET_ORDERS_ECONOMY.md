# 12 — MARKET, ORDERS & ECONOMY

## 1. Market sell

Market cho bán item trực tiếp.

```http
POST /api/market/sell
```

```json
{
  "itemId": "rice",
  "quantity": 5
}
```

Server:

- Validate quantity integer `1..99`.
- Kiểm tra inventory đủ.
- Đọc giá từ `25_MVP_CONTENT_DEFINITIONS.md`.
- Trừ item và cộng coin trong cùng transaction.

Client không gửi price.

## 2. Market buy — nguồn thức ăn gà

MVP chỉ cho mua `chicken_feed`.

```http
POST /api/market/buy
```

```json
{
  "itemId": "chicken_feed",
  "quantity": 1
}
```

Canonical:

```text
Buy price: 5 coin/unit
Max quantity/request: 99
Sell lại: không cho phép
```

Server kiểm tra item được phép mua, quantity, coin và warehouse capacity trong cùng transaction.

Farm mới được cấp sẵn 1 `chicken_feed`; Market là nguồn tiếp tế vô hạn sau đó.

## 3. Orders

MVP dùng 3 order slots. Slot đầu farm mới là `order_rice_3`.

| Template | Request | Reward coin | Reward XP |
|---|---|---:|---:|
| `order_rice_3` | 3 Rice | 80 | 80 |
| `order_rice_5` | 5 Rice | 120 | 100 |
| `order_rice_carrot` | 3 Rice + 3 Carrot | 180 | 130 |
| `order_carrot_corn` | 3 Carrot + 3 Corn | 280 | 180 |
| `order_corn_tomato` | 3 Corn + 3 Tomato | 420 | 250 |

Order chỉ yêu cầu item đã unlock. Không expiry trong MVP.

## 4. Complete order

```http
POST /api/orders/:id/complete
```

Transaction:

```text
lock order + inventory + character
→ kiểm tra đủ item
→ remove items
→ reward coins/xp
→ update quest progress
→ mark complete
→ generate replacement hợp lệ
→ commit
```

Có `Idempotency-Key`. Retry cùng key và cùng payload trả lại kết quả cũ, không cấp reward lần hai.

## 5. Economy rules

- Coin, XP và item quantity do server tính.
- Không chấp nhận price, reward hoặc XP từ client.
- Quantity phải là integer dương và có giới hạn request.
- Không cho quantity âm, overflow hoặc item unknown.
- Wallet/inventory lock khi mutation.

## 6. Diamonds

MVP chỉ dùng diamonds làm reward currency. Initial value là 5; quest `first_egg` thưởng 1. Chưa có spending flow hoặc monetization.

## 7. Acceptance

- Sell/buy/order atomic.
- Double click không dupe coin/item.
- Warehouse full block buy/harvest/collect đúng cách.
- Retry timeout không duplicate nhờ idempotency.
- Giá luôn khớp content definitions.
