# 27 — INFRASTRUCTURE & LOCAL DEVELOPMENT

## 1. Mục tiêu

**OFFICIAL PUBLIC DEPLOYMENT: PERSISTENT_QUICK_TUNNEL**, theo quyết định Project Owner ngày 2026-10-01. Public URL có dạng `https://<generated>.trycloudflare.com`; không cần custom domain, fixed hostname hoặc tunnel token. Đây là triển khai public chính thức, không phải debug tooling. Các quyết định Named Tunnel trước đó đã bị thay thế.

Có hai chế độ chạy:

```text
local  = web + api + db + nginx, không cần Cloudflare
public = local stack + persistent Quick Tunnel (separate Compose lifecycle)
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
PUBLIC_ORIGIN=
TRUST_PROXY=false
LOG_LEVEL=info
VITE_API_BASE=/api
BACKUP_DIR=./backups
```

Quy tắc:

- API validate environment khi boot và fail fast khi thiếu biến bắt buộc.
- `.env.example` không chứa secret thật.
- Public secret inject qua environment hoặc secret file có permission phù hợp.
- Không commit database password, session secret hoặc runtime state `.runtime/`.
- `DEMO_MODE=true` chỉ mô tả threat model; không bỏ qua validation.

Đây là ví dụ local, không phải public preflight configuration. E01 public demo bắt buộc `PERSISTENCE_DRIVER=postgres`, `APP_ENV=demo`, `COOKIE_SECURE=true`, session secret tối thiểu 32 ký tự và PostgreSQL password tối thiểu 16 ký tự, không default/placeholder; `DATABASE_URL` hợp lệ dùng PostgreSQL nội bộ. Không cần Cloudflare token, fixed hostname hoặc `PUBLIC_ORIGIN` public trước khi tunnel được tạo. Sau URL capture, CLI inject chính xác `PUBLIC_ORIGIN=https://<generated>.trycloudflare.com` vào process environment dùng để cấu hình API; ignored `.runtime/quick-tunnel.env` lưu lại giá trị runtime này để kiểm tra. API giữ exact Origin validation; không chấp nhận `*` hoặc wildcard trycloudflare.

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

Public demo (Phase 2, chỉ sau lệnh riêng của Project Owner; Phase 1 không start container/tunnel):

```powershell
npm run e01:preflight
npm run e01:quick:start
npm run e01:quick:status
npm run e01:app:update
npm run e01:app:update -- --nginx
npm run e01:quick:stop
```

`cloudflared` dùng Quick Tunnel không token:

```text
cloudflared tunnel --no-autoupdate --url http://nginx:80
```

Image version của Node, PostgreSQL, Nginx và cloudflared phải được pin. Không dùng `latest`.

Start lần hai reuse cloudflared đang chạy, không recreate tunnel. App update chỉ build/recreate `api/web`, refresh Nginx upstream DNS, và tùy chọn recreate Nginx qua `--nginx`; không dùng `docker compose down`. Stop chỉ dừng cloudflared, đánh dấu URL stale và giữ database volume. Chi tiết: [`E01_PERSISTENT_QUICK_TUNNEL.md`](../docs/implementation/tasks/E01_PERSISTENT_QUICK_TUNNEL.md).

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

## 10. Persistent Cloudflare Quick Tunnel

Project Owner chọn **PERSISTENT_QUICK_TUNNEL** cho E01 demo. Application Compose quản lý network tên cố định `mo-farm-frontend`; tunnel Compose tham gia với `external: true` để resolve `nginx` qua Docker DNS. Tunnel có image `cloudflare/cloudflared:2025.9.1`, `restart: unless-stopped`, log rotation giới hạn; không có build, token hoặc dependency lifecycle vào application stack.

Start script chờ Nginx healthy ở lần đầu rồi mới start cloudflared. Khi API/web/Nginx update hoặc tạm mất readiness, cloudflared vẫn sống. Runtime URL được parse/validate strict: HTTPS origin với subdomain hợp lệ của `.trycloudflare.com`, không root domain, localhost, domain khác, path/query/fragment hoặc wildcard.

