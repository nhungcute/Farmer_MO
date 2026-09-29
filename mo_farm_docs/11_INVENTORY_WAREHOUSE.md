# 11 — INVENTORY & WAREHOUSE

## 1. Concept

Inventory là dữ liệu item quantity của character.

Warehouse là capability/storage UI.

Có thể dùng cùng một bảng item quantity, Warehouse giữ `capacity`.

## 2. Item categories

```text
Crops
Materials
Animal Goods
Tools
Special
```

## 3. Capacity

Cách đơn giản MVP:

```text
1 item unit = 1 capacity
```

Used capacity:

```sql
SUM(quantity)
```

Có thể optimize bằng cached counter sau.

## 4. Overflow

Khi harvest mà kho đầy:

MVP nên block harvest và hiển thị:

```text
Kho đã đầy!
Hãy bán bớt hoặc nâng cấp Kho.
```

Không để item rơi mất.

## 5. Warehouse UI

Header:

```text
Warehouse Level 1
78 / 100
```

Tabs:

```text
All | Crops | Materials | Animal Goods | Tools
```

Grid item card:

- Icon.
- Name.
- Quantity.

## 6. Upgrade

Future only:

```text
Lv1 100
Lv2 160
Lv3 240
```

Need coin/material.

## 7. Inventory API

Bootstrap đã trả inventory.

Sau mỗi action response trả inventory delta:

```json
{
  "inventoryDelta": [
    { "itemId": "rice", "delta": 3, "newQuantity": 18 }
  ]
}
```

Không refetch toàn kho sau mỗi hành động.

## 8. Acceptance

- Capacity đúng sau reload.
- Harvest block khi full.
- UI update theo delta.

