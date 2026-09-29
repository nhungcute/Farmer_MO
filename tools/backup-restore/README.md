# D02 PostgreSQL backup/restore drill

`postgres-drill.mjs` kiểm tra đường backup/restore bằng PostgreSQL thật. Script
chạy migration trên source hiện có và target disposable, tạo custom-format dump,
restore target, chạy migration lần nữa, rồi so sánh fingerprint của mọi bảng
runtime (bao gồm aggregate, session và idempotency).

## Yêu cầu

- Node.js >= 22 và dependency `pg` đã cài.
- PostgreSQL client tools `pg_dump` và `pg_restore` có trong `PATH`, hoặc Docker
  đang chạy để dùng fallback `BACKUP_USE_DOCKER=1`.
- Source và target là hai database khác nhau; target phải là disposable.

## Chạy

```powershell
$env:BACKUP_SOURCE_DATABASE_URL = "postgresql://mo_farm:change_me@127.0.0.1:15432/mo_farm_test"
$env:BACKUP_TARGET_DATABASE_URL = "postgresql://mo_farm:change_me@127.0.0.1:15433/mo_farm_restore"
$env:BACKUP_DUMP_PATH = "artifacts/d02/mo-farm.dmp"
node tools/backup-restore/postgres-drill.mjs
```

Khi máy chạy test không có PostgreSQL client tools, thêm
`$env:BACKUP_USE_DOCKER = "1"`; script sẽ dùng image `postgres:16.4-alpine` và
mount thư mục dump tạm thời vào container.

`BACKUP_SOURCE_DATABASE_URL` cũng có thể lấy từ `DATABASE_URL`. Dump bị xoá sau
khi kiểm tra thành công; đặt `BACKUP_KEEP_DUMP=1` để giữ artifact. Chỉ dùng
`BACKUP_SKIP_MIGRATION=1` khi harness đã chạy migration và muốn bỏ qua cả ba
lần gọi migration một cách có chủ đích.

Script không tự tạo hoặc xoá database, không gửi dữ liệu ra ngoài và không phải
production backup scheduler. RPO/RTO, encryption-at-rest, retention và object
storage chưa thuộc prototype gate này.
