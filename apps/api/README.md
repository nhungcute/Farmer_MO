# MO Farm API

Prototype direct-entry API chạy bằng Node.js built-in HTTP server, không yêu cầu package ngoài. Adapter `FarmStore` giữ state trong memory khi chạy local; khi đặt `STATE_FILE`, state được ghi JSON atomic để Compose có thể giữ demo state qua lần restart. PostgreSQL và schema tham chiếu đã có trong Compose/`apps/api/sql`, nhưng chưa phải adapter runtime production.

## Chạy

Từ thư mục repository:

```text
node apps/api/src/server.mjs
node --test apps/api/test/api.test.mjs
```

Áp dụng schema tham chiếu cho PostgreSQL Compose:

```powershell
docker compose up -d db
docker compose --profile init run --rm migrate
```

Lệnh trên chạy `apps/api/sql/001_mvp_schema.sql`; file `src/migrate.mjs` vẫn là hook report cho môi trường không có client PostgreSQL.

Server mặc định lắng nghe `127.0.0.1:3001`. Có thể cấu hình `PORT`, `HOST`, `APP_ENV` (`local` hoặc `demo`) và `PUBLIC_ORIGIN`.

## Contract đã triển khai

- `GET /api/health/live`, `GET /api/health/ready`
- `POST /api/character/enter`, `GET /api/game/bootstrap`
- `POST /api/crops/plant`, `POST /api/crops/harvest`
- `POST /api/buildings/place`
- `POST /api/animals/feed`, `POST /api/animals/collect`
- `POST /api/market/buy`, `POST /api/market/sell`
- `POST /api/orders/:orderId/complete`
- `POST /api/quests/:questId/claim`

Mutation bắt buộc `Idempotency-Key`; giá, XP, thời điểm chín và phần thưởng luôn do module content phía server quyết định. Cookie session là HttpOnly, token thô không được đưa vào response hoặc log. Đây là prototype non-private, name-only login theo đặc tả.

## Giới hạn prototype

State chỉ bền khi cấu hình `STATE_FILE`; file JSON này không có khóa phân tán và chưa phải persistence production. Các mutation được gom trong một hàm store đồng bộ để mô phỏng transaction atomic; adapter PostgreSQL/Prisma sẽ thay lớp store khi triển khai G1 persistence. Dữ liệu farm của prototype được coi là không riêng tư theo phạm vi đã chốt.
