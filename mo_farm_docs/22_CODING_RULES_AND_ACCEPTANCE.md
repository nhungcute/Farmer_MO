# 22 — CODING RULES & ACCEPTANCE

## 1. TypeScript strict

```json
{
  "strict": true
}
```

Không lạm dụng `any`.

## 2. Shared contracts

Request/response type dùng chung web/api.

Có runtime validation server.

## 3. No business logic in React component

Sai:

```text
WarehouseModal tính sell price.
```

Đúng:

```text
domain config/server tính.
UI chỉ hiển thị.
```

## 4. Renderer isolated

Renderer không:

- gọi database.
- gọi API trực tiếp.
- import React component.

## 5. No duplicated bootstrap

Chỉ một nguồn gọi bootstrap sau session.

React StrictMode dev có thể chạy effect hai lần; code phải chống duplicate hoặc đặt bootstrap ngoài effect dễ double-run.

## 6. Error handling

Mọi mutation:

- loading state.
- error state.
- retry hợp lý.
- rollback visual nếu cần.

## 7. Logs

Server log structured:

```json
{
  "event": "crop.harvest",
  "characterId": "...",
  "plotId": "...",
  "durationMs": 15
}
```

Không log session token.

## 8. Feature flag

Có thể dùng simple config:

```text
ENABLE_FISHING=false
ENABLE_WEATHER=false
```

## 9. PR acceptance checklist

- Typecheck.
- Lint.
- Tests.
- No console error.
- Mobile landscape tested.
- Reload save tested.
- API error tested.
- No duplicate request.
- No new large asset without optimization.

## 10. Definition of Done cho feature

Một feature chỉ hoàn thành khi có:

- UI.
- server validation.
- persistence.
- reload test.
- error state.
- mobile check.
- acceptance tests.


## 11. Prototype/direct-entry rule

Mỡ Farm là prototype/demo non-private. Không triển khai Tutorial. Người chơi vào farm ngay sau bootstrap.

Mọi mutation economy phải:

- Dùng server definition.
- Có transaction và row lock phù hợp.
- Có `Idempotency-Key` nếu có thể retry.
- Trả lỗi chuẩn và state revision.

Bảng số liệu bắt buộc dùng `25_MVP_CONTENT_DEFINITIONS.md`; không được tự bịa.

## 12. Infrastructure rule

Local Docker không phụ thuộc Cloudflare. E01 demo dùng persistent Quick Tunnel với `compose.tunnel.yaml` riêng; application update không stop/recreate cloudflared hoặc xóa PostgreSQL volume. Runtime `PUBLIC_ORIGIN` phải đúng exact generated HTTPS origin, không wildcard. Giữ Secure/HttpOnly cookie, rate limit, trusted proxy/security headers, restricted static root và service worker không cache `/api/**`.

URL preservation chỉ có scope SAME CLOUDFLARED LIFETIME; Quick Tunnel không có URL vĩnh viễn. Public QA/persistence/URL-preservation test phải chạy thực tế ở Phase 2; Phase 1 không start container hoặc tạo URL. Migration phải dùng `prisma migrate deploy`; seed phải idempotent và không ghi đè runtime state. Runbook hiện hành: [`E01_PERSISTENT_QUICK_TUNNEL.md`](../docs/implementation/tasks/E01_PERSISTENT_QUICK_TUNNEL.md).
