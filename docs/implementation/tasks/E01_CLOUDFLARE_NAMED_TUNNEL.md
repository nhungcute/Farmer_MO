# E01 — Cloudflare Named Tunnel public demo gate

> **SUPERSEDED — PROJECT_OWNER_SELECTED_PERSISTENT_QUICK_TUNNEL_FOR_DEMO (2026-10-01).** Historical plan retained below. Current deployment model, configuration and gates: [`E01_PERSISTENT_QUICK_TUNNEL.md`](E01_PERSISTENT_QUICK_TUNNEL.md). Named Tunnel token/hostname/profile requirements below no longer apply to E01 demo.

- Task ID: E01
- Name: Cloudflare Named Tunnel deployment and public smoke gate
- Status: QUEUED
- Owner: Infrastructure/release workstream
- Dependencies: A03 DONE, B02 DONE, C03 DONE, D02 DONE, Docker API/Web build PASS, Compose smoke PASS, CI remote gates PASS
- Owned paths: this task note; release evidence and runbook files added under `docs/implementation/**` only after the gate is opened
- Forbidden paths: gameplay/economy/content definitions, Renderer/Animation/Asset pipeline, Tutorial, API response contract, PostgreSQL schema/runtime, asset IDs/manifests, production secrets, database public ports, unrelated project containers
- Deliverables: token-safe Named Tunnel runbook, stable-hostname smoke evidence, readiness/health evidence, stop/rollback evidence and release dependency record
- Start time: Chưa bắt đầu — giữ `QUEUED` đến khi mọi dependency đạt
- End time: Chưa kết thúc

## Mục tiêu và ranh giới

E01 chỉ cung cấp public access cho prototype/demo thông qua Cloudflare Named Tunnel. Tunnel là lớp truy cập bên ngoài; nó không phải dependency của gameplay, persistence test, Playwright test hoặc local development. Dữ liệu farm vẫn thuộc phạm vi prototype/demo và không được coi là dữ liệu riêng tư.

Không dùng Quick Tunnel `*.trycloudflare.com` làm bằng chứng acceptance vì hostname không ổn định. Không mở E01 để che giấu lỗi API, PostgreSQL, Docker, asset hoặc browser gate.

## Điều kiện mở task

E01 chỉ chuyển từ `QUEUED` sang `RUNNING` khi parent review ghi nhận đủ bằng chứng:

1. A03 transaction/concurrency/rollback gate đạt.
2. B02 có production artwork, license/source evidence, style approval, release approval và visual/strict validation đạt.
3. C03 mobile/PWA/accessibility gate đạt.
4. D02 load và backup/restore gate đạt.
5. Docker API/Web build, migration và Compose smoke đạt.
6. CI remote PostgreSQL, browser và operational jobs đạt; mọi skip có lý do rõ ràng.
7. Có domain/zone Cloudflare được quản lý, hostname cố định và token được cấp qua secret store hoặc environment bảo mật.

Thiếu bất kỳ điều kiện nào thì giữ `QUEUED`; không chạy `cloudflared` và không tạo public URL.

## Acceptance checklist

- [ ] Parent review xác nhận toàn bộ dependency upstream đã đạt và B02 không còn `BLOCKED`.
- [ ] Hostname Named Tunnel cố định trỏ tới Nginx nội bộ; Quick Tunnel không được dùng làm acceptance.
- [ ] Token chỉ được inject qua secret/environment; không commit vào Git, `.env.example`, image layer, artifact hoặc log.
- [ ] Local stack vẫn khởi động và test được khi không có `CLOUDFLARE_TUNNEL_TOKEN`.
- [ ] Chỉ Nginx được public; PostgreSQL và API không bind public host port, không lộ database port.
- [ ] Cloudflared dùng image version đã pin và chạy profile `public` sau khi Nginx healthy.
- [ ] Public runtime preflight rejects demo defaults: `PERSISTENCE_DRIVER=postgres`, `APP_ENV=demo`, `PUBLIC_ORIGIN=https://<hostname>`, secure cookies, non-default session/database secrets, and a non-empty tunnel token.
- [ ] Public smoke kiểm tra `/`, `/api/health/live`, `/api/health/ready`, direct entry, giao diện tiếng Việt và không có Tutorial.
- [ ] Readiness phản ánh PostgreSQL thật: DB sẵn sàng trả ready; DB dừng hoặc mất kết nối không trả ready giả.
- [ ] Character enter/bootstrap qua hostname hoạt động; không log token, password, connection string hoặc stack trace.
- [ ] Restart/rebuild `web`, `api` và `nginx` không đổi hostname; farm state vẫn tồn tại sau restart được chấp nhận.
- [ ] Stop/disable tunnel và rollback runbook đã chạy thử; public URL không còn truy cập sau khi stop.
- [ ] Evidence lưu response status, thời điểm, image digest/version, hostname đã che một phần và log đã lọc secret.

