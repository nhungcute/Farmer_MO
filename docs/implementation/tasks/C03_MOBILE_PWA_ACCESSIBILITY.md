# C03 — Mobile/PWA/accessibility QA

| Trường | Giá trị |
|---|---|
| ID | C03 |
| Tên | Mobile, PWA và accessibility QA |
| Trạng thái | DONE |
| Owner | QA / Web integration |
| Phụ thuộc | C01 DONE + C02 DONE |
| Đường dẫn sở hữu | `tests/e2e/c03-mobile-pwa.spec.mjs`, `playwright.config.mjs`, `apps/web/src/styles.css`, `apps/web/src/main.js` (accessibility markup only) |
| Đường dẫn cấm sửa | gameplay, API contract, content/economy definitions, Renderer, Animation, Asset pipeline, Tutorial, PostgreSQL runtime, Cloudflare |
| Bắt đầu | 2026-09-30 |
| Kết thúc | 2026-09-30 |
| Hoạt động hiện tại | DONE — parent review hoàn tất; mobile/PWA/a11y evidence và remote CI đã PASS |
| Hoạt động gần nhất | Thêm project `mobile-pwa` với service worker được phép; kiểm tra orientation, touch gesture boundary, PWA cache, keyboard semantics và contrast |
| Hoạt động tiếp theo | Maintenance only; E01 remains gated by B02 and release dependencies |

## Mục tiêu

Xác minh người chơi vào thẳng farm bằng giao diện tiếng Việt trên viewport mobile, không có Tutorial, giữ bố cục an toàn theo portrait/landscape, có PWA shell/service worker hoạt động và các điều khiển chính dùng được với bàn phím, trình đọc màn hình và thao tác touch.

## Checklist

- [x] Có project Playwright `mobile-pwa` riêng với `serviceWorkers: allow`; C01/C02 vẫn giữ network deterministic.
- [x] Direct entry trên mobile không tạo Tutorial; portrait hiển thị hướng dẫn xoay, landscape ẩn hướng dẫn.
- [x] Canvas renderer surface có `touch-action: none`, có vùng hiển thị hợp lệ và gesture pointer không làm page scroll.
- [x] Pan/pinch input boundary được kiểm tra ở browser; camera math tiếp tục được kiểm tra bằng renderer unit tests hiện có.
- [x] Không có horizontal overflow hoặc vertical overflow sau khi chuyển portrait → landscape tại viewport acceptance 740×360; game grid dùng `100svh`/`minmax(0, 1fr)` để canvas không kéo dài viewport.
- [x] Các nút điều khiển người dùng nhìn thấy có kích thước tối thiểu 44×44 CSS px.
- [x] Manifest có `lang=vi-VN`, `display=standalone`, `orientation=any`, `start_url`, `scope` và content type đúng; service worker đăng ký, activate và tạo cache `mo-farm-static-v2`.
- [x] Cache kh?ng ch?a response `/api/` cho API read ho?c gameplay mutation; server state v? idempotency lu?n l? ngu?n authoritative.
- [x] Label input, focus ring, button name/type, toolbar/canvas ARIA label, orientation live status và contrast tối thiểu 4.5:1 được kiểm tra.

## Bằng chứng kiểm thử

Lệnh C03 riêng:

```powershell
npm run e2e -- --reporter=line tests/e2e/c03-mobile-pwa.spec.mjs --project=mobile-pwa
```

Kết quả ngày 2026-09-30: **3 passed, 0 failed**. Remote CI runs 36660295559 và 36662455574 đều PASS C03 mobile-pwa 3/3.

Aggregate Playwright:

```powershell
npm run e2e -- --reporter=line
```

Kết quả: **8 passed, 19 intentionally skipped, 0 failed** trên ba project (`chromium`, `mobile-chromium`, `mobile-pwa`). Các skip là do test suite giới hạn project hoặc C02 PostgreSQL opt-in; không được tính là pass ngầm. Remote CI runs 36660295559 và 36662455574 đều PASS browser gate.

## Thay đổi tối thiểu

- `playwright.config.mjs`: thêm project `mobile-pwa`, chỉ project này cho phép service worker.
- `apps/web/src/styles.css`: giữ game đúng chiều cao viewport bằng `100svh` và `minmax(0, 1fr)`, ngăn canvas intrinsic size kéo body dài; nút/input tối thiểu 44 px.
- `apps/web/src/main.js`: đánh dấu overlay yêu cầu xoay bằng `role="status"` và `aria-live="polite"`.
- `tests/e2e/c03-mobile-pwa.spec.mjs`: thêm ba browser checks cho mobile layout/touch, manifest/service worker và keyboard/ARIA/contrast.

Không thay đổi gameplay, API response, Renderer/Animation/Asset pipeline, content/economy definitions hoặc Tutorial.

## Blocker

Không có blocker kỹ thuật cho C03. Production artwork vẫn là phạm vi B02 và chưa được tự thay placeholder. C03 không mở Cloudflare; E01 vẫn phụ thuộc các gate upstream.

- Parent review evidence: GitHub Actions runs 36660295559 and 36662455574 completed all five jobs successfully.
- End time: 2026-09-30 (DONE after parent review)
