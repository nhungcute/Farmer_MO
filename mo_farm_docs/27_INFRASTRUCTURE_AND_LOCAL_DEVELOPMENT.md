# 27 — INFRASTRUCTURE & LOCAL DEVELOPMENT

## 1. Mục tiêu

Có hai chế độ chạy:

```text
local  = web + api + db + nginx, không cần Cloudflare
public = local stack + Named Tunnel
```

Prototype local phải chạy được khi không có Cloudflare token. Cloudflare chỉ là lớp public access, không phải dependency của gameplay hoặc test.

## 2. Compose topology

`compose.yaml` có các service chính:

```text
db
api
web
nginx
```

`cloudflared` chỉ nằm trong profile `public`. `migrate` và `seed` là one-shot profile `init`.

Network:

```text
frontend: web, nginx, cloudflared
backend: nginx, api, db
```

Quy tắc expose:

- Chỉ Nginx bind `127.0.0.1:8080:80` ở local.
- API không expose host port.
- PostgreSQL không expose host port.
- Public Cloudflare truy cập `http://nginx:80` trong Docker network.
- DB không bao giờ đi qua Internet.

## 3. Health checks

API:

```text
GET /api/health/live
GET /api/health/ready
GET /api/health
```

`live` chỉ kiểm tra process. `ready` kiểm tra database connection, migration state và content version.

Response không chứa secret:

```json
{
  "status": "ok",
  "service": "api",
  "version": "1.0.0",
  "checks": { "db": "ok", "content": "mvp-1" }
}
```

Nginx:

```text
GET /healthz
```

Healthcheck cần có interval, timeout, retries và start period rõ ràng. API chỉ start traffic sau khi DB ready.

## 4. Migration và seed

Không dùng `prisma db push` trong production-like flow.

Local development:

```powershell
pnpm prisma migrate dev
pnpm db:seed
```

Docker/init:

```powershell
docker compose --profile init run --rm migrate
docker compose --profile init run --rm seed
```

Migration public:

```powershell
pnpm prisma migrate deploy
pnpm db:seed:content
```

Seed phải idempotent và chỉ upsert content definitions:

- Crop.
- Item.
- Building.
- Animal.
- Order template.
- Quest.
- Unlock.

Seed không được ghi đè coins, inventory, crops, animals hoặc farm objects của character đã tồn tại.

Mỗi database có `schemaVersion`; content có `contentVersion = mvp-1`.

## 5. Environment contract

`.env.example` phải có:

```text
APP_ENV=local
DEMO_MODE=true
NODE_ENV=development
TZ=UTC
NODE_VERSION=22
POSTGRES_DB=mo_farm
POSTGRES_USER=mo_farm
POSTGRES_PASSWORD=change_me
DATABASE_URL=postgresql://mo_farm:change_me@db:5432/mo_farm
SESSION_SECRET=change_me_minimum_32_chars
SESSION_TTL_HOURS=168
COOKIE_SECURE=false
COOKIE_SAME_SITE=Lax
PUBLIC_ORIGIN=http://localhost:8080
TRUST_PROXY=false
LOG_LEVEL=info
VITE_API_BASE=/api
CLOUDFLARE_TUNNEL_TOKEN=
CLOUDFLARE_HOSTNAME=farm.example.com
BACKUP_DIR=./backups
```

Quy tắc:

- API validate environment khi boot và fail fast khi thiếu biến bắt buộc.
- `.env.example` không chứa secret thật.
- Public secret inject qua environment hoặc secret file có permission phù hợp.
- Không commit database password, session secret hoặc Cloudflare token.
- `DEMO_MODE=true` chỉ mô tả threat model; không bỏ qua validation.

## 6. Docker command chuẩn

