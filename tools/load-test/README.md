# D02 PostgreSQL load probe

`postgres-runtime.mjs` là một phép đo bounded cho runtime PostgreSQL của MỠ FARM.
Script không tạo gameplay mới và không thay đổi content/economy. Nó dùng tên nhân vật
ngẫu nhiên để có thể chạy trên database disposable mà không cần xoá dữ liệu.

## Chạy

Khởi động API với `PERSISTENCE_DRIVER=postgres`, chạy migration, rồi đặt biến môi
trường sau:

```powershell
$env:LOAD_TEST_DATABASE_URL = "postgresql://mo_farm:change_me@127.0.0.1:15432/mo_farm_test"
$env:LOAD_TEST_API_URL = "http://127.0.0.1:3001"
node tools/load-test/postgres-runtime.mjs
```

Các giới hạn mặc định là `12` concurrent enter, `24` mutation mua feed, `12`
request duplicate idempotency và `12` mutation trong một batch. Có thể thay đổi
bằng `LOAD_TEST_CONCURRENT_ENTERS`, `LOAD_TEST_MUTATIONS`,
`LOAD_TEST_DUPLICATE_REQUESTS`, `LOAD_TEST_MUTATION_CONCURRENCY` và
`LOAD_TEST_TIMEOUT_MS`. Script xuất JSON gồm success/error theo status, min/max,
p50/p95/p99/average latency và các invariant đã kiểm tra.

Script không truncate database mặc định. Chỉ database disposable mới được phép
dùng thao tác xoá và phải đặt `ALLOW_DESTRUCTIVE_LOAD_TEST=1` rõ ràng.

## Invariant

- Một normalized name concurrent chỉ tạo đúng một character và các session còn lại
  trỏ về character đó.
- Mutation PostgreSQL song song không mất coin/inventory update và tăng
  `state_revision` đúng một lần cho mỗi mutation thật.
- Nhiều request cùng `Idempotency-Key` chỉ tạo một record và replay cùng response.
- Mutation lỗi `NOT_ENOUGH_ITEM` không đổi state/revision và không lưu idempotency row.
- Readiness phải là PostgreSQL readiness thật trước khi chạy tải.

Các con số trong output là baseline prototype của máy chạy test, không phải SLO
hay ngưỡng production.
