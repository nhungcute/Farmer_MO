# 29 — RISK REGISTER

| ID | Rủi ro | Mức | Biện pháp bắt buộc | Điều kiện đóng |
|---|---|---|---|---|
| R-01 | Name-only login cho phép người biết tên vào farm | Cao | Ghi rõ prototype non-private; không dùng PII; warning trên màn hình vào game | Product owner chấp nhận threat model |
| R-02 | Session token bị lộ qua JS/log | Cao | HttpOnly cookie, token hash DB, không log cookie, CSP | Security smoke test pass |
| R-03 | Double request tạo duplicate reward/item | Cao | Row lock, transaction, unique constraint, Idempotency-Key | Race suite pass |
| R-04 | Client delta đến sai thứ tự | Trung bình | `stateRevision`, bỏ delta cũ hoặc bootstrap lại | Out-of-order test pass |
| R-05 | Build chồng footprint | Cao | Lock farm, validate toàn bộ footprint server-side | Geometry/concurrency pass |
| R-06 | Không có nguồn feed chicken | Cao | `chicken_feed`: starter 1 + Market buy 5 coin | Feed route và balance test pass |
| R-07 | AI coder tự bịa economy | Cao | Bảng definitions `25`, version `mvp-1`, traceability | Content review pass |
| R-08 | Tutorial làm kẹt flow | Đã loại bỏ | Không tạo tutorial state/route/reward; direct entry | Bootstrap không có tutorial |
| R-09 | Crop/chicken timer bị cheat bằng đổi giờ | Cao | Server `TIMESTAMPTZ`, readyAt server-side, fake clock test | Time trust suite pass |
| R-10 | Quick Tunnel URL đổi khi process/container/session restart | Trung bình | Tunnel Compose riêng; app update giữ cloudflared sống, detect ID/StartedAt/RestartCount/URL regression; URL ephemeral, Named Tunnel remains historical/non-canonical | Actual Phase-2 redeploy-preservation PASS trong SAME CLOUDFLARED LIFETIME |
| R-11 | DB mất dữ liệu khi volume hỏng | Cao | Backup/restore script, retention, restore drill | Restore acceptance pass |
| R-12 | Migration chạy khi DB chưa ready | Trung bình | Healthcheck + init profile + retry | Empty DB compose pass |
| R-13 | Service worker phục vụ app shell cũ | Trung bình | Hashed assets, update policy, API no-store/network-first | SW update test pass |
| R-14 | Pixi depth/hit-test sai với building nhiều tile | Cao | Canonical anchor/depth/footprint tests | Renderer acceptance pass |
| R-15 | Mobile Android tụt FPS hoặc memory leak | Cao | DPR adaptive, atlas, culling, device profile | Performance budget pass |
| R-16 | Asset không có license hoặc sai phong cách | Trung bình | Placeholder hợp pháp, asset manifest/license | Asset review pass |
| R-17 | Seed ghi đè runtime state | Cao | Seed chỉ upsert definitions, repeatability test | CI seed test pass |
| R-18 | Public demo bị abuse/rate flood | Trung bình | Rate limit enter/mutation, body limit, logs, disable debug | Public smoke/security pass |
| R-19 | Chưa có production art nhưng coder đánh dấu animation hoàn thành | Cao | Placeholder-first manifest ở G1/G2; art source/license/sign-off bắt buộc trước G7 | ANIM-01..09 pass |
| R-20 | Frame/pivot/atlas sai làm sprite rung hoặc tụt FPS | Cao | Canvas cố định, anchor metadata, atlas 2048, shared ticker và mobile profile | Animation visual/performance pass |
| R-21 | English technical ID lọt ra giao diện | Trung bình | Localization key, vi-VN catalog, CI missing-key/English scan | LANG-01..05 pass |
| R-22 | Captured URL stale hoặc origin wildcard làm yếu Origin security | Cao | Validate strict HTTPS trycloudflare origin; exact runtime PUBLIC_ORIGIN; process identity check; stop đánh dấu state stale; ignored runtime state không chứa secrets | Static parser/lifecycle tests + Phase-2 Origin/cookie QA PASS |
| R-23 | App update đổi IP upstream khiến Nginx route lỗi | Trung bình | Reload Nginx routing sau selective API/web recreate; giữ tunnel sống khi sửa app | Actual Phase-2 public smoke sau app update PASS |

## Nguyên tắc xử lý

- Rủi ro mức Cao phải có test hoặc gate trước khi mở phase tiếp theo.
- Không dùng “sẽ xử lý sau” cho data integrity, session, timer hoặc collision.
- `DEMO_MODE=true` không được tắt server validation.
- Mọi exception phải ghi vào `24_DECISIONS_AND_PROTOTYPE_SCOPE.md`.