Ignored state `.runtime/quick-tunnel.json` và `.runtime/quick-tunnel.env` ghi current URL và exact `PUBLIC_ORIGIN`; không chứa local secrets. App update so sánh container ID, `StartedAt`, `RestartCount` và current URL trước/sau. Unexpected rotation/restart báo `TUNNEL_LIFECYCLE_REGRESSION`; giữ tunnel sống khi sửa lỗi app.

Phạm vi ổn định URL là **SAME CLOUDFLARED LIFETIME**: URL dự kiến không đổi khi cùng tunnel session/process còn sống, không phải URL vĩnh viễn. URL có thể đổi khi process thoát, container restart/recreate, Docker host reboot tạo lại session, Cloudflare chấm dứt Quick Tunnel hoặc operator stop/restart tunnel. Restart policy cải thiện availability nhưng không bảo đảm URL cũ sau process restart. PERSISTENT_QUICK_TUNNEL là deployment model canonical của E01; Named Tunnel contract và báo cáo trước migration được giữ như historical evidence `SUPERSEDED`, `NON_CANONICAL`, `NOT_CURRENT_E01_RELEASE_PATH`, reason `PROJECT_OWNER_SELECTED_TRYCLOUDFLARE_AS_OFFICIAL_PUBLIC_DEPLOYMENT`. Bất kỳ stable-hostname migration nào cũng cần quyết định mới của Project Owner.

Phase 1 không start runtime: E01 `BLOCKED_CONFIG` nếu thiếu ignored local configuration, hoặc `READY_FOR_QUICK_TUNNEL_START` khi đủ. Phase 2 đang chạy nhưng QA chưa hoàn tất là `RUNNING`; chỉ `DONE — PERSISTENT_QUICK_TUNNEL` khi public QA, persistence và thực tế app-update URL preservation PASS. RC01 chờ E01 và lệnh riêng từ Project Owner.

Trạng thái hiện hành ngày 2026-10-01: **E01 DONE — PERSISTENT_QUICK_TUNNEL** sau Phase 1 và actual Phase 2 acceptance; actual preflight PASS, runtime vẫn RUNNING, cloudflared CONNECTED, PostgreSQL/API/web/Nginx healthy và exact PUBLIC_ORIGIN MATCH. Public URL: https://francisco-ohio-camcorder-industrial.trycloudflare.com. Start lặp lại và actual API/web/Nginx redeploy giữ nguyên tunnel ID, StartedAt, RestartCount và URL. Public/API/mobile/security/persistence QA và actual app-redeploy preservation đều PASS; RC01 **QUEUED / READY, NOT_STARTED**, chờ lệnh riêng của Project Owner. Nginx local dùng `127.0.0.1:8081` vì cổng `8080` thuộc service khác; PostgreSQL volume hiện có được giữ nguyên. Evidence chi tiết nằm trong [biên bản nghiệm thu runtime](../docs/implementation/tasks/E01_QUICK_TUNNEL_RUNTIME_ACCEPTANCE.md) và runbook hiện hành.

## 11. Acceptance hạ tầng

- Local stack chạy không cần Cloudflare token.
- DB còn dữ liệu sau restart container.
- Empty database migrate thành công.
- Seed content chạy hai lần không tạo duplicate.
- API readiness chuyển từ `503` sang `200` sau khi DB sẵn sàng.
- Nginx route đúng `/` và `/api/`.
- Backup → xóa database tạm → restore → health/bootstrap thành công.
- Public Quick Tunnel giữ container/process và URL sau application rebuild trong cùng cloudflared lifetime; ghi evidence trước/sau thực tế, không suy ra PASS từ static test.
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
infra/cloudflared/quick-tunnel-contract.json
tools/quick-tunnel.mjs
tools/update-app.mjs
ops/backup-db.ps1
ops/backup-db.sh
ops/restore-db.ps1
ops/restore-db.sh
.github/workflows/ci.yml
```

`compose.yaml` chỉ quản lý application và profile `init`; `compose.tunnel.yaml` chỉ quản lý cloudflared. Quick Tunnel contract là nguồn machine-readable hiện hành. Local application không cần Cloudflare, runtime state không được commit.

Các artifact này là infrastructure scope của Phase G1/G7, không được để AI coder tự bỏ qua với lý do chưa có gameplay.

