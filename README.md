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

Mặc định gateway ở `http://127.0.0.1:8080`. Nếu cổng đã được dùng, chạy với biến môi trường khác, ví dụ `$env:NGINX_PORT='18080'`. API trong Compose dùng file adapter tại volume `/data`; PostgreSQL và schema tham chiếu đã được dựng cho bước persistence tiếp theo, nhưng runtime prototype chưa kết nối trực tiếp vào PostgreSQL.

Profile public chỉ chạy sau khi đặt `CLOUDFLARE_TUNNEL_TOKEN`; không bật profile này cho local demo nếu chưa có token.

## Các phần đã chạy

- Direct entry, session HttpOnly, bootstrap farm 24×24 và toàn bộ luật server cho trồng/thu hoạch, mua/bán, xây dựng, cho ăn/thu trứng, đơn hàng, nhiệm vụ.
- Web shell canvas isometric responsive, thao tác tiếng Việt, đọc manifest/atlas animation; PixiJS 8 renderer được mount sau bootstrap với Canvas fallback.
- Pixi bundle same-origin cho buildless shell: `npm run renderer:vendor`; Docker tự tạo bundle trong image và PWA cache bundle cùng asset manifest.
- 188 frame PNG placeholder, 10 animation clip, atlas JSON/PNG và validator strict.
- Idempotency cho mutation, timer server, giới hạn kho, unlock theo cấp và state JSON tùy chọn.
- Healthcheck Docker, Nginx reverse proxy, migration/seed hooks, CI và script backup/restore.

## Kiểm tra

```powershell
npm run check
node apps/api/smoke.mjs
docker compose config --quiet
```

Các con số gameplay duy nhất nằm trong `mo_farm_docs/25_MVP_CONTENT_DEFINITIONS.md`; contract API nằm trong `mo_farm_docs/26_API_DATABASE_CONTRACTS.md`.
