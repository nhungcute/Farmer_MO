# 28 — REQUIREMENT TRACEABILITY & QA

## 1. Quy tắc QA

MVP không có Tutorial. Mọi acceptance phải kiểm tra direct entry và gameplay loop.

Mỗi feature phải có:

- Unit test.
- Server validation test.
- Persistence/reload test.
- Error state test.
- Mobile interaction check nếu có UI.
- Idempotency/concurrency test nếu là mutation.

## 2. Requirement traceability

| ID | Yêu cầu | Kiểm tra |
|---|---|---|
| AUTH-01 | Nhập tên tạo hoặc load character | API integration + E2E direct entry |
| AUTH-02 | Name normalization NFC/casefold/space | Unit/property test |
| AUTH-03 | Hai request cùng tên không tạo duplicate | Concurrent API test |
| AUTH-04 | Session HttpOnly, expiry, revoke | API security test |
| AUTH-05 | Prototype non-private được ghi rõ | Docs review + public warning |
| BOOT-01 | Một bootstrap sau enter | Playwright request count = 1 |
| BOOT-02 | Reload resume đúng state | E2E reload |
| FARM-01 | Grid 24x24 và starter layout đúng | Seed/integration test |
| FARM-02 | Grid coordinate, không lưu screen coordinate | Schema/code review |
| CROP-01 | Plant server-authoritative | API integration |
| CROP-02 | Timer không phụ thuộc client clock | Fake clock + API test |
| CROP-03 | Double harvest không dupe | Concurrent API test |
| CROP-04 | Full warehouse chặn harvest | API + UI test |
| ECON-01 | Sell dùng server price | Tampered payload test |
| ECON-02 | Buy được chicken_feed | API integration |
| ECON-03 | Order atomic và retry-safe | Idempotency/concurrency test |
| PROG-01 | XP/level/unlock đúng bảng definitions | Unit + integration |
| BUILD-01 | Footprint collision server-side | Geometry/property test |
| BUILD-02 | Pond save/load đúng | E2E reload |
| ANIMAL-01 | Coop tạo đúng một chicken | Integration |
| ANIMAL-02 | Feed tiêu hao đúng feed item | Integration |
| ANIMAL-03 | Feed/collect timer dùng server time | Fake clock |
| ANIMAL-04 | Full warehouse chặn collect | API + UI |
| ANIM-01 | Source frame, manifest và atlas khớp | Asset validator + CI |
| ANIM-02 | Rice stage/ready glow/harvest effect mapping đúng | Renderer integration |
| ANIM-03 | Pond water/ripple/sparkle đúng FPS và loop | Visual preview + renderer |
| ANIM-04 | Chicken 4 hướng và state fallback | Renderer integration |
| ANIM-05 | Anchor/depth không rung giữa frame | Debug grid + visual QA |
| ANIM-06 | Atlas không thiếu frame, không duplicate, không vượt 2048 | Asset CI |
| ANIM-07 | Shared ticker/culling không tạo RAF theo entity | Profiling/code review |
| ANIM-08 | Reduced motion/static fallback hoạt động | Mobile/accessibility QA |
| ANIM-09 | Source/license/placeholder metadata đầy đủ | Asset review |
| LANG-01 | Toàn bộ text user-facing là tiếng Việt có dấu | Localization catalog review |
| LANG-02 | Error code/technical ID được map sang tiếng Việt | UI/API error test |
| LANG-03 | Number/date/currency dùng `vi-VN` | Locale unit test |
| LANG-04 | aria-label/title/alt text là tiếng Việt | Accessibility scan |
| LANG-05 | Không còn localization key thiếu hoặc English fallback | CI localization check |
| UI-01 | Farm world chỉ render trong Pixi canvas | Code review + smoke test |
| UI-02 | React chỉ render HUD/modal/menu/hint | Code review |
| UI-03 | Touch target tối thiểu 44px | Mobile QA |
| UI-04 | Portrait hiện rotate overlay | Playwright viewport |
| PWA-01 | Standalone mở và load app shell | Playwright/PWA QA |
| PWA-02 | API mutation không bị cache | Service worker test |
| INFRA-01 | Local Docker chạy không Cloudflare | Compose smoke test |
| INFRA-02 | Migration/seed repeatable | CI database job |
| INFRA-03 | DB không public | Compose/network inspection |
| INFRA-04 | Backup/restore thành công | Restore drill |
| INFRA-05 | Persistent Quick Tunnel giữ container/process và URL khi app rebuild trong SAME CLOUDFLARED LIFETIME | Phase-2 actual redeploy + public smoke; so sánh ID/StartedAt/RestartCount/URL |
| INFRA-06 | PUBLIC_ORIGIN exact current HTTPS trycloudflare origin, không wildcard | Strict URL parser tests + Phase-2 Origin/cookie QA |
| INFRA-07 | Tunnel/application lifecycle riêng; stop tunnel không xóa DB/state | Compose/static isolation tests + Phase-2 persistence/stop evidence |
| PERF-01 | TTI dưới 4 giây Wi-Fi tốt sau cache | Lighthouse/trace |
| PERF-02 | FPS/frame-time trên Android trung bình | Device profile |
| PERF-03 | Không tăng memory khi mở modal 50 lần | Browser memory test |
| QA-01 | No console error trong smoke flows | Playwright console listener |
| QA-02 | Error/timeout/offline recovery rõ ràng | Network throttling |