## Runbook dự kiến (chỉ chạy sau khi task được mở)

Chuẩn bị secret ngoài repository:

```powershell
$env:CLOUDFLARE_TUNNEL_TOKEN = '<inject-from-secret-store>'
$env:CLOUDFLARE_HOSTNAME = 'farm.example.com'
```

Set and validate the public runtime environment before Compose config; do not run E01 with Compose demo defaults:

```powershell
$env:PERSISTENCE_DRIVER = 'postgres'
$env:APP_ENV = 'demo'
$env:PUBLIC_ORIGIN = "https://$env:CLOUDFLARE_HOSTNAME"
$env:COOKIE_SECURE = 'true'
$env:SESSION_SECRET = '<inject-at-least-32-random-chars-from-secret-store>'
$env:POSTGRES_PASSWORD = '<inject-database-secret-from-secret-store>'
$env:DATABASE_URL = 'postgresql://mo_farm:<url-encoded-password>@db:5432/mo_farm'

if ($env:CLOUDFLARE_TUNNEL_TOKEN -eq '' -or $env:CLOUDFLARE_TUNNEL_TOKEN -eq '<inject-from-secret-store>' -or $env:CLOUDFLARE_HOSTNAME -notmatch '^[A-Za-z0-9.-]+$' -or $env:PERSISTENCE_DRIVER -ne 'postgres' -or $env:APP_ENV -ne 'demo' -or $env:PUBLIC_ORIGIN -notmatch '^https://[^/]+$' -or ([string]$env:SESSION_SECRET).Length -lt 32 -or $env:SESSION_SECRET -eq 'change_me_minimum_32_chars' -or ([string]$env:POSTGRES_PASSWORD).Length -lt 16 -or $env:POSTGRES_PASSWORD -eq 'change_me') {
  throw 'E01 preflight failed: production persistence, HTTPS origin, tunnel token, and non-default secrets are required.'
}
```

Xác nhận local stack và migration trước khi bật public profile:

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose --profile init run --rm migrate
docker compose ps
```

Chỉ sau khi Nginx/API/DB healthy mới bật tunnel:

```powershell
docker compose --profile public up -d cloudflared
docker compose logs --no-color --tail=200 cloudflared
```

Smoke qua hostname phải kiểm tra cả liveness và readiness, trong đó readiness không được coi `200` là hợp lệ nếu PostgreSQL unavailable. Không ghi giá trị thật của token vào command log hoặc artifact.

## Stop và rollback

Rollback phải dừng public exposure trước, sau đó giữ local stack để điều tra:

```powershell
docker compose --profile public stop cloudflared
docker compose ps
```

Nếu smoke thất bại, không đổi gameplay hoặc persistence để sửa tunnel. Thu thập log đã lọc secret, khôi phục image/config đã biết là tốt, xác nhận hostname không còn route public và cập nhật blocker. Không xóa database hoặc chạy destructive restore trong E01 smoke.

## Kiểm thử và bằng chứng

E01 không có test runtime nào được chạy khi còn `QUEUED`. Khi mở task, evidence tối thiểu phải gồm:

- `docker compose config --quiet`;
- local Compose smoke không có token;
- public profile startup với token inject ngoài Git;
- public `GET /`, `GET /api/health/live`, `GET /api/health/ready`;
- readiness negative test khi PostgreSQL unavailable;
- direct-entry/bootstrap smoke qua hostname;
- rebuild hostname stability test;
- stop/rollback smoke;
- secret/log scan và kiểm tra không có public DB/API port.

## Hoạt động hiện tại

- Current activity: `QUEUED`; chỉ audit dependency và chuẩn bị checklist, chưa chạy tunnel.
- Last completed: local Docker/Compose, PostgreSQL, browser and operational gates; remote CI runs 36660295559 and 36662455574 on commits 628f7cd and 7651d6a completed 5/5 jobs; read-only E01 audit passed Compose exposure checks and added a postgres/demo/HTTPS/non-default-secret preflight; B02 has Wave 1 artwork/content/license/release approval (112 assets); 76 assets outside Wave 1 remain placeholders.
- Next activity: parent review cập nhật upstream status; chỉ khi B02 và toàn bộ dependency đạt mới mở E01, cấp secret ngoài repository và chạy public smoke.
- Blocker: B02 remains RUNNING because 76 assets outside the approved Wave 1 are placeholders; E01 stays QUEUED/CLOSED until the remaining release dependencies, hostname, and token are supplied.
