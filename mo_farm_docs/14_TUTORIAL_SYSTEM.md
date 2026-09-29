# 14 — TUTORIAL SYSTEM — ĐÃ LOẠI KHỎI MVP

## Trạng thái

Tutorial đã được loại khỏi MVP theo quyết định sản phẩm mới.

Người chơi nhập tên nhân vật, bootstrap một lần và vào thẳng farm. Không hiển thị slideshow, dialogue bubble, input guard hoặc tutorial overlay.

File này được giữ lại để tránh làm hỏng thứ tự tài liệu cũ. AI coder không được triển khai các thành phần trong file này cho MVP.

## Không tạo trong MVP

- Không có `TutorialProgress`.
- Không có `tutorial` trong bootstrap response.
- Không có `useTutorialStore`.
- Không có `TutorialOverlay` hoặc `TutorialInputGuard`.
- Không có tutorial step, skip, replay hoặc tutorial reward.
- Không có crop timer 10 giây đặc biệt.
- Không có quest `Farmer's First Day`.

## Thay thế bằng onboarding nhẹ

MVP chỉ dùng các thành phần không chặn gameplay:

- Empty-state hint trong HUD nếu farm chưa có action gần đây.
- Tooltip ngắn khi người chơi mở lần đầu Market, Build Mode hoặc Chicken Coop.
- Các hint này là UI state cục bộ, không lưu server và không bắt buộc hoàn thành.

Hint không được chặn input, không được tạo request riêng và không được cấp reward.

Các yêu cầu canonical về initial state, economy, API, hạ tầng và QA nằm trong các file `24` đến `29`.
