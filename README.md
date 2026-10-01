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

Canonical E01 dùng **NAMED_TUNNEL**: fixed hostname, dedicated Cloudflare Named Tunnel, token qua native container environment và origin `http://nginx:80`. Giữ `compose.yaml` cho application, `compose.tunnel.yaml` riêng cho cloudflared và external network `mo-farm-frontend`. Task correction chỉ repository/static/build: **không start runtime, liên hệ Cloudflare hoặc public QA**. Runtime `BLOCKED_CONFIG` vì real owner environment/token/hostname chưa validate; cloudflared/Named Tunnel `NOT_STARTED`, RC01 `BLOCKED_BY_E01 / NOT_STARTED`.

Chỉ sau lệnh riêng của Project Owner và cấu hình Named Tunnel hợp lệ:

```powershell
npm run e01:tunnel:start
npm run e01:tunnel:status
npm run e01:app:update
npm run e01:app:update -- --nginx
npm run e01:tunnel:stop
```

Owner cấu hình `CLOUDFLARE_TUNNEL_TOKEN`, `CLOUDFLARE_HOSTNAME` và exact `PUBLIC_ORIGIN=https://<CLOUDFLARE_HOSTNAME>` trước startup. Token mapping là `TUNNEL_TOKEN`, không command argument hoặc log. Start reuse cloudflared đang chạy; app update chỉ recreate application services và refresh Nginx routing. Stop chỉ dừng tunnel, giữ database/game state và fixed hostname configuration. Canonical E01 không capture URL hoặc dùng generated origin/runtime URL files; không wildcard origin. Fixed hostname/PUBLIC_ORIGIN giữ nguyên qua app update. Runbook: [`E01_PERSISTENT_NAMED_TUNNEL.md`](docs/implementation/tasks/E01_PERSISTENT_NAMED_TUNNEL.md). Quick Tunnel experiment của `5c8132f` chỉ còn lịch sử SUPERSEDED / NON_CANONICAL / DEBUG EXPERIMENT.

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
