# 01 — PRODUCT VISION & SCOPE

## 1. Product statement

**Mỡ Farm** là web game farm casual, thiên về thư giãn, thao tác đơn giản, đồ họa 2.5D isometric, animation nhẹ nhàng, ưu tiên trải nghiệm trên điện thoại ngang.

Phong cách:

- Sáng.
- Ấm.
- Vui vẻ.
- Nhiều cây xanh.
- Gỗ, kem, vàng, xanh lá.
- Icon rõ.
- Không gian farm giàu chi tiết nhưng HUD phải gọn.

## 2. Đối tượng chơi

- Người chơi casual.
- Session ngắn 3–15 phút.
- Có thể mở nhiều lần/ngày.
- Không yêu cầu tạo tài khoản.
- Dễ dùng trên mobile.

## 3. Core loop

```text
Trồng → Chờ → Thu hoạch → Cất kho → Bán/Đơn hàng
        → Nhận Coin/XP → Mở khóa → Xây dựng → Lặp lại
```

## 4. Secondary loops

### Animal

```text
Xây chuồng → Nuôi → Cho ăn → Chờ → Thu sản phẩm
```

### Building

```text
Kiếm coin/material → Xây → Nâng cấp → Tăng khả năng farm
```

### Quest

```text
Nhiệm vụ → Hành động → Claim → Reward → Unlock
```

### Pond

MVP:

```text
Xây → trang trí farm → animation
```

Future:

```text
Upgrade → Fish → Fishing → Rare rewards
```

## 5. Scope MVP

Có:

- Character name login.
- One farm map.
- Isometric renderer.
- Camera pan/zoom.
- Crops.
- Warehouse.
- Inventory.
- Market.
- Orders.
- XP/level.
- Build mode.
- Pond.
- Chicken.
- Quest.
- PWA.
- Docker.
- Persistent Cloudflare Quick Tunnel cho demo, lifecycle riêng; URL ephemeral, preservation scope SAME CLOUDFLARED LIFETIME. Named Tunnel plans are historical/non-canonical and are not an E01 release path; any stable-hostname migration requires a new Project Owner decision.

Không có trong MVP:

- Multiplayer realtime.
- Guild.
- Chat.
- PvP.
- Trading giữa người chơi.
- OAuth.
- Payment.
- Seasonal events.
- Fishing gameplay đầy đủ.
- Weather simulation phức tạp.
- Day/night dynamic lighting đầy đủ.

## 6. UX principle

Người chơi phải có thể hiểu nút chính trong 1–2 giây.

Không dùng text nhỏ hoặc panel chiếm quá nhiều màn hình.

Game world phải luôn chiếm phần lớn viewport.

## 7. Initial farm

Gợi ý:

- Farmhouse: 1.
- Warehouse: 1.
- Plot: 6.
- Trees/decor: 10 fixed starter objects.
- Pond: chưa có; người chơi tự xây sau khi đạt Level 2 với giá 200 coin.
- Chicken coop: chưa có; người chơi tự xây sau khi đạt Level 2 với giá 300 coin; build thành công tự tạo 1 chicken.
- Coin: 1,000.
- Diamond: 5.
- Warehouse capacity: 100.
- Crop unlocked: Rice.
- Starter feed: 1 `chicken_feed`; mua thêm trong Market với giá 5 coin/unit.

## 8. Naming

Tên hiển thị trong code nên thống nhất tiếng Anh để dễ maintain:

```text
Character
Farm
Plot
Crop
Building
Pond
Animal
Inventory
Warehouse
Market
Order
Quest
Onboarding hint
```

UI có thể hiển thị tiếng Việt.

## 9. KPI kỹ thuật MVP

- Time to interactive sau bootstrap: mục tiêu < 4 giây trên Wi-Fi tốt sau cache.
- Initial app shell nhỏ.
- Asset load theo nhóm.
- 50–60 FPS trên Android trung bình ở farm MVP.
- Không bootstrap hai lần.
- Không full reload giữa các màn gameplay.


## 10. Canonical amendment

MVP không có Tutorial bắt buộc. Direct entry và bảng số liệu canonical nằm trong `24_DECISIONS_AND_PROTOTYPE_SCOPE.md` và `25_MVP_CONTENT_DEFINITIONS.md`.



