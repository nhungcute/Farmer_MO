# 24 — CANONICAL DECISIONS & PROTOTYPE SCOPE

## 1. Trạng thái sản phẩm

Mỡ Farm MVP hiện là **prototype/demo**. Dữ liệu farm không được coi là riêng tư.

Người chơi chỉ cần tên nhân vật để vào farm. Bất kỳ ai biết `lookupName` đều có thể tạo session mới và truy cập cùng farm. Đây là hành vi được chấp nhận trong prototype.

Prototype không cam kết:

- Tính riêng tư hoặc bảo mật tài khoản.
- Khả năng khôi phục danh tính.
- Chống chiếm quyền farm nếu người khác biết tên.
- SLA hoặc backup production.
- Monetization hoặc dữ liệu thanh toán.

Không dùng hệ thống này cho dữ liệu thật, thông tin cá nhân, tài sản có giá trị hoặc production account.

Vẫn dùng HttpOnly cookie trên public để tránh làm lộ session token qua JavaScript. Cookie chỉ giảm rủi ro XSS; nó không biến name-only login thành authentication mạnh.

## 2. Flow vào game trực tiếp

```text
Nhập tên
  ↓
POST /api/character/enter
  ↓ Set-Cookie: mo_farm_session
GET /api/game/bootstrap (đúng một lần)
  ↓
Render farm ngay
```

Không có tutorial bắt buộc, không có tutorial overlay và không có bước chặn trước khi chơi.

Bootstrap không trả `tutorial`, không tạo `TutorialProgress` và không có tutorial reward.

Onboarding chỉ là hint tùy chọn ở client:

- Không chặn input.
- Không tạo API request riêng.
- Không cấp reward.
- Có thể bỏ qua bằng cách đóng hint.

## 3. Canonical source of truth

Các file `24` đến `29` là phần chốt sau cùng của kế hoạch. Nếu các tài liệu `00` đến `23` còn giá trị gợi ý hoặc mâu thuẫn, dùng thứ tự ưu tiên sau:

```text
24_DECISIONS_AND_PROTOTYPE_SCOPE.md
25_MVP_CONTENT_DEFINITIONS.md
26_API_DATABASE_CONTRACTS.md
27_INFRASTRUCTURE_AND_LOCAL_DEVELOPMENT.md
28_REQUIREMENT_TRACEABILITY_AND_QA.md
29_RISK_REGISTER.md
```

AI coder không được tự thay số liệu, mở rộng scope hoặc thêm Tutorial.

## 4. Stack và toolchain

- Node.js 22 LTS, phiên bản patch được khóa trong `.nvmrc` và Docker image.
- pnpm 10, phiên bản được khóa trong `packageManager` và lockfile.
- React + TypeScript + Vite.
- PixiJS 8 + WebGL.
- Zustand.
- Fastify + Prisma + PostgreSQL.
- Nginx.
- Docker Compose.
- Vitest cho unit/API test.
- Playwright cho E2E.
- Zod cho runtime validation.

Không dùng `latest` trong Docker image production-like.

## 5. Session canonical

- `POST /api/character/enter` tạo hoặc tìm character theo `lookupName`.
- Server trả session bằng HttpOnly cookie.
- Token thô không trả trong JSON và không lưu localStorage.
- Database chỉ lưu hash token, expiry và revoked time.
- Session TTL prototype: 7 ngày.
- Rate limit vẫn bật dù dữ liệu không private.
- `SameSite=Lax`; `Secure=true` trên public, `false` ở local HTTP.
- Vì prototype non-private, account recovery không nằm trong MVP.

## 6. MVP non-goals

Không triển khai trong MVP:

- Tutorial bắt buộc hoặc tutorial replay.
- TutorialProgress, tutorial quest hoặc tutorial reward.
- Multiplayer realtime.
- Guild, chat, PvP, trading giữa người chơi.
- Payment hoặc monetization.
- Fishing gameplay.
- Weather simulation.
- Day/night lighting đầy đủ.
- Nhiều farm trên một character.
- Move building nếu chưa hoàn thiện occupancy transaction.

## 7. Quy tắc thay đổi

Mọi thay đổi canonical phải cập nhật đồng thời:

- Content definitions.
- API contract.
- Database notes.
- Roadmap.
- Traceability/QA.
- Handoff prompt.

Không giải quyết mâu thuẫn bằng cách để AI coder tự chọn.

## 8. Ngôn ngữ giao diện — bắt buộc

Toàn bộ giao diện người chơi của Mỡ Farm dùng **tiếng Việt có dấu**.

Phải Việt hóa tất cả text mà người chơi có thể nhìn hoặc nghe thấy:

- Màn hình nhập tên, nút, menu, HUD, modal, tab, tooltip và hint.
- Tên crop, building, item, animal, order và quest.
- Trạng thái loading, saving, saved, offline, retry, error và session hết hạn.
- Thông báo build hợp lệ/không hợp lệ, kho đầy, thiếu coin, thiếu item và crop chưa chín.
- Portrait overlay, install prompt, accessibility label, `aria-label`, title và text cho screen reader.
- Toast, floating feedback, reward popup và confirmation dialog.

English chỉ được dùng cho:

- Tên biến, type, function, module, route và API contract.
- Asset ID, item ID, building ID, animation state và database field.
- Debug overlay, log kỹ thuật và nội dung dành riêng cho developer.

Không hiển thị trực tiếp các ID như `chicken_feed`, `NOT_ENOUGH_COINS`, `BUILDING_COLLISION` hoặc `order_rice_3` cho người chơi.

UI text phải đi qua localization key với locale mặc định `vi-VN`; không hardcode text rải rác trong component. Client map error code sang câu tiếng Việt trước khi render.

Định dạng số, ngày giờ và currency dùng locale `vi-VN`. Tên nhân vật do người chơi nhập được giữ nguyên dấu khi hiển thị, sau khi server normalize riêng `lookupName`.
