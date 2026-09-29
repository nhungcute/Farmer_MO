# 04 — CHARACTER LOGIN & BOOTSTRAP

## 1. Mục tiêu

Mỡ Farm là prototype/demo non-private. Người chơi không tạo account/password; chỉ nhập tên nhân vật để tìm hoặc tạo character.

Người biết tên nhân vật có thể vào cùng farm. Không lưu dữ liệu cá nhân hoặc dữ liệu production.

## 2. Login screen

Fields:

- Tên nhân vật.
- Nút `Vào nông trại`.
- Có thể nhớ tên gần nhất ở localStorage để tiện điền.

Validation:

- Trim khoảng trắng đầu/cuối.
- 2–24 ký tự Unicode.
- Không có control chars.
- Cho phép tiếng Việt.
- Normalize Unicode NFC.
- Collapse whitespace liên tiếp thành một space.
- Casefold để tạo `lookupName`.

Ví dụ:

```text
displayName = "Mỡ Ú"
lookupName  = "mỡ ú"
```

## 3. Enter endpoint

```http
POST /api/character/enter
Content-Type: application/json
```

```json
{ "name": "Mỡ Ú" }
```

Response không chứa session token:

```json
{
  "status": "created",
  "character": {
    "id": "uuid",
    "displayName": "Mỡ Ú",
    "level": 1,
    "xp": 0,
    "coins": 1000,
    "diamonds": 5
  },
  "requestId": "uuid"
}
```

Existing character dùng `status: "existing"` và trả state hiện tại.

Server set cookie:

```text
Set-Cookie: mo_farm_session=<opaque>; HttpOnly; SameSite=Lax; Path=/
```

`Secure=true` ở public demo và `Secure=false` ở local HTTP.

## 4. Session

- Database lưu hash token, không lưu token thô.
- TTL canonical: 7 ngày.
- Có `expiresAt`, `revokedAt`, `lastSeenAt`.
- Không dùng character name làm authorization key trực tiếp.
- Không lưu session token trong localStorage.
- Rate limit `/character/enter` và economy mutation.
- Session chỉ giúp request có context; không biến name-only login thành account security.

## 5. Bootstrap trực tiếp

Ngay sau enter:

```http
GET /api/game/bootstrap
```

Đây là request chính duy nhất để vào game.

Response:

```json
{
  "schemaVersion": 2,
  "contentVersion": "mvp-1",
  "serverNow": "2026-09-29T08:00:00.000Z",
  "character": {},
  "farm": {},
  "objects": [],
  "plots": [],
  "crops": [],
  "animals": [],
  "inventory": [],
  "warehouse": {},
  "quests": [],
  "orders": [],
  "unlocks": [],
  "settings": {}
}
```

Không có field `tutorial`.

## 6. New character transaction

Tạo mới phải trong transaction:

```text
Character
Farm 24x24
Starter Farmhouse + Warehouse
6 plots
3 ready Rice CropInstance
3 empty plots
Inventory chicken_feed x1
Warehouse capacity 100
3 orders, slot đầu order_rice_3
Quest state
Unlock state
GameSession
```

Nếu một bước lỗi, rollback toàn bộ.

## 7. Initial save

```text
coins = 1000
diamonds = 5
level = 1
xp = 0
warehouse_capacity = 100
plots = 6
ready_rice_plots = 3
empty_plots = 3
starter_chicken_feed = 1
```

Chi tiết tọa độ, item, crop, building và order nằm trong `25_MVP_CONTENT_DEFINITIONS.md`.

## 8. Resume

Sau reload:

1. Cookie còn hợp lệ → bootstrap trực tiếp.
2. Cookie hết hạn/revoked → xóa cookie và hiện màn nhập tên.
3. Không replay tutorial vì MVP không có Tutorial.
4. Có thể prefill tên gần nhất từ localStorage; localStorage không chứa session token.

## 9. Acceptance criteria

- New name tạo đúng một farm.
- Existing name không tạo dữ liệu trùng.
- Hai request đồng thời cùng tên không tạo hai character.
- Bootstrap đúng một lần cho mỗi session initialization.
- Farm hiển thị ngay sau bootstrap.
- Refresh/PWA reopen không mất farm.
- Bootstrap không có tutorial state.
