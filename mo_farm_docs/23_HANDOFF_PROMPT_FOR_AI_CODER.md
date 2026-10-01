# 23 — HANDOFF PROMPT FOR AI CODER — DIRECT ENTRY PROTOTYPE

Bạn đang xây dựng **Mỡ Farm**, web game nông trại 2.5D isometric chạy trên Docker Desktop, client là PWA landscape-first cho mobile.

Đây là **prototype/demo**. Dữ liệu farm không được coi là riêng tư. Người biết tên nhân vật có thể vào farm. Không nhập PII hoặc dữ liệu production.

## Tài liệu bắt buộc

Đọc toàn bộ `mo_farm_docs/` theo thứ tự. Sau đó dùng các file canonical sau làm nguồn cuối cùng:

```text
24_DECISIONS_AND_PROTOTYPE_SCOPE.md
25_MVP_CONTENT_DEFINITIONS.md
26_API_DATABASE_CONTRACTS.md
27_INFRASTRUCTURE_AND_LOCAL_DEVELOPMENT.md
28_REQUIREMENT_TRACEABILITY_AND_QA.md
29_RISK_REGISTER.md
```

Nếu tài liệu cũ mâu thuẫn với các file trên, dùng file canonical. Không tự bịa số liệu.

## Quy tắc bắt buộc

1. Stack: React + TypeScript + Vite, PixiJS 8, Zustand, Fastify, Prisma, PostgreSQL, Nginx, Docker Compose.
2. Node 22 LTS và pnpm 10 theo lockfile.
3. Farm world render bằng PixiJS/WebGL trong canvas; không dựng farm world bằng DOM/CSS.
4. React chỉ chịu trách nhiệm HUD, menu, modal, settings, login và onboarding hint không chặn gameplay.
5. Không có user/email/password/register/OAuth.
6. Name-only login là prototype non-private; không mô tả là auth mạnh.
7. Session dùng HttpOnly cookie; token hash trong database; không lưu token localStorage.
8. Sau login/reload chỉ có một bootstrap request chính.
9. Người chơi vào farm ngay sau bootstrap. **Không triển khai Tutorial dưới bất kỳ dạng nào trong MVP.**
10. Không tạo TutorialProgress, tutorial field, tutorial store, tutorial reward hoặc timer đặc biệt.
11. Ao là building object `pond_small_lv1`; không có canal/irrigation.
12. Mọi economy mutation validate phía server và chạy transaction.
13. Crop/chicken timer dựa trên server timestamp UTC.
14. Nguồn thức ăn gà là starter `chicken_feed` 1 unit và Market buy 5 coin/unit.
15. Dùng đúng bảng definitions trong file `25`.
16. Không mở rộng nội dung ngoài roadmap trước khi G7 đạt.
17. E01 demo dùng persistent Quick Tunnel tại `*.trycloudflare.com`, lifecycle cloudflared tách application Compose. Exact runtime PUBLIC_ORIGIN, không token/hostname cố định. URL ephemeral, scope preservation SAME CLOUDFLARED LIFETIME; production sau này dùng Named Tunnel. Phase 1 không start runtime; RC01 chờ Project Owner.
18. MVP animation dùng Pixi `AnimatedSprite + JSON atlas`; Spine để future.
19. Không tự bịa frame count, FPS, direction, anchor hoặc asset ID; dùng file `16_ASSET_ANIMATION_PIPELINE.md`.
20. Nếu production art chưa có, tạo placeholder atlas/manifest ở G1/G2 và ghi rõ asset còn thiếu; không chặn backend nhưng không đánh dấu animation final.
21. Toàn bộ giao diện người chơi phải là tiếng Việt có dấu, locale mặc định `vi-VN`.
22. Không render English technical ID, error code, route hoặc asset ID trực tiếp cho người chơi.
23. Mọi user-facing string phải đi qua localization key; thiếu translation key phải làm CI fail.

## Direct-entry flow bắt buộc

```text
Nhập tên
→ POST /api/character/enter
→ Set HttpOnly cookie
→ GET /api/game/bootstrap đúng một lần
→ render farm ngay
```

Farm mới có 6 plots, 3 ready Rice, 3 empty plots, 1,000 coin, 5 diamond, capacity 100 và 1 chicken_feed theo file `25`.

## Cách làm việc theo phase

Thực hiện `21_IMPLEMENTATION_ROADMAP.md` từ G0 đến G7.

Trước mỗi phase:

- Tóm tắt mục tiêu.
- Liệt kê file tạo/sửa.
- Nêu migration/API mới.
- Nêu test sẽ chạy.
- Kiểm tra risk liên quan trong file `29`.

Sau mỗi phase:

- Chạy lint.
- Chạy typecheck.
- Chạy unit/API integration test.
- Build Docker.
- Chạy DoD tương ứng.
- Báo lỗi còn lại.
- Không tự chuyển phase nếu DoD chưa đạt.

## Acceptance flow cuối MVP

```text
mở PWA
→ portrait thì yêu cầu xoay ngang
→ nhập tên
→ direct entry vào farm
→ bootstrap đúng một lần
→ harvest starter Rice
→ plant/grow/harvest
→ warehouse
→ sell hoặc complete order
→ XP/level/unlock
→ build Pond hoặc Chicken Coop
→ chicken tự tạo khi build Coop
→ feed bằng chicken_feed
→ collect Egg
→ reload/resume đúng state
→ local Docker và persistent Quick Tunnel public QA pass
→ app rebuild giữ cloudflared container/process và URL trong cùng lifetime
```

Animation acceptance phải gồm:

```text
placeholder/production source
→ manifest
→ JSON atlas
→ AssetRegistry/AnimationRegistry
→ crop/pond/chicken state mapping
→ anchor/depth QA
→ mobile FPS/memory QA
```

Language acceptance:

```text
login/HUD/modal/tooltip/hint đều là tiếng Việt
error code được map sang câu tiếng Việt
number/date/currency dùng vi-VN
aria-label/title/alt text không còn English
không còn localization key chưa dịch
```

Nếu có quyết định kỹ thuật mâu thuẫn với các file canonical, dừng và báo rõ trước khi thay đổi kiến trúc hoặc số liệu.
