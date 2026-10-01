# E01-FIX-06 — Automated security preflight

> **SUPERSEDED deployment model — PROJECT_OWNER_SELECTED_PERSISTENT_QUICK_TUNNEL_FOR_DEMO (2026-10-01).** This historical validator report preserves earlier tests and Named Tunnel requirements. The current validator now permits Quick Tunnel and exact runtime-generated origin; current requirements: [`E01_PERSISTENT_QUICK_TUNNEL.md`](E01_PERSISTENT_QUICK_TUNNEL.md).

`tools/e01-preflight.mjs` là kiểm tra chỉ đọc cho public demo trước khi bật
Cloudflare Named Tunnel. Script không khởi động Docker, không gọi Cloudflare,
không tạo Quick Tunnel và không in giá trị secret.

Package script đã được tích hợp:

```json
"e01:preflight": "node tools/e01-preflight.mjs"
```

Có thể chạy trực tiếp hoặc qua package script:

```powershell
node tools/e01-preflight.mjs
node tools/e01-preflight.mjs --json
npm run e01:preflight
```

Exit code:

- `0`: tất cả cấu hình và static security checks PASS;
- `2`: `BLOCKED_CONFIG`, thiếu hoặc còn default/placeholder/invalid required
  environment;
- `3`: `BLOCKED_SECURITY`, environment đã đủ nhưng còn static security blocker.

## Environment contract

Output chỉ ghi tên biến và một trong `SET`, `MISSING`, `INVALID`, `DEFAULT` hoặc
`PLACEHOLDER`:

- `PERSISTENCE_DRIVER=postgres`;
- `APP_ENV=demo`;
- `PUBLIC_ORIGIN=https://<fixed-hostname>`;
- `COOKIE_SECURE=true`;
- `SESSION_SECRET` tối thiểu 32 ký tự và không dùng default;
- `POSTGRES_PASSWORD` tối thiểu 16 ký tự và không dùng default;
- `CLOUDFLARE_TUNNEL_TOKEN` không rỗng, được inject ngoài Git;
- `CLOUDFLARE_HOSTNAME` là hostname cố định, không phải example placeholder;
- `DATABASE_URL` là PostgreSQL URL hợp lệ có password không phải default.

`PUBLIC_ORIGIN` phải là HTTPS origin không có path/query/fragment/port và
hostname phải khớp chính xác (không phân biệt hoa thường) với
`CLOUDFLARE_HOSTNAME`. Khi local secret chưa được inject, script vẫn chạy hết
static checks rồi trả `BLOCKED_CONFIG`.

Process environment luôn được ưu tiên. Khi chạy local, script đọc `.env` và
`.env.<APP_ENV>` nếu các file ignored đó tồn tại; các file này chỉ được dùng để
đánh giá trong bộ nhớ và không bao giờ được ghi lại hoặc in ra.

## Static checks

Validator đọc các file trong repository và kiểm tra:

- API và PostgreSQL không có host port; Nginx chỉ bind loopback;
- cloudflared image được pin, chờ Nginx healthy, nối frontend network;
- token đi qua native `TUNNEL_TOKEN` environment, không đi qua command argument;
- Named Tunnel target machine-readable trỏ tới `http://nginx:80`;
- không có `--url`, `trycloudflare.com` hoặc Quick Tunnel;
- web server chỉ expose scoped artifact/runtime/public paths và có internal-path
  guard;
- service worker bỏ qua và không cache `/api/**`;
- API có bounded rate limiter và response `429` ổn định;
- edge có security headers, CSP, HSTS mapping, trusted forwarded-header
  overwrite, tắt `server_tokens` và không bật directory listing.

Static findings được báo độc lập với secret status để placeholder-only audit
không bỏ qua lỗi exposure. Script không coi tài liệu hướng dẫn là ingress
configuration; target phải nằm trong machine-readable contract/config.

## Tests

Focused tests:

```powershell
node --test tests/e01-preflight.test.mjs
```

Tests xác nhận baseline placeholder status, valid public environment chuyển tới
static gate, hostname mismatch bị chặn và formatter không rò rỉ secret/origin.
