# Trạng thái triển khai prototype

> Điều phối Release Candidate: checklist chi tiết và dependency graph nằm tại [`docs/implementation/IMPLEMENTATION_STATUS.md`](../docs/implementation/IMPLEMENTATION_STATUS.md) và [`docs/implementation/TASK_DEPENDENCIES.md`](../docs/implementation/TASK_DEPENDENCIES.md). A01/B01/C01/D01/A02/A03/C02/C03/D02 và B02 đã DONE. Canonical E01 là NAMED_TUNNEL, runtime BLOCKED_CONFIG; cloudflared và Named Tunnel NOT_STARTED. RC01 BLOCKED_BY_E01 / NOT_STARTED.

Sau checkpoint A01/B01/C01/D01, A02 đã review 8/8; A03, C02, C03 và D02 đã có bằng chứng test runtime. B02 đã nhận owner content/license/release approval cho toàn bộ Wave 2: tổng 188/188 production_ready, 188/188 approved, 0 placeholders. Local compatibility vẫn hỗ trợ `PERSISTENCE_DRIVER=file`; public E01 bắt buộc PostgreSQL và không downgrade security.

Ngày cập nhật trạng thái: 2026-10-01; runtime baseline checks bên dưới được ghi tại checkpoint 2026-09-30. Đây là prototype/demo; dữ liệu farm không được coi là riêng tư. Người chơi vào thẳng farm bằng tên, không có Tutorial.

E01 correction chỉ repository/static/build; không start runtime, liên hệ Cloudflare hoặc public QA. Runtime BLOCKED_CONFIG vì real owner environment/token/hostname chưa validate. Application Compose và tunnel Compose giữ lifecycle riêng; Named Tunnel dùng fixed hostname/token và exact fixed PUBLIC_ORIGIN trước startup, ingress http://nginx:80. Chờ Project Owner cấu hình và yêu cầu actual runtime/public/mobile/security/persistence/update-isolation QA. Runbook: [`E01_PERSISTENT_NAMED_TUNNEL.md`](../docs/implementation/tasks/E01_PERSISTENT_NAMED_TUNNEL.md). Quick Tunnel `5c8132f` giữ historical/debug-only, không current release path.

## Đã triển khai và đã kiểm tra

- **Nội dung và luật:** `packages/content/index.mjs` là nguồn số liệu duy nhất cho farm 24×24, 1.000 Xu, 5 kim cương, 6 ô đất, 3 lúa sẵn sàng, kho 100, thức ăn gà `chicken_feed`, giá, timer, XP, unlock, đơn hàng và nhiệm vụ.
- **API:** direct entry, session HttpOnly, bootstrap, trồng/thu hoạch, mua/bán, xây ao/chuồng, cho ăn/thu trứng, giao đơn, nhận nhiệm vụ, error envelope, request ID, timer server và `Idempotency-Key`.
- **Web:** vào chơi ngay, giao diện tiếng Việt `vi-VN`, canvas isometric 24×24, thao tác crop/build/chicken/market/order/quest, responsive mobile và orientation hint. Catalog text nằm tại `apps/web/src/locales/vi-VN.js`.
- **Animation:** 188 production frames, 10 clip, 6 atlas, manifest/pivot/FPS, strict validator và preview tại `apps/web/public/assets`.
- **Vận hành:** Docker Compose với PostgreSQL/Nginx/API/web, healthcheck, migration SQL chạy được qua profile `init`, seed report hook, PWA manifest/service worker, CI, backup/restore PostgreSQL và state JSON.
- **Xác nhận:** `npm run check` PASS (API 17/17), `npm run test:api:postgres` PASS 20/20 (14 integration + 6 repository khi có PostgreSQL), asset 188/10; `docker compose config --quiet`, API/Web build, migration và PostgreSQL smoke PASS.

## Ranh giới còn lại trước production

- API đã hỗ trợ rõ `PERSISTENCE_DRIVER=file|postgres`; file JSON FarmStore vẫn là mặc định demo, PostgreSQL runtime đã chạy enter/session/bootstrap và tất cả mutation qua repository transaction.
- **Web:** vào chơi ngay, giao diện tiếng Việt `vi-VN`, DOM HUD + PixiJS 8 world renderer cùng origin, Canvas fallback, canvas isometric 24×24, thao tác crop/build/chicken/market/order/quest, responsive mobile và gợi ý xoay màn hình. Catalog text nằm tại `apps/web/src/locales/vi-VN.js`.
- Asset pack có 188/188 asset `production_ready` và `approved`, gồm 112 Wave 1 + 76 Wave 2; content/license/release approval đã ghi nhận.
- A02, A03, C02, C03, D02 và B02 đã DONE; E01 runtime/public QA và actual app-redeploy URL preservation còn pending. Không suy ra runtime PASS từ Phase-1 static checks.

## Thứ tự tiếp theo

1. Hoàn tất Named Tunnel correction static regression và audit `5c8132f`; giữ cloudflared/Named Tunnel NOT_STARTED.
2. Project Owner cung cấp ignored local Named Tunnel token, fixed hostname và demo/PostgreSQL configuration; rerun preflight, chờ runtime instruction.
3. Actual authorized runtime: public/browser/mobile/security/persistence QA và app redeploy giữ cloudflared container/process cùng fixed PUBLIC_ORIGIN.
4. Khi E01 DONE, chỉ chuyển RC01 QUEUED / READY và chờ Project Owner; tiếp tục backup/restore định kỳ và giữ asset/renderer/animation contracts đã duyệt.

## Cập nhật sau khi thực hiện guide PixiJS

- Đã cài `pixi.js@8.21.0`, thêm `package-lock.json`, test và kiểm tra cú pháp renderer vào `npm run check`.
- Đã tích hợp `mountPixiFarmRenderer` sau bootstrap. Mapper giữ DTO API ngoài scene; mutation cập nhật state ứng dụng rồi reconcile theo ID bằng `syncWorld`, không tạo entity trùng và không để renderer gọi API.
- Đã thêm Pixi vendor same-origin (`npm run renderer:vendor`), Docker tự tạo bundle từ lockfile và service worker cache bundle. Canvas native vẫn là fallback khi Pixi, WebGL hoặc atlas không tải được.
- Đã kiểm tra 6 trạng thái gà × 4 hướng, sự kiện `FEED_CONSUMED`, camera isometric, pan/zoom/pinch, culling, pond nhiều lớp, crop glow, hiệu ứng one-shot, DPR tối đa 2 và stress demo 1/25/50/100 gà qua test renderer.
- Trạng thái `PRODUCT_READY` và crop `ready` chỉ được suy ra từ timestamp server để hiển thị; economy, inventory, thu hoạch và thu trứng vẫn do API quyết định.
