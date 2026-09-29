# 18 — SAVE, SYNC & SECURITY

## 1. Save strategy

Không có nút Save Game.

Action quan trọng save ngay qua API.

## 2. Action flow

```text
User action
→ client validate sơ bộ
→ API
→ server transaction
→ response delta
→ client store update
→ renderer update
```

## 3. Autosave indicator

Hiện nhỏ:

```text
Saving...
Saved
```

Ẩn sau ~1 giây.

## 4. No offline mutation

PWA có thể load shell offline, nhưng gameplay mutation MVP yêu cầu network.

Nếu offline:

```text
Mất kết nối.
Vui lòng kết nối lại để tiếp tục.
```

Không queue build/harvest offline ở MVP vì dễ conflict.

## 5. Anti-duplicate

UI:

- Disable action button trong request.
- Debounce tap.

Server:

- Transaction.
- Check current state.
- Optional idempotency key cho order/claim/build.

## 6. Time trust

Không trust client clock.

Server quyết định ready.

## 7. Security level

Vì không password, đây không phải hệ thống auth mạnh.

Session token vẫn cần:

- Random đủ mạnh.
- Expiry.
- HTTPS qua Cloudflare.
- Không log full token.
- HttpOnly cookie là lựa chọn tốt hơn localStorage nếu cùng origin.

Khuyến nghị: dùng secure HttpOnly SameSite cookie cho session.

## 8. Character name abuse

Rate limit:

- `/character/enter`
- market/order mutation

Sanitize output để tránh XSS khi render display name.

## 9. Backup

PostgreSQL volume.

Dev có script:

```text
backup-db
restore-db
```

Production-like nên scheduled backup sau.

## 10. Acceptance

- Double tap harvest không dupe.
- Đổi giờ điện thoại không cheat timer.
- F5 không mất save.

## 11. Prototype threat model

Mỡ Farm là prototype/demo non-private. Name-only login được giữ theo yêu cầu sản phẩm; ai biết tên character có thể vào farm. Không dùng dữ liệu cá nhân hoặc dữ liệu có giá trị.

HttpOnly cookie, rate limit, CSP, request ID và server validation vẫn bắt buộc để tránh lỗi kỹ thuật và abuse, nhưng không được mô tả là bảo vệ tài khoản.
