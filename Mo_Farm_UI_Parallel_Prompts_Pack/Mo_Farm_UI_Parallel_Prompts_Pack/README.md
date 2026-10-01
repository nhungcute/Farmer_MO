# Mỡ Farm UI Parallel Prompt Pack

Thứ tự chạy:

1. Chạy `00_UI00_SHARED_FOUNDATION.md` trước.
2. Sau khi UI00 hoàn tất và commit, chạy song song các file `01` đến `20`.
3. Sau khi toàn bộ task song song xong, chỉ chạy `99_UI99_INTEGRATION_OWNER.md`.

Khuyến nghị:
- Mỗi file = một agent/thread riêng.
- Không cho screen-agent sửa shared foundation.
- Shared changes phải ghi vào `docs/ui/SHARED_CHANGE_REQUESTS.md`.
- Không restart cloudflared trong các task UI.
