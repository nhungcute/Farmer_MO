# 21 — IMPLEMENTATION ROADMAP — DIRECT ENTRY MVP

Roadmap này triển khai một vertical slice sớm và không có Tutorial. Chỉ mở phase tiếp theo khi DoD hiện tại đạt.

## G0 — Chốt quyết định và toolchain

- Đọc `24` đến `29`.
- Node 22 LTS + pnpm 10 + lockfile.
- Zod, Vitest, Playwright.
- Cookie/session model.
- Content definitions `mvp-1`.
- Map/footprint rules.
- Requirement traceability.
- Risk register.

**DoD:** không còn giá trị gameplay/API nào được đánh dấu “AI tự chọn”; mọi số liệu có trong `25`.

## G1 — Foundation và local infrastructure

- Monorepo.
- Web shell React/Vite.
- API Fastify.
- PostgreSQL/Prisma.
- Nginx.
- Docker Compose local.
- Health live/ready.
- Migration/seed idempotent.
- `.env.example`.
- CI lint/typecheck/test/build.
- Portrait overlay và landscape shell tối thiểu.
- Localization catalog `vi-VN` và rule không hiển thị English fallback.
- Asset source manifest và placeholder atlas pipeline.
- `pnpm assets:validate`, `assets:pack`, `assets:preview` chạy được.

**DoD:** `docker compose up -d --build` chạy được không cần Cloudflare; migration và seed chạy thành công.

## G2 — Direct entry và renderer foundation

- Name normalize.
- Character enter.
- HttpOnly session cookie.
- New/existing character.
- Một bootstrap request.
- Stores không có Tutorial store.
- Pixi init/WebGL capability check.
- Isometric transform/inverse.
- Camera pan/zoom.
- Ground/map 24x24.
- Debug grid và selection.
- `AssetRegistry`/`AnimationRegistry` load được placeholder manifest.

**DoD:** nhập tên → vào farm ngay → bootstrap đúng một lần → reload resume được blank/starter scene.

## G3 — Crop vertical slice

- Starter 6 plots, 3 ready Rice.
- Plant Rice.
- Server readyAt.
- Stage render.
- Harvest.
- Inventory/capacity.
- XP/level.
- Reload sau khi crop đang grow.
- Rice stage/ready glow và harvest effect chạy qua shared ticker.

**DoD:** harvest starter Rice → plant → fake clock → harvest → không dupe khi double request.

## G4 — Warehouse, Market, Order và Quest

- Warehouse modal.
- Capacity.
- Market sell.
- Market buy `chicken_feed`.
- Order slots và replacement.
- XP/unlock theo `25`.
- Quest progress/claim.
- Error/loading/retry state.

**DoD:** item vào kho → sell/buy/order atomic → coin/XP đúng → retry không duplicate.

## G5 — Build Mode và Pond

- Build catalog chỉ gồm Pond/Coop ngoài starter buildings.
- Grid ghost.
- Rotation/footprint validation.
- Server farm lock.
- Pond placement.
- Reload persistence.

**DoD:** Pond đúng cost/XP, không chồng object, reload giữ grid position.

## G6 — Chicken loop

- Place Coop.
- Auto-create một chicken.
- Starter feed.
- Market buy feed.
- Feed timer 600s.
- Egg collect.
- Warehouse full behavior.
- Chicken 4 hướng và các state animation từ manifest.

**DoD:** Coop → chicken → feed → fake clock → egg → buy feed cycle tiếp theo; race test pass.

## G7 — PWA, mobile, performance và public demo

- Manifest/service worker.
- Standalone QA.
- Asset atlas/lazy load/culling.
- Replace placeholder art bằng production art đã sign-off.
- Animation visual QA, atlas integrity và license audit.
- DPR adaptive.
- Memory/FPS profile.
- Backup/restore.
- Persistent Cloudflare Named Tunnel trong `compose.tunnel.yaml`, lifecycle riêng với app.
- Dedicated tunnel/token/fixed hostname; exact fixed PUBLIC_ORIGIN trước startup. App update giữ container/process và configured origin.
- Repository correction không start runtime hoặc liên hệ Cloudflare; chờ Project Owner trước actual runtime/public QA. Quick Tunnel experiment không thuộc E01 release path.
- Language scan/accessibility review cho toàn bộ màn hình.

**DoD:** direct-entry E2E, mobile matrix, performance budget, backup/restore và public smoke test pass.

## Quy tắc không mở rộng scope

Chưa triển khai trước khi G7 đạt:

```text
Tutorial
50 crops
20 animals
Fishing
Weather
Social/multiplayer
Payment
Road/decor placement
Building move/upgrade
```

Tutorial hiện không nằm trong MVP; nếu sau này cần, phải tạo RFC riêng và không được tự thêm vào bootstrap hoặc schema hiện tại.

## Parallel workstreams

Có thể chạy task tạo animation/render song song với backend và gameplay, với điều kiện giữ đúng contract trong `16_ASSET_ANIMATION_PIPELINE.md`.

### Track A — Core/API

Phụ trách game core, API, Prisma/migration/seed, crop, inventory, market, order, build và animal rules. Track này không tự tạo hoặc đổi asset ID, FPS hoặc frame count.

### Track B — Animation/asset render

Phụ trách source frame hoặc placeholder frame, style sheet, asset metadata, animation manifest, `tools/export-assets`, atlas JSON/WebP/PNG, preview sheet và asset validator.

Track B không sửa schema, economy, API hoặc server timer. Nếu thiếu production art, dùng placeholder có `placeholder: true` và ghi asset còn thiếu.

### Track C — Renderer integration

Phụ trách AssetRegistry, AnimationRegistry, Pixi AnimatedSprite, state/direction mapping, anchor/depth/culling/shared ticker và fallback khi frame hoặc atlas lỗi.

Track C chỉ đọc manifest đã chốt; không tự đoán frame từ tên file.

### Quy tắc chạy song song

- Mỗi track dùng branch/worktree hoặc thư mục sở hữu riêng nếu repository đã có Git.
- Nếu workspace dùng chung, Track B chỉ ghi `assets-src/`, `tools/export-assets/` và generated asset output; Track A không sửa các file đó.
- Không chỉnh cùng lúc `16_ASSET_ANIMATION_PIPELINE.md`, manifest hoặc generated atlas ở nhiều task.
- Freeze trước khi tạo frame: asset ID, state, direction, canvas, anchor, FPS, loop và fallback.
- Tích hợp theo thứ tự: manifest/validator → atlas → loader → renderer mapping → visual QA → mobile performance.
- Generated atlas phải reproducible; hai lần pack cùng input phải cho kết quả tương đương.

### Deliverable tối thiểu của task animation

```text
assets-src/style/style-sheet.md
assets-src/manifests/animation-manifest.json
tools/export-assets/
apps/web/public/assets/atlases/*
apps/web/public/assets/manifests/animation-manifest.json
asset validator
preview sheet
license/source metadata
ANIM-01..ANIM-09 evidence
```

Task animation độc lập hoàn thành khi chạy được:

```text
pnpm assets:validate
pnpm assets:pack
pnpm assets:preview
```

trên workspace không cần backend gameplay hoàn thành.
