# MO Farm web shell

Web shell native DOM/canvas cho prototype. Giao diện vào thẳng farm, không có Tutorial bắt buộc. Renderer đọc manifest và atlas JSON/PNG sinh bởi `tools/export-assets`, dùng fallback hình học khi asset chưa tải.

## Chạy local

Từ thư mục repository:

```powershell
npm run dev:api
npm run dev:web
```

Mở `http://localhost:4173/`. Web shell mặc định gọi API cùng origin `/api`; để chạy web server riêng với API ở cổng khác, đặt `window.__MO_FARM_CONFIG__ = { apiBaseUrl: 'http://127.0.0.1:3001' }` trước `src/main.js` trong `index.html`.

Khi API không truy cập được, prototype cho phép tiếp tục bằng state local tạm thời để trình diễn; state này không thay thế dữ liệu server và sẽ mất khi xóa storage trình duyệt. Lỗi HTTP nghiệp vụ (ví dụ thiếu Xu hoặc ô đất không hợp lệ) vẫn được hiển thị nguyên trạng, không bị fallback che khuất.

## Hợp đồng tích hợp

- `POST /api/character/enter` với `{ "name": "Mỡ Ú" }` và cookie HttpOnly.
- `GET /api/game/bootstrap` tải farm sau khi enter.
- `POST /api/crops/plant` với `{ "plotId": "uuid", "cropId": "rice" }`.
- `POST /api/crops/harvest` với `{ "plotId": "uuid" }`.
- `POST /api/market/buy` với `{ "itemId": "chicken_feed", "quantity": 1 }`.
- `POST /api/animals/feed` và `/api/animals/collect` với `{ "animalId": "uuid" }`.
- `POST /api/buildings/place` với `definitionId`, `gridX`, `gridY`, `rotation`.
- `POST /api/market/sell` với `{ "itemId": "rice", "quantity": 1 }`.
- `POST /api/orders/:orderId/complete` và `POST /api/quests/:questId/claim` cho các vòng tiến trình phía server.

Mutation tự gửi `Idempotency-Key`. API là nguồn sự thật cho coin, XP, timer, inventory và unlock. Mã kỹ thuật được map thành thông báo tiếng Việt trước khi hiển thị.

## Kiểm tra nhanh

```powershell
node --check apps/web/src/main.js
node --check apps/web/server.mjs
```

## Pixi renderer integration

Web shell dynamic-imports `apps/web/src/game/integration/mountPixiFarmRenderer.js` after bootstrap. The mapper keeps API DTOs outside the Pixi scene; mutation responses update application state first, then `updateFarm` reconciles the scene by entity ID. DOM HUD remains outside the Pixi canvas.

PixiJS is pinned in the root lockfile. The buildless local server resolves it through the generated same-origin bundle:

```powershell
npm run renderer:vendor
npm run dev:web
```

The web image runs `npm ci --omit=dev`, copies `pixi.js/dist/pixi.mjs` to `apps/web/public/vendor/pixi.mjs`, then removes `node_modules`. If the vendor bundle or an atlas cannot load, the shell keeps the Canvas fallback visible and reports the condition in the console; no gameplay state is changed by the renderer.
