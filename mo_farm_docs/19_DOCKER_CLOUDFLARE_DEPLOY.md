# 19 — DOCKER & CLOUDFLARE DEPLOYMENT

Đây là prototype/demo. Theo quyết định Project Owner ngày 2026-10-01, E01 dùng **PERSISTENT_QUICK_TUNNEL** tại `*.trycloudflare.com`. Local chạy độc lập với Cloudflare. Runbook hiện hành: [`E01_PERSISTENT_QUICK_TUNNEL.md`](../docs/implementation/tasks/E01_PERSISTENT_QUICK_TUNNEL.md).

## 1. Hai lifecycle riêng

```text
APPLICATION: compose.yaml (mo-farm)
  db (PostgreSQL) + api + web + nginx

TUNNEL: compose.tunnel.yaml (mo-farm-tunnel)
  cloudflared

Internet → https://<generated>.trycloudflare.com
         → cloudflared → http://nginx:80 → web / api → PostgreSQL
```

Application Compose quản lý network tên cố định `mo-farm-frontend`; tunnel Compose dùng network đó với `external: true`. Tunnel không có `build`, token hoặc dependency Compose vào application services. Chỉ Nginx bind loopback `127.0.0.1:8080:80`; API, web và PostgreSQL không publish host port.

## 2. Phase 1 — repository only

Phase 1 chỉ triển khai và kiểm tra repository, Compose config và Docker build. **Không start application container hoặc cloudflared; không tạo public URL.** Runtime hiện `BLOCKED_CONFIG` vì chưa có cấu hình local cần thiết. Khi cấu hình đủ, trạng thái là `READY_FOR_QUICK_TUNNEL_START`; chỉ bắt đầu runtime sau lệnh riêng của Project Owner.

Preflight chỉ đọc, không gọi Cloudflare hoặc start container:

```powershell
npm run e01:preflight
docker compose config --quiet
docker compose -f compose.tunnel.yaml config --quiet
```

Public demo cần `PERSISTENCE_DRIVER=postgres`, `APP_ENV=demo`, `COOKIE_SECURE=true`, `SESSION_SECRET` và `POSTGRES_PASSWORD` không default, cùng `DATABASE_URL` PostgreSQL hợp lệ. Không cần token, fixed hostname hoặc biết trước public origin.

## 3. Phase 2 — operator commands

Chỉ chạy sau khi Project Owner yêu cầu start runtime:

```powershell
# Start/reuse tunnel, discover URL, synchronize exact PUBLIC_ORIGIN and smoke.
npm run e01:quick:start
npm run e01:quick:status

# Build/update api + web, refresh nginx routing, preserve cloudflared.
npm run e01:app:update

# Also recreate nginx when its configuration changes.
npm run e01:app:update -- --nginx

# Stop cloudflared only; mark captured URL stale, retain application/data.
npm run e01:quick:stop
```

Không dùng `docker compose down` cho update ứng dụng. Start lần hai phải reuse tunnel đang chạy và báo `TUNNEL_ALREADY_RUNNING`; không gọi tunnel Compose `up` cho container đang chạy. Update kiểm tra container ID, `StartedAt`, `RestartCount` và URL trước/sau; thay đổi bất ngờ phải báo `TUNNEL_LIFECYCLE_REGRESSION`.

## 4. Quick Tunnel contract

Image pin: `cloudflare/cloudflared:2025.9.1`; restart policy `unless-stopped`.

```text
cloudflared tunnel --no-autoupdate --url http://nginx:80
```

Không có `TUNNEL_TOKEN`, `CLOUDFLARE_TUNNEL_TOKEN`, `CLOUDFLARE_HOSTNAME`, Named Tunnel credentials hoặc yêu cầu cấu hình Cloudflare dashboard. Contract hiện hành là `infra/cloudflared/quick-tunnel-contract.json`; Named Tunnel contract và báo cáo cũ đã `SUPERSEDED`.

URL runtime chỉ nhận HTTPS origin với subdomain hợp lệ của `.trycloudflare.com`. `.runtime/quick-tunnel.json` lưu trạng thái và nhận diện container; `.runtime/quick-tunnel.env` lưu `PUBLIC_ORIGIN` đúng bằng URL đã capture. Cả thư mục được gitignore; không nhân bản secret vào state hoặc evidence. Không chấp nhận origin wildcard.

## 5. Giới hạn URL và acceptance

URL là **ephemeral**, phạm vi kiểm tra giữ URL là **SAME CLOUDFLARED LIFETIME**. Rebuild/recreate API, web hoặc Nginx giữ cloudflared sống và giảm khả năng đổi URL. Quick Tunnel không bảo đảm URL vĩnh viễn hoặc luôn không đổi: process restart, container recreation, host reboot hoặc Cloudflare tái tạo session có thể sinh URL mới. `unless-stopped` hỗ trợ khôi phục process nhưng không bảo đảm giữ URL. Production cần hostname ổn định nên chuyển sang Named Tunnel.

Phase 2 phải kiểm tra HTTPS public smoke, enter/bootstrap, session/refresh/idempotent mutation, 188 approved assets, mobile matrix, negative static paths, cookie/security headers, bounded rate-limit test và farm persistence. Chạy update thực tế rồi xác nhận container/process và URL giữ nguyên. Không cố ý restart cloudflared để thử URL rotation.

E01 chỉ `DONE — PERSISTENT_QUICK_TUNNEL` sau runtime/public QA và preservation test PASS. RC01 vẫn `BLOCKED_BY_E01 / NOT_STARTED`; sau E01 DONE chỉ chuyển `QUEUED / READY` và chờ Project Owner.
