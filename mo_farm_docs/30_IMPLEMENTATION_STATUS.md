# Trạng thái triển khai prototype

Ngày kiểm tra: 2026-09-29. Đây là prototype/demo; dữ liệu farm không được coi là riêng tư. Người chơi vào thẳng farm bằng tên, không có Tutorial.

## Đã triển khai và đã kiểm tra

- **Nội dung và luật:** `packages/content/index.mjs` là nguồn số liệu duy nhất cho farm 24×24, 1.000 Xu, 5 kim cương, 6 ô đất, 3 lúa sẵn sàng, kho 100, thức ăn gà `chicken_feed`, giá, timer, XP, unlock, đơn hàng và nhiệm vụ.
- **API:** direct entry, session HttpOnly, bootstrap, trồng/thu hoạch, mua/bán, xây ao/chuồng, cho ăn/thu trứng, giao đơn, nhận nhiệm vụ, error envelope, request ID, timer server và `Idempotency-Key`.
- **Web:** vào chơi ngay, giao diện tiếng Việt `vi-VN`, canvas isometric 24×24, thao tác crop/build/chicken/market/order/quest, responsive mobile và orientation hint. Catalog text nằm tại `apps/web/src/locales/vi-VN.js`.
- **Animation:** 188 frame placeholder, 10 clip, 6 atlas, manifest/pivot/FPS, strict validator và preview tại `apps/web/public/assets`.
- **Vận hành:** Docker Compose với PostgreSQL/Nginx/API/web, healthcheck, migration SQL chạy được qua profile `init`, seed report hook, PWA manifest/service worker, CI, backup/restore PostgreSQL và state JSON.
- **Xác nhận:** `npm run check` đạt 9 test API; asset validation đạt 188/10; `npm run assets:build`, `docker compose config --quiet`, API/web image build và smoke flow qua Nginx đều đạt.

## Ranh giới còn lại trước production

- API hiện chạy `FarmStore` memory hoặc file JSON tùy chọn (`STATE_FILE`). PostgreSQL và `apps/api/sql/001_mvp_schema.sql` đã có để làm hạ tầng, nhưng chưa có repository PostgreSQL/Prisma runtime.
- **Web:** vào chơi ngay, giao diện tiếng Việt `vi-VN`, DOM HUD + PixiJS 8 world renderer cùng origin, Canvas fallback, canvas isometric 24×24, thao tác crop/build/chicken/market/order/quest, responsive mobile và gợi ý xoay màn hình. Catalog text nằm tại `apps/web/src/locales/vi-VN.js`.
- Hình trong asset pack vẫn là placeholder nội bộ; cần thay bằng asset đã duyệt, giữ nguyên manifest, frame count, FPS, pivot và ID.
- Cần hoàn thiện repository PostgreSQL cho toàn bộ aggregate, seed transaction, backup state volume tự động, observability và kiểm thử tải trước khi gọi là production.

## Thứ tự tiếp theo

1. Viết PostgreSQL repository cho toàn bộ aggregate, mở rộng migration/seed transaction, sau đó bật transaction/constraint trong API.
2. Chuyển web shell sang stack production hoặc giữ native shell có quyết định kiến trúc được phê duyệt; bổ sung Playwright E2E và accessibility scan.
3. Thay placeholder bằng asset duyệt, chạy lại strict validator và visual review.
4. Chạy performance/load test, kiểm tra backup restore định kỳ, rồi mới mở public tunnel.

## Cập nhật sau khi thực hiện guide PixiJS

- Đã cài `pixi.js@8.21.0`, thêm `package-lock.json`, test và kiểm tra cú pháp renderer vào `npm run check`.
- Đã tích hợp `mountPixiFarmRenderer` sau bootstrap. Mapper giữ DTO API ngoài scene; mutation cập nhật state ứng dụng rồi reconcile theo ID bằng `syncWorld`, không tạo entity trùng và không để renderer gọi API.
- Đã thêm Pixi vendor same-origin (`npm run renderer:vendor`), Docker tự tạo bundle từ lockfile và service worker cache bundle. Canvas native vẫn là fallback khi Pixi, WebGL hoặc atlas không tải được.
- Đã kiểm tra 6 trạng thái gà × 4 hướng, sự kiện `FEED_CONSUMED`, camera isometric, pan/zoom/pinch, culling, pond nhiều lớp, crop glow, hiệu ứng one-shot, DPR tối đa 2 và stress demo 1/25/50/100 gà qua test renderer.
- Trạng thái `PRODUCT_READY` và crop `ready` chỉ được suy ra từ timestamp server để hiển thị; economy, inventory, thu hoạch và thu trứng vẫn do API quyết định.
