# MO Farm prototype

MO Farm là prototype/demo web game nông trại. Dữ liệu farm không được coi là riêng tư; đăng nhập chỉ dùng tên hiển thị. Người chơi vào thẳng farm, không có Tutorial.

## Chạy nhanh

Yêu cầu Node.js `22.14.0` trở lên.

```powershell
npm run check
npm run dev:api
npm run dev:web
```

API local mặc định ở `http://127.0.0.1:3001`. Web server ở `http://127.0.0.1:4173`; khi chạy hai process riêng, đặt `window.__MO_FARM_CONFIG__.apiBaseUrl` trong `apps/web/index.html` thành địa chỉ API. Web phục vụ cùng origin qua Nginx khi chạy Compose.

## Docker/Nginx

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Mặc định gateway ở `http://127.0.0.1:8080`. Nếu cổng đã được dùng, đặt `NGINX_PORT` khác trong ignored local environment. API hỗ trợ file adapter cho local compatibility và PostgreSQL persistence; E01 public demo bắt buộc PostgreSQL, Secure cookies và session/database secrets không default.

**OFFICIAL PUBLIC DEPLOYMENT: PERSISTENT_QUICK_TUNNEL** tại `https://<generated>.trycloudflare.com`, theo quyết định Project Owner ngày 2026-10-01; đây là deployment chính thức, không phải debug tooling. Không cần token, custom domain hoặc fixed hostname. `compose.yaml` quản lý application; `compose.tunnel.yaml` quản lý cloudflared riêng, dùng network `mo-farm-frontend`. **E01 DONE — PERSISTENT_QUICK_TUNNEL** sau đầy đủ Phase 1 và actual Phase 2 acceptance. Runtime tiếp tục RUNNING tại [public demo](https://francisco-ohio-camcorder-industrial.trycloudflare.com): preflight PASS, cloudflared RUNNING/CONNECTED, application healthy, exact `PUBLIC_ORIGIN` MATCH. Public/API/mobile/security/persistence và actual app-redeploy preservation đều PASS. RC01 `QUEUED / READY, NOT_STARTED`, chờ lệnh riêng của Project Owner. [Biên bản nghiệm thu và evidence](docs/implementation/tasks/E01_QUICK_TUNNEL_RUNTIME_ACCEPTANCE.md).

Các lệnh vận hành Phase 2 đã được mở theo yêu cầu tiếp tục của Project Owner:

```powershell
npm run e01:quick:start
npm run e01:quick:status
npm run e01:app:update
npm run e01:app:update -- --nginx
npm run e01:quick:stop
```

Start reuse cloudflared đang chạy; app update chỉ recreate application services và refresh Nginx routing. Stop chỉ dừng tunnel, giữ database/game state. Runtime URL và exact `PUBLIC_ORIGIN` nằm trong ignored `.runtime/`; không dùng origin wildcard. URL là ephemeral: app rebuild giữ tunnel sống để giảm đổi URL trong **SAME CLOUDFLARED LIFETIME**, không bảo đảm vĩnh viễn; restart/recreation có thể đổi URL. Named Tunnel plans remain historical and non-canonical; this release has no stable-hostname migration. Runbook và Phase-2 public QA: [`E01_PERSISTENT_QUICK_TUNNEL.md`](docs/implementation/tasks/E01_PERSISTENT_QUICK_TUNNEL.md).

## Các phần đã chạy

- Direct entry, session HttpOnly, bootstrap farm 24×24 và toàn bộ luật server cho trồng/thu hoạch, mua/bán, xây dựng, cho ăn/thu trứng, đơn hàng, nhiệm vụ.
- Web shell canvas isometric responsive, thao tác tiếng Việt, đọc manifest/atlas animation; PixiJS 8 renderer được mount sau bootstrap với Canvas fallback.
- Pixi bundle same-origin cho buildless shell: `npm run renderer:vendor`; Docker tự tạo bundle trong image và PWA cache bundle cùng asset manifest.
- 188/188 production-ready approved assets, 0 placeholder, 10 animation clip, atlas JSON/PNG và validator strict.
- Idempotency cho mutation, timer server, giới hạn kho, unlock theo cấp và state JSON tùy chọn.
- Healthcheck Docker, Nginx reverse proxy, migration/seed hooks, CI và script backup/restore.

## Kiểm tra

```powershell
npm run check
node apps/api/smoke.mjs
docker compose config --quiet
```

Các con số gameplay duy nhất nằm trong `mo_farm_docs/25_MVP_CONTENT_DEFINITIONS.md`; contract API nằm trong `mo_farm_docs/26_API_DATABASE_CONTRACTS.md`.
