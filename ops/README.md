# Vận hành và sao lưu

Các script trong thư mục này dùng cho môi trường prototype chạy bằng `compose.yaml`. Dữ liệu farm hiện được API lưu trong state adapter JSON tùy chọn (`STATE_FILE=/data/farm-state.json`); PostgreSQL và schema SQL được cung cấp để chuẩn bị cho lớp lưu trữ production. Vì vậy, bản sao lưu nên lấy cả PostgreSQL dump và state JSON khi state adapter đang bật.

## Sao lưu

Khởi động PostgreSQL trước khi chạy script:

```powershell
docker compose up -d db
.\ops\backup-db.ps1
```

Thư mục mặc định là `backups/` và đã được loại khỏi Git. Dump ở định dạng PostgreSQL custom kèm file JSON chứa thời điểm và SHA-256. Có thể sao lưu thêm state adapter:

```powershell
.\ops\backup-db.ps1 -IncludeApiState
```

Môi trường Linux/CI dùng wrapper tương đương:

```bash
INCLUDE_API_STATE=true ./ops/backup-db.sh
```

Script kiểm tra service đang chạy, tạo dump bên trong container rồi truyền qua base64 để không làm hỏng dữ liệu nhị phân khi chạy Windows PowerShell 5.1.

## Khôi phục

Kiểm tra file dump và hash metadata trước, sau đó chạy lệnh có cờ bắt buộc để tránh khôi phục nhầm:

```powershell
docker compose up -d db
.\ops\restore-db.ps1 -InputFile .\backups\mo-farm-db-20260101-000000Z.dump -Force
```

Trên Linux, cờ xác nhận được truyền qua biến môi trường:

```bash
FORCE=true ./ops/restore-db.sh ./backups/mo-farm-db-20260101-000000Z.dump
```

`pg_restore` dùng `--clean --if-exists --no-owner --exit-on-error`. Khôi phục PostgreSQL không tự khôi phục `farm-state.json`; nếu cần khôi phục state adapter, copy file state vào volume API và khởi động lại API sau khi đã dừng ghi dữ liệu.

## Kiểm tra nhanh

```powershell
docker compose ps
docker compose exec db pg_isready -U mo_farm -d mo_farm
docker compose logs --tail=100 api db
```

Các script không chứa thông tin đăng nhập. Giá trị kết nối lấy từ biến môi trường của service `db` trong Compose.
