# 20 — PERFORMANCE, QA & TESTING

## 1. Performance budget

MVP target:

- TTI p95 < 4 giây trên Wi-Fi tốt sau cache.
- Frame-time khoảng 16.7–20ms trên Android trung bình.
- Không memory leak khi mở/đóng Market hoặc Warehouse 50 lần.
- Không duplicate asset load.

## 2. Test devices

```text
Desktop Chrome 1920x1080
Laptop 1366x768
Android 915x412
Android 740x360
iPhone landscape tương đương
Tablet landscape
Android PWA standalone
iOS PWA standalone
```

## 3. Unit test

Game core:

- Iso transform và inverse transform.
- Build footprint/rotation.
- Crop timing.
- Chicken timing.
- Level XP.
- Economy prices.
- Name normalize.
- Inventory capacity.

Dùng fake clock để test timer, không chờ 120 hoặc 600 giây thật.

## 4. API integration test

- Enter character.
- New character transaction.
- Concurrent same-name enter.
- Plant/harvest.
- Full warehouse.
- Sell/buy.
- Complete order.
- Build pond/coop collision.
- Auto-create chicken.
- Feed/collect.
- Quest claim.
- Idempotency retry.

## 5. E2E direct-entry flows

Scenario 1:

```text
new character
→ exactly one bootstrap
→ farm visible immediately, no tutorial
→ harvest starter rice
→ plant
→ fake clock
→ harvest
→ reload
→ resume
```

Scenario 2:

```text
existing character
→ exactly one bootstrap
→ no tutorial replay because Tutorial does not exist
→ plant
→ reload
```

Scenario 3:

```text
build pond
→ reload
→ pond still exists at same grid position
```

Scenario 4:

```text
build coop
→ chicken appears
→ use starter feed
→ fake clock
→ collect egg
→ buy feed
→ feed again
```

## 6. Mobile QA

- Safe area.
- Landscape.
- Portrait overlay.
- Touch conflicts.
- Pinch.
- Scroll inside modal.
- Keyboard khi nhập tên.
- PWA standalone.
- `touch-action: none` trên canvas.
- UI button không làm pan camera.

## 7. Renderer profiling

Debug metrics:

- FPS và frame-time.
- Texture memory approximate.
- Entity count.
- Visible/cull count.
- Draw calls nếu có thể.
- Ticker listeners.
- WebGL context loss.

## 8. Network test

Throttle:

- Fast 3G.
- Offline mid-action.
- API timeout sau khi server có thể đã commit.
- 500 response.
- Session expired.

Client phải hiển thị error rõ, không tự trừ coin/item khi server chưa xác nhận và retry bằng idempotency key.

## 9. Acceptance suite

Mỗi PR lớn phải chạy:

```text
lint
typecheck
unit
api integration
build
Docker build
```

Nightly/manual:

```text
E2E direct-entry
mobile QA
performance profile
backup/restore drill
public persistent Named Tunnel smoke + actual app-redeploy isolation/fixed-origin test (authorized runtime only)
```

Canonical matrix nằm trong `28_REQUIREMENT_TRACEABILITY_AND_QA.md`.
