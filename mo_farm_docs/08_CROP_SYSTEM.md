# 08 — CROP SYSTEM

## 1. Crop definition

```ts
interface CropDefinition {
  id: string;
  name: string;
  unlockLevel: number;
  plantCost: number;
  growSeconds: number;
  harvestYield: number;
  xpReward: number;
  sellPrice: number;
  stages: number;
}
```

## 2. Canonical MVP crops

| Crop | Unlock | Grow seconds | Cost | Yield | Sell/unit | XP |
|---|---:|---:|---:|---:|---:|---:|
| Rice | 1 | 120 | 5 | 3 | 8 | 10 |
| Carrot | 2 | 240 | 8 | 3 | 14 | 14 |
| Corn | 3 | 420 | 12 | 3 | 22 | 20 |
| Tomato | 4 | 600 | 15 | 3 | 34 | 28 |

Các giá trị trên là canonical trong `25_MVP_CONTENT_DEFINITIONS.md`.

## 3. Plant

```http
POST /api/crops/plant
```

```json
{
  "plotId": "uuid",
  "cropId": "rice"
}
```

Server:

- Check plot thuộc character và đang empty.
- Check crop unlock.
- Check coin.
- Lấy `serverNow`.
- Set `plantedAt` và `readyAt = plantedAt + growSeconds`.
- Deduct plant cost trong transaction.

Client không gửi `readyAt`, `plantedAt` hoặc grow duration.

## 4. Growth

Không tick database từng giây.

```text
serverNow < readyAt → growing
serverNow >= readyAt → ready
```

Stage chỉ là hiển thị client theo ratio; server chỉ quyết định ready/harvest.

Nếu người chơi đóng app, crop vẫn lớn vì `readyAt` cố định.

## 5. Harvest

```http
POST /api/crops/harvest
```

Server lock plot và inventory, sau đó:

- Verify `readyAt <= serverNow`.
- Check warehouse capacity.
- Add yield.
- Add XP.
- Update quest progress.
- Empty plot.

Tất cả nằm trong một transaction. Hai request đồng thời chỉ có một request thành công.

## 6. Rendering

```text
0 seed
1 sprout
2 young
3 mature
4 ready
```

Ready có sparkle nhẹ. Không có timer 10 giây hoặc Tutorial override.

## 7. Acceptance

- Reload không reset timer.
- Đổi giờ máy không làm cây chín sớm.
- Harvest hai lần không duplicate item.
- Kho đầy block harvest và không làm mất crop.
