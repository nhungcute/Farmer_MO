# 10 — POND SYSTEM

## 1. Quyết định thiết kế

Không có kênh nước.

Ao là **building object**.

## 2. MVP Pond

```text
definitionId: pond_small_lv1
footprint: 2x2
category: Water
cost: 200 coin
rotation: 0 only
```

## 3. Visual

Layers:

```text
pond_base
water_surface
shore
grass
ripple
sparkle
lotus optional
```

## 4. Placement

Dùng cùng pipeline building.

Không cần:

- Water connectivity.
- Flow.
- Canal junction.
- Pump.
- Irrigation route.
- Bridge over canal.

## 5. Upgrade future

Future only:

```text
Lv1 Decorative Pond
Lv2 Fish Pond
Lv3 Fishing Pond
Lv4 Rare Fish Pond
Lv5 Duck/Lotus Pond
```

Không thay footprint khi upgrade nếu có thể để tránh collision/migration.

## 6. Fishing future

Tách module riêng:

```text
Pond
↓
Fishing interaction
↓
Fishing mini-game
↓
Fish inventory
```

Không đưa vào MVP.

## 7. Acceptance

- Xây được từ Build Mode.
- Save/load đúng.
- Animation loop nhẹ.
- Pond không can thiệp crop watering.

## 8. Canonical MVP values

```text
definitionId: pond_small_lv1_lv1
unlock level: 2
cost: 200 coin
footprint: 2x2
XP: 20
rotation: 0 only
```

Pond là decoration/building. Không watering, không canal và không fishing trong MVP.



