# 27 — INFRASTRUCTURE & LOCAL DEVELOPMENT

## 1. Mục tiêu

Có hai chế độ chạy:

```text
local  = web + api + db + nginx, không cần Cloudflare
public = local stack + persistent Named Tunnel (separate Compose lifecycle)
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

`cloudflared` chỉ nằm trong `compose.tunnel.yaml`, project `mo-farm-tunnel`; không nằm trong application Compose. `migrate` và `seed` là one-shot profile `init` của application project `mo-farm`.

Network:

```text
frontend (mo-farm-frontend): web, api, nginx + external cloudflared
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
PERSISTENCE_DRIVER=file
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
CLOUDFLARE_HOSTNAME=
BACKUP_DIR=./backups
```

Quy tắc:

- API validate environment khi boot và fail fast khi thiếu biến bắt buộc.
- `.env.example` không chứa secret thật.
- Public secret inject qua environment hoặc secret file có permission phù hợp.
- Không commit database password, session secret, tunnel token hoặc ignored lock metadata `.runtime/`.
- `DEMO_MODE=true` chỉ mô tả threat model; không bỏ qua validation.

Đây là ví dụ local, không phải public preflight configuration. Canonical E01 dùng **NAMED_TUNNEL**, bắt buộc `PERSISTENCE_DRIVER=postgres`, `APP_ENV=demo`, `COOKIE_SECURE=true`, session secret tối thiểu 32 ký tự và PostgreSQL password tối thiểu 16 ký tự, không default/placeholder; `DATABASE_URL` hợp lệ dùng PostgreSQL nội bộ. Owner cung cấp `CLOUDFLARE_TUNNEL_TOKEN`, fixed `CLOUDFLARE_HOSTNAME` và `PUBLIC_ORIGIN=https://<CLOUDFLARE_HOSTNAME>` trước startup. Host của PUBLIC_ORIGIN phải khớp exact hostname; reject localhost/IP/HTTP/trycloudflare và wildcard origin. Không capture URL, không bootstrap/generated PUBLIC_ORIGIN và không phụ thuộc Quick Tunnel runtime files.

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

Public demo (future runtime, chỉ sau lệnh riêng của Project Owner; task correction hiện tại không start container/tunnel hoặc liên hệ Cloudflare):

```powershell
npm run e01:preflight
npm run e01:tunnel:start
npm run e01:tunnel:status
npm run e01:app:update
npm run e01:app:update -- --nginx
npm run e01:tunnel:stop
```

`cloudflared` dùng Named Tunnel và native environment token transport, không có token trong command arguments:

```text
cloudflared tunnel --no-autoupdate run
TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
```

Image version của Node, PostgreSQL, Nginx và cloudflared phải được pin. Không dùng `latest`.

Start lần hai reuse Named Tunnel đang chạy, không recreate tunnel. App update chỉ build/recreate `api/web`, refresh Nginx upstream DNS, và tùy chọn recreate Nginx qua `--nginx`; không dùng `docker compose down` trên tunnel stack. Stop chỉ dừng cloudflared, giữ fixed hostname configuration và database volume; không đánh dấu một generated URL stale. Chi tiết: [`E01_PERSISTENT_NAMED_TUNNEL.md`](../docs/implementation/tasks/E01_PERSISTENT_NAMED_TUNNEL.md).

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

## 10. Persistent Cloudflare Named Tunnel

Project Owner xác nhận canonical E01 là **NAMED_TUNNEL**, dedicated tunnel với fixed hostname, token và published route `http://nginx:80`. Giữ lifecycle isolation từ `5c8132f`: application Compose quản lý `mo-farm-frontend`; tunnel Compose dùng network `external: true`, image `cloudflare/cloudflared:2025.9.1`, `restart: unless-stopped`, log rotation giới hạn, không build hoặc dependency lifecycle vào app.

