# 25 — MVP CONTENT DEFINITIONS

Content version: `mvp-1`.

Đây là bảng số liệu canonical của MVP. AI coder không được tự bịa hoặc tự cân bằng lại trong lúc code. Mọi số thời gian tính bằng giây; mọi timestamp lưu UTC; mọi currency là số nguyên.

## 1. Farm mới

| Field | Giá trị |
|---|---:|
| Map width | 24 cells |
| Map height | 24 cells |
| Coins | 1,000 |
| Diamonds | 5 |
| Level | 1 |
| XP | 0 |
| Warehouse capacity | 100 units |
| Fixed farmhouse | 1, footprint 3x3 |
| Fixed warehouse | 1, footprint 2x2 |
| Total plots | 6 |
| Ready rice plots | 3 |
| Empty plots | 3 |
| Fixed trees/decor | 10 |
| Starter chicken feed | 1 unit |
| Initial orders | slot 1 `order_rice_3`, slot 2 `order_rice_5`, slot 3 `order_rice_3` |

Ba plot Rice ban đầu có `readyAt <= createdAt`, nên người chơi có thể harvest ngay sau khi vào game. Ba plot còn lại trống.

Tọa độ starter objects phải được cố định trong seed/config để mọi farm mới có layout giống nhau và không đè lên nhau:

```text
farmhouse: (8, 4), footprint 3x3
warehouse: (13, 4), footprint 2x2
plots: (8, 10), (10, 10), (12, 10), (8, 13), (10, 13), (12, 13), footprint 1x1
```

## 2. Crop definitions

| ID | Tên UI | Unlock | Plant cost | Grow seconds | Yield | Sell price/unit | XP harvest |
|---|---|---:|---:|---:|---:|---:|---:|
| `rice` | Lúa | 1 | 5 | 120 | 3 | 8 | 10 |
| `carrot` | Cà rốt | 2 | 8 | 240 | 3 | 14 | 14 |
| `corn` | Bắp | 3 | 12 | 420 | 3 | 22 | 20 |
| `tomato` | Cà chua | 4 | 15 | 600 | 3 | 34 | 28 |

Quy tắc:

- `plantCost` trừ coin khi plant, không trừ inventory.
- `harvestYield` cộng vào inventory sau khi server xác nhận ready.
- `readyAt = plantedAt + growSeconds`.
- Không có crop timer đặc biệt cho Tutorial.
- Crop stage chỉ là hiển thị client, không phải dữ liệu economy.

## 3. Item definitions

| ID | Category | Stack | Buy price | Sell price | Ghi chú |
|---|---|---:|---:|---:|---|
| `rice` | Crops | 999 | — | 8 | Sản phẩm từ crop |
| `carrot` | Crops | 999 | — | 14 | Sản phẩm từ crop |
| `corn` | Crops | 999 | — | 22 | Sản phẩm từ crop |
| `tomato` | Crops | 999 | — | 34 | Sản phẩm từ crop |
| `chicken_feed` | Animal Goods | 999 | 5 | Không bán | Thức ăn gà |
| `egg` | Animal Goods | 999 | — | 20 | Sản phẩm từ chicken |

### Nguồn thức ăn gà

`chicken_feed` có hai nguồn hợp lệ trong MVP:

1. Farm mới nhận 1 unit để người chơi có thể cho con chicken đầu tiên ăn ngay.
2. Market cho phép mua vô hạn với giá 5 coin/unit qua `POST /api/market/buy`.

Không có nguồn thức ăn ẩn, random drop hoặc Tutorial-only feed. Không cho bán `chicken_feed`.

## 4. Building definitions

| ID | Category | Unlock | Cost | Footprint | Unique | XP |
|---|---|---:|---:|---:|---|---:|
| `farmhouse_lv1` | Buildings | 1 | 0 | 3x3 | Yes | 0 |
| `warehouse_lv1` | Buildings | 1 | 0 | 2x2 | Yes | 0 |
| `pond_small_lv1` | Water | 2 | 200 coin | 2x2 | Yes | 20 |
| `chicken_coop_lv1` | Buildings | 2 | 300 coin | 3x2 | Yes | 30 |

MVP chỉ cho place `pond_small_lv1` và `chicken_coop_lv1` ngoài hai starter building. Roads, decor placement, building upgrade và building move để phase sau.

