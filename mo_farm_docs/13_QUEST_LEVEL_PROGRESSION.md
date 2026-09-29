# 13 — QUEST, LEVEL & PROGRESSION

## 1. XP sources

XP nhận từ:

- Harvest theo bảng crop definition.
- Complete order theo bảng order definition.
- Collect egg: 8 XP.
- Place Pond: 20 XP.
- Place Chicken Coop: 30 XP.
- Claim quest theo bảng quest definition.

Server tính XP, không nhận XP từ client.

## 2. Canonical level curve

```ts
xpToNext(level) = 100 + (level - 1) * 60
```

Cumulative thresholds:

```text
Level 1: 0
Level 2: 100
Level 3: 260
Level 4: 480
Level 5: 760
Level 6: 1100
Level 7: 1500
Level 8: 1960
Level 9: 2480
Level 10: 3060
```

Nếu một action vượt nhiều mốc, server xử lý toàn bộ level-up trong cùng transaction và trả tất cả unlock mới.

## 3. Unlock table

| Level | Unlock |
|---:|---|
| 1 | Rice, Plot, Farmhouse, Warehouse, Build Mode |
| 2 | Carrot, Pond, Chicken Coop |
| 3 | Corn |
| 4 | Tomato |
| 5 | Roads/Decor future flag, chưa place trong MVP |
| 8 | Warehouse Upgrade future flag |
| 10 | Fishing future flag |

## 4. Quest types

```text
HARVEST_ITEM
PLANT_ITEM
SELL_ITEM
COMPLETE_ORDER
BUILD_OBJECT
FEED_ANIMAL
COLLECT_PRODUCT
REACH_LEVEL
```

Quest là secondary loop, không chặn direct entry hoặc gameplay.

## 5. MVP quests

| ID | Điều kiện | Reward |
|---|---|---|
| `first_harvest` | Harvest 1 crop | 50 coin + 10 XP |
| `first_sale` | Bán 5 item cộng dồn | 100 coin + 20 XP |
| `first_build` | Place Pond hoặc Coop | 100 coin + 20 XP |
| `first_egg` | Collect 1 Egg | 150 coin + 1 diamond + 30 XP |

Claim thủ công một lần qua `POST /api/quests/:id/claim`. Không có `Farmer's First Day`, không có Tutorial reward.

## 6. Event và transaction

MVP có thể gọi quest service trực tiếp trong transaction. Quest progress chỉ tăng sau khi mutation chính thành công.

Claim phải khóa progress row, kiểm tra `completed && !claimed`, cấp reward một lần rồi commit.

## 7. Acceptance

- Level-up/unlock cập nhật ngay sau mutation.
- XP không thể âm hoặc tự gửi từ client.
- Claim hai lần chỉ một lần thành công.
- Reload không mất progress.
- Quest không chặn người chơi vào farm.