## 3. Test framework và môi trường

- Vitest: game-core, normalize, economy, geometry, progression.
- Fastify inject + PostgreSQL test database: API integration.
- Playwright: direct entry, plant/harvest, market, order, build, animal, reload.
- Fake clock: crop và chicken không chờ thời gian thật.
- Docker Compose: migration, seed, health và routing.
- Không dùng Cloudflare cho unit/API/E2E CI.

E01 Phase 1 chỉ repository/static/build verification, không start container hoặc tạo public URL. Public acceptance chỉ ghi PASS sau Phase 2 thực tế: HTTPS enter/bootstrap/session/refresh/idempotent mutation, 188 approved assets, mobile 932×430/915×412/844×390/740×360, restricted static paths, cookie/security headers, bounded rate limit và farm persistence. Quick Tunnel URL vẫn ephemeral; không cố ý restart cloudflared để thử rotation. Runbook: [`E01_PERSISTENT_QUICK_TUNNEL.md`](../docs/implementation/tasks/E01_PERSISTENT_QUICK_TUNNEL.md).

## 4. Bắt buộc test race và retry

```text
enter cùng lookupName đồng thời
harvest cùng plot đồng thời
sell cùng inventory đồng thời
complete order cùng orderId đồng thời
place building chồng footprint đồng thời
feed cùng chicken đồng thời
collect cùng chicken đồng thời
request timeout sau khi server commit rồi retry
Idempotency-Key dùng lại với payload khác
```

## 5. Thiết bị mobile

Smoke test ít nhất:

```text
Desktop Chrome 1920x1080
Laptop 1366x768
Android Chrome 915x412
Android Chrome 740x360
iPhone Safari landscape tương đương
Android PWA standalone
iOS PWA standalone
```

Kiểm tra:

- Pan một ngón.
- Pinch zoom.
- Modal scroll.
- Safe area/notch.
- Keyboard nhập tên.
- Canvas không browser-zoom.
- Portrait overlay.
- Nút không làm camera pan.

Animation QA:

- Kiểm tra loop seam và frame order bằng preview sheet.
- Kiểm tra anchor trên debug grid ở zoom 0.65, 1.0 và 1.5.
- Kiểm tra missing-frame fallback khi atlas load lỗi.
- Kiểm tra `prefers-reduced-motion` dùng static/short effect.
- Kiểm tra texture memory và frame-time với chicken/pond/crop cùng lúc.

Language QA:

- Quét DOM sau mỗi E2E flow để phát hiện English fallback hoặc localization key chưa resolve.
- Kiểm tra các trạng thái lỗi, loading, offline, retry, modal và portrait overlay.
- Kiểm tra `aria-label`, `title`, `alt` và keyboard focus bằng tiếng Việt.
- Kiểm tra format số, thời gian và currency với locale `vi-VN`.

## 6. Performance budget

MVP phải đo và lưu kết quả:

- TTI p50/p95.
- Frame-time p50/p95.
- FPS trung bình và 1% low.
- Texture memory gần đúng.
- Visible/cull entity count.
- Draw calls nếu thiết bị cho phép.
- Memory trước/sau 50 lần mở đóng Warehouse.

Mục tiêu ban đầu:

```text
TTI p95 < 4s trên Wi-Fi tốt sau cache
Frame-time ổn định khoảng 16.7–20ms trên Android trung bình
Không tăng memory liên tục sau modal/scene reload test
```

## 7. Direct entry acceptance flow

```text
mở PWA
→ portrait thì hiện rotate overlay
→ landscape nhập tên
→ character enter
→ đúng một bootstrap
→ farm hiển thị ngay, không tutorial
→ harvest 3 Rice ban đầu
→ plant Rice
→ fake clock đến ready
→ harvest
→ sell hoặc complete order
→ level 2
→ build Pond hoặc Coop
→ mua/dùng chicken_feed
→ fake clock đến ready
→ collect Egg
→ reload
→ state vẫn đúng
```
