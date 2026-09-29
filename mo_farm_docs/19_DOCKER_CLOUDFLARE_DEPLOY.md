# 19 — DOCKER & CLOUDFLARE DEPLOYMENT

Đây là prototype/demo. Local phải chạy không cần Cloudflare; public demo dùng Named Tunnel riêng.

## 1. Local topology

```text
web + api + db + nginx
```

Chỉ Nginx bind `127.0.0.1:8080:80`. API và PostgreSQL không expose host port.

```text
Browser → nginx → web
                 └→ api → db
```

## 2. Public topology

```text
Internet
  ↓
Cloudflare Named Tunnel
  ↓
cloudflared container
  ↓
nginx:80
  ├── web
  └── api
```

`cloudflared` nằm trong Compose profile `public`, không chạy trong local mặc định.

## 3. Commands

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose --profile init run --rm migrate
docker compose --profile init run --rm seed

# optional public profile
docker compose --profile public up -d cloudflared
```

`docker compose up -d --build` local không được yêu cầu `CLOUDFLARE_TUNNEL_TOKEN`.

## 4. Named Tunnel

Dùng tunnel token đã cấp trên Cloudflare:

```text
cloudflared tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
```

Image version phải được pin; không dùng `cloudflare/cloudflared:latest`.

Hostname ví dụ:

```text
farm.example.com → http://nginx:80
```

Quick Tunnel `*.trycloudflare.com` chỉ dùng debug tạm thời và không phải acceptance stable URL.

## 5. Health

```text
GET /healthz
GET /api/health/live
GET /api/health/ready
```

Nginx và API có healthcheck. API chỉ nhận traffic sau khi DB ready và migration đã hoàn tất.

## 6. Acceptance

- Local chạy không có Cloudflare token.
- DB data tồn tại sau restart.
- API chỉ đi qua Nginx.
- DB không public.
- Empty DB migrate/seed thành công.
- Backup/restore pass.
- Rebuild web/api/nginx không làm đổi Named Tunnel hostname.
- Token/password không commit hoặc log.

Chi tiết compose network, environment, migration, seed, CI và backup nằm trong `27_INFRASTRUCTURE_AND_LOCAL_DEVELOPMENT.md`.
