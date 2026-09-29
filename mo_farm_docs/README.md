# Mỡ Farm — Documentation Pack

Đây là kế hoạch triển khai prototype/demo web game nông trại Mỡ Farm. Dữ liệu farm không được coi là riêng tư; người biết tên nhân vật có thể vào cùng farm.

Bắt đầu từ:

- `00_MO_FARM_MASTER_SPEC.md`

Đọc tiếp theo thứ tự. File `14_TUTORIAL_SYSTEM.md` chỉ ghi nhận rằng Tutorial đã bị loại khỏi MVP; không triển khai nội dung trong file đó.

Các file `24` đến `29` là phần canonical được chốt sau cùng:

- `24_DECISIONS_AND_PROTOTYPE_SCOPE.md` — phạm vi prototype, direct entry, stack và quyết định không có Tutorial.
- `25_MVP_CONTENT_DEFINITIONS.md` — toàn bộ số liệu crops, items, chicken feed, buildings, orders, XP và unlock.
- `26_API_DATABASE_CONTRACTS.md` — API, error codes, session, idempotency, transaction và database constraints.
- `27_INFRASTRUCTURE_AND_LOCAL_DEVELOPMENT.md` — Docker local/public, migration, seed, backup, CI, Nginx và Named Tunnel.
- `28_REQUIREMENT_TRACEABILITY_AND_QA.md` — requirement IDs, acceptance, test matrix và performance budget.
- `29_RISK_REGISTER.md` — rủi ro và điều kiện đóng.

Nếu tài liệu cũ có giá trị “gợi ý” hoặc mâu thuẫn với các file `24` đến `29`, dùng các file canonical này.

Phần tạo animation nằm trong `16_ASSET_ANIMATION_PIPELINE.md`. File này mô tả source frame, style lock, canvas/pivot, frame count/FPS/direction, manifest, atlas, lệnh export, placeholder, runtime loader và QA. Không coi animation hoàn thành chỉ vì có một ảnh tĩnh hoặc một `AnimatedSprite` chạy được trên desktop.

Quy tắc ngôn ngữ: toàn bộ giao diện người chơi là tiếng Việt có dấu theo locale `vi-VN`; English chỉ dùng cho code, API, asset ID, database và debug nội bộ.

Có thể chạy task animation/render song song với backend theo phần `Parallel workstreams` ở `21_IMPLEMENTATION_ROADMAP.md`. Task animation phải dùng manifest/frame contract của `16_ASSET_ANIMATION_PIPELINE.md` và không tự thay đổi API/economy.