Local:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose --profile init run --rm migrate
docker compose --profile init run --rm seed
```

Kiểm tra:

```powershell
Invoke-WebRequest http://localhost:8080/healthz
docker compose logs -f api nginx
```

Public:

```powershell
docker compose --profile public up -d cloudflared
```

`cloudflared` dùng Named Tunnel token đã cấp sẵn:

```text
cloudflared tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
```

Image version của Node, PostgreSQL, Nginx và cloudflared phải được pin. Không dùng `latest`.

## 7. Nginx

Routing:

```text
/        → web
/api/    → api
/healthz → nginx local health response
```

Nginx phải:

- Giữ nguyên `X-Request-ID` hoặc tạo mới.
- Không log cookie/session token.
- Có upstream timeout rõ ràng.
- Giới hạn request body.
- Thêm CSP và security headers phù hợp với Pixi canvas.
- Không expose `/prisma`, source map production hoặc internal health details.

## 8. Backup và restore

Docker volume không được coi là backup.

Tạo script:

```text
ops/backup-db.ps1
ops/backup-db.sh
ops/restore-db.ps1
ops/restore-db.sh
```

Backup dùng:

```text
pg_dump --format=custom --no-owner --no-acl
```

Tên file:

```text
mo_farm_YYYYMMDDTHHmmssZ.dump
```

Kèm SHA-256 checksum. Demo retention:

```text
7 daily + 4 weekly
```

Restore phải:

1. Dừng API.
2. Yêu cầu biến xác nhận rõ ràng.
3. `pg_restore --clean --if-exists --no-owner` vào database đích.
4. Chạy migration/health check.
5. Revoke GameSession sau restore.
6. Bootstrap thử một character.

Phải có test restore vào database tạm định kỳ.

## 9. CI

PR checks bắt buộc:

```text
pnpm install --frozen-lockfile
lint
typecheck
unit test
API integration test với PostgreSQL
prisma generate
migrate deploy trên database rỗng
seed lặp lại hai lần
web build
api build
Docker build
```

Playwright E2E là job riêng, không phụ thuộc Cloudflare Internet.

CI phải fail khi:

- Lockfile không đồng bộ.
- Schema drift.
- Seed lần hai làm thay đổi runtime state.
- Migration không chạy từ database rỗng.
- Docker image không build được.

## 10. Cloudflare Named Tunnel

Named Tunnel là acceptance riêng cho public demo:

- Domain đã quản lý trong Cloudflare.
- Hostname cố định, ví dụ `farm.example.com`.
- Token không commit và không xuất hiện trong log.
- Cloudflared chạy profile `public`.
- Cloudflared phụ thuộc Nginx healthy.
- Rebuild `web/api/nginx` không recreate tunnel.
- DB và API không có public port.

Quick Tunnel `trycloudflare.com` chỉ dùng debug tạm thời, không dùng làm acceptance stable URL.

## 11. Acceptance hạ tầng

- Local stack chạy không cần Cloudflare token.
- DB còn dữ liệu sau restart container.
- Empty database migrate thành công.
- Seed content chạy hai lần không tạo duplicate.
- API readiness chuyển từ `503` sang `200` sau khi DB sẵn sàng.
- Nginx route đúng `/` và `/api/`.
- Backup → xóa database tạm → restore → health/bootstrap thành công.
- Public Named Tunnel giữ nguyên hostname sau rebuild.
- Không lộ DB port, API port hoặc secret.
## 12. Infrastructure artifacts cần tạo ở Phase G1

```text
.nvmrc
.env.example
package.json
pnpm-lock.yaml
compose.yaml
apps/api/Dockerfile
apps/web/Dockerfile
infra/nginx/nginx.conf
infra/nginx/conf.d/default.conf
infra/cloudflared/config.yml
ops/backup-db.ps1
ops/backup-db.sh
ops/restore-db.ps1
ops/restore-db.sh
.github/workflows/ci.yml
```

`compose.yaml` dùng profiles `init` và `public`; không tạo một compose file local bắt buộc token Cloudflare. `infra/cloudflared/config.yml` không chứa token; token chỉ inject qua environment/secret.

Các artifact này là infrastructure scope của Phase G1/G7, không được để AI coder tự bỏ qua với lý do chưa có gameplay.

