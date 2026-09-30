# Chicken Golden Asset Review — Reference v1

| Trường | Giá trị |
|---|---|
| Trạng thái | REFERENCE ONLY — chưa phải production frame |
| Subtask | B02.2 — Golden Asset: Chicken |
| File | [`chicken-golden-style-reference-v1.png`](chicken-golden-style-reference-v1.png) |
| Kích thước tạo ra | `1254 × 1254` RGBA |
| Contract đích | `92` frame, mỗi frame `256 × 256`, sáu state × bốn hướng |
| Source | Internal generated visual reference |
| Tool | Built-in image generation tool |
| License/approval | PENDING owner/art review; chưa có `approvalRef` |

## Mục đích

Ảnh này là visual reference để asset/art owner đánh giá hướng Chicken: silhouette, body/wing/comb/beak, warm palette, top-left light và transparent background. Ảnh không được copy vào `assets-src/animals/chicken/`, không được đưa vào atlas và không được dùng để đặt `production_ready=true` hoặc `approved=true`.

## Vì sao chưa phải production candidate

- Chỉ có một tư thế/hướng tham chiếu; chưa có `NE`, `SE`, `SW`, `NW` đầy đủ.
- Chưa có sáu state `IDLE`, `WALK`, `EAT`, `HAPPY`, `SLEEP`, `PRODUCT_READY`.
- Chưa có 92 frame theo contract.
- Canvas `1254 × 1254` không khớp source contract `256 × 256`.
- Chưa có frame order, FPS, loop, holdLast hoặc event `FEED_CONSUMED@2`.
- Chưa có license/source/creator/tool evidence và approval record cho release.
- Chưa có technical, mobile, performance hoặc visual sign-off.

## Candidate conversion gate

Nếu asset owner chấp thuận hướng hình ảnh này, production work vẫn phải tạo source mới theo [`CHICKEN_PRODUCTION_CONTRACT.md`](../CHICKEN_PRODUCTION_CONTRACT.md):

1. Tạo đủ 92 frame source tại `assets-src/animals/chicken/`.
2. Giữ nguyên mọi ID, canvas, anchor, render offset, frame order, FPS, loop, holdLast và event.
3. Ghi metadata `source`, `creator`, `tool`, `toolVersion`, `license`, `technicalReview`, `styleReview` và `approvalRef`.
4. Chạy inventory, validate, pack, strict validation, preview, renderer test, mobile QA và performance QA.
5. Chỉ đề xuất `production_ready=true` sau technical review; chỉ owner/release approver mới được đặt `approved=true`.

B02.2 vẫn giữ `BLOCKED` cho tới khi candidate 92 frame và evidence đầy đủ. B02.1 style guide vẫn ở `REVIEW` chờ asset/art owner xác nhận.