`infra/cloudflared/named-tunnel-contract.json` là canonical contract, `quickTunnelAllowed=false`. Container chỉ nhận token qua `TUNNEL_TOKEN` mapping từ ignored owner `CLOUDFLARE_TUNNEL_TOKEN`; không command token, không `--url`, không generated origin. PUBLIC_ORIGIN được cấu hình exact fixed HTTPS trước startup và không đổi sau update.

Start script chờ internal app readiness và kiểm tra Named Tunnel đang chạy trước khi start/reuse. `TUNNEL_METRICS=0.0.0.0:2000` chỉ nội bộ, không publish host port. Read-only status dùng Node trong API hoặc web đang chạy để probe `http://cloudflared:2000/ready` qua shared network, độc lập với Nginx health: HTTP 200 CONNECTED, 503 DISCONNECTED; nếu không có probe container hoặc endpoint không truy cập được thì UNVERIFIED. Status không gọi public hostname/Cloudflare và không suy ra connection chỉ từ process RUNNING, log cũ hoặc local token missing/changed. `tunnelConfiguration` MATCH/MISMATCH được báo riêng; runtime start phải chờ verified CONNECTED.

App update so sánh container ID, StartedAt, RestartCount và configured fixed PUBLIC_ORIGIN trước/sau; unexpected restart/recreation/origin drift báo `TUNNEL_LIFECYCLE_REGRESSION`. Nginx có thể downtime tạm thời trong update; cloudflared vẫn sống trong lúc sửa app. Named hostname giữ cố định cả khi cloudflared restart nếu owner route giữ nguyên; connectivity availability là gate riêng.

Canonical E01 không phụ thuộc `.runtime/quick-tunnel.json`, `.runtime/quick-tunnel.env` hoặc captured trycloudflare URL. `.runtime/named-tunnel.lock/owner.json` chỉ là exclusive lock metadata PID/createdAt, không secret/generated config. Quick Tunnel runbook của `5c8132f` được giữ SUPERSEDED / NON_CANONICAL / DEBUG EXPERIMENT; không thỏa E01 release preflight.

Task correction chỉ repository/static/build, không start runtime hoặc liên hệ Cloudflare. E01 runtime hiện BLOCKED_CONFIG vì real owner environment/token/hostname chưa validate; cloudflared và Named Tunnel NOT_STARTED. RC01 BLOCKED_BY_E01 / NOT_STARTED; chỉ mở sau actual E01 runtime gates và lệnh riêng từ Project Owner.

## 11. Acceptance hạ tầng

- Local stack chạy không cần Cloudflare token.
- DB còn dữ liệu sau restart container.
- Empty database migrate thành công.
- Seed content chạy hai lần không tạo duplicate.
- API readiness chuyển từ `503` sang `200` sau khi DB sẵn sàng.
- Nginx route đúng `/` và `/api/`.
- Backup → xóa database tạm → restore → health/bootstrap thành công.
- Named Tunnel giữ fixed hostname/PUBLIC_ORIGIN và container/process sau application rebuild; ghi evidence trước/sau thực tế, không suy ra public PASS từ static test.
- Không lộ DB port, API port hoặc secret.
## 12. Infrastructure artifacts cần tạo ở Phase G1

```text
.nvmrc
.env.example
package.json
pnpm-lock.yaml
compose.yaml
compose.tunnel.yaml
apps/api/Dockerfile
apps/web/Dockerfile
infra/nginx/nginx.conf
infra/nginx/conf.d/default.conf
infra/cloudflared/named-tunnel-contract.json
tools/tunnel.mjs
tools/lib/named-tunnel-runtime.mjs
tools/update-app.mjs
ops/backup-db.ps1
ops/backup-db.sh
ops/restore-db.ps1
ops/restore-db.sh
.github/workflows/ci.yml
```

`compose.yaml` chỉ quản lý application và profile `init`; `compose.tunnel.yaml` chỉ quản lý Named Tunnel cloudflared. Named Tunnel contract là nguồn machine-readable hiện hành. Local application không cần Cloudflare token; real secrets và ignored lock metadata không được commit.

Các artifact này là infrastructure scope của Phase G1/G7, không được để AI coder tự bỏ qua với lý do chưa có gameplay.