Khi place `chicken_coop_lv1` thành công, server tự tạo đúng một `chicken_basic` nếu coop chưa có chicken. Không có endpoint add-animal trong MVP.

## 5. Chicken definition

| Field | Giá trị |
|---|---:|
| ID | `chicken_basic` |
| Feed item | `chicken_feed` |
| Feed quantity/cycle | 1 |
| Product | `egg` |
| Product quantity | 1 |
| Normal product time | 600 seconds |
| XP on collect | 8 |
| Maximum per coop | 1 |

Flow:

```text
Build coop → server creates chicken → buy/use chicken_feed → feed
→ productReadyAt → collect egg → warehouse
```

Nếu kho không đủ chỗ khi collect, server block collect và giữ nguyên `productReadyAt`.

## 6. Market và order definitions

Market sell luôn dùng giá trong bảng Item. Client không gửi price.

Market buy MVP chỉ hỗ trợ `chicken_feed`.

| Order ID/template | Unlock | Request | Reward coins | Reward XP |
|---|---:|---|---:|---:|
| `order_rice_3` | 1 | 3 Rice | 80 | 80 |
| `order_rice_5` | 1 | 5 Rice | 120 | 100 |
| `order_rice_carrot` | 2 | 3 Rice + 3 Carrot | 180 | 130 |
| `order_carrot_corn` | 3 | 3 Carrot + 3 Corn | 280 | 180 |
| `order_corn_tomato` | 4 | 3 Corn + 3 Tomato | 420 | 250 |

Quy tắc:

- Có 3 order slots.
- Slot đầu tiên của farm mới là `order_rice_3`.
- Order chỉ yêu cầu item đã unlock.
- Order không expiry trong MVP.
- Complete order atomic: trừ item, cộng coin/XP, mark complete, tạo replacement trong cùng transaction.
- Replacement dùng round-robin theo thứ tự `order_rice_3` → `order_rice_5` → `order_rice_carrot` → `order_carrot_corn` → `order_corn_tomato`, bỏ qua template chưa unlock.
- Cursor replacement lưu trên Farm để reload không đổi thứ tự.

## 7. Level và unlock

Công thức:

```ts
xpToNext(level) = 100 + (level - 1) * 60
```

Cumulative threshold:

| Level | Tổng XP cần đạt | Unlock |
|---:|---:|---|
| 1 | 0 | Rice, starter buildings, Build Mode |
| 2 | 100 | Carrot, Pond, Chicken Coop |
| 3 | 260 | Corn |
| 4 | 480 | Tomato |
| 5 | 760 | Roads/Decor future flag only |
| 6 | 1,100 | Không có MVP content |
| 7 | 1,500 | Không có MVP content |
| 8 | 1,960 | Warehouse upgrade future flag only |
| 9 | 2,480 | Không có MVP content |
| 10 | 3,060 | Fishing future flag only |

Khi một action làm XP vượt nhiều mốc, server phải xử lý toàn bộ level-up trong một transaction và trả về danh sách unlock mới.

## 8. Quest definitions không có Tutorial

Quest là hệ thống tùy chọn, không chặn người chơi vào farm.

| ID | Điều kiện | Reward coins | Reward diamonds | Reward XP |
|---|---|---:|---:|---:|
| `first_harvest` | Harvest 1 crop | 50 | 0 | 10 |
| `first_sale` | Bán tổng cộng 5 item | 100 | 0 | 20 |
| `first_build` | Place 1 Pond hoặc Coop | 100 | 0 | 20 |
| `first_egg` | Collect 1 Egg | 150 | 1 | 30 |

Quest claim một lần. Không có `Farmer's First Day`, không có tutorial reward và replay không áp dụng.

## 9. Balance sanity check

Farm mới có 1,000 coin, đủ để:

- Plant một số Rice.
- Xây Pond 200 coin.
- Xây Chicken Coop 300 coin.
- Mua feed với giá 5 coin.

Một chuỗi cơ bản có thể chơi ngay:

```text
Harvest 3 ready Rice → plant Rice → harvest sau 120s
→ sell Rice hoặc complete order_rice_3
→ level 2 → build Pond/Coop
→ mua hoặc dùng chicken_feed → collect Egg sau 600s
```

Không có bước nào phụ thuộc vào Tutorial.
QuestProgress của cả 4 quest được seed với progress 0.



