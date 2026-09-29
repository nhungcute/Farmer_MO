# Cấu hình persistence runtime

API chỉ nhận hai giá trị `PERSISTENCE_DRIVER`:

- `file`: dùng `FarmStore` memory/JSON cho demo. Không yêu cầu PostgreSQL. Khi `STATE_FILE` được cấu hình, adapter ghi state JSON atomic.
- `postgres`: dùng pool PostgreSQL và repository runtime. `DATABASE_URL` là bắt buộc; API readiness chỉ đạt khi truy vấn `SELECT 1` thành công.

Giá trị khác bị từ chối với lỗi cấu hình `INVALID_PERSISTENCE_DRIVER`; API không tự động rơi về adapter khác vì điều đó có thể làm mất tính bền vững mà người vận hành đã chọn.

`GET /healthz` ở Nginx chỉ kiểm tra process web gateway còn sống. `GET /api/health/ready` kiểm tra adapter persistence thực tế: file adapter phải được khởi tạo, còn PostgreSQL phải trả lời health query. Khi PostgreSQL không khả dụng, route readiness phải trả trạng thái HTTP không thành công và không được báo `ready` giả.

Compose giữ `file` làm mặc định cho demo. Job `migrate` luôn đặt `PERSISTENCE_DRIVER=postgres` vì nó chỉ chạy khi áp dụng migration SQL cho database; giá trị này không thay đổi driver của API.
