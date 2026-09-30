# C02 — Functional Playwright E2E trên PostgreSQL

| Trường | Giá trị |
|---|---|
| ID | C02 |
| Tên | Functional Playwright E2E trên PostgreSQL runtime thật |
| Trạng thái | DONE |
| Owner | QA / Web integration |
| Phụ thuộc | A02 DONE |
| Đường dẫn sở hữu | `tests/e2e/c02-postgres.spec.mjs`, `tests/e2e/harness.mjs`, `playwright.config.mjs` |
| Đường dẫn cấm sửa | Renderer, animation, asset pipeline, content/economy definitions |
| Bắt đầu | 2026-09-30 |
| Kết thúc | 2026-09-30 |
| Hoat dong hien tai | DONE - parent review da xac nhan A03 gate va bang chung PG E2E |
| Hoạt động gần nhất | Đã chạy PG harness, workflow browser và restart/reload persistence; remote CI runs 36660295559 và 36662455574 đều PASS |
| Hoat dong tiep theo | Bao tri/duy tri gate; khong con hanh dong C02 truoc RC |
| Tests | C02: 1 passed, 2 intentional skips trên ba project; C01-scoped baseline: 5 passed, 5 intentional skips; remote browser gate PASS trong [36660295559](https://github.com/nhungcute/Farmer_MO/actions/runs/36660295559) và [36662455574](https://github.com/nhungcute/Farmer_MO/actions/runs/36662455574) |
| Blocker | Không có blocker kỹ thuật; cần database disposable khi chạy |

## Mục tiêu

Chạy một luồng Playwright same-origin với API thật sử dụng `PERSISTENCE_DRIVER=postgres`, thay cho FarmStore file adapter của C01. Database E2E phải là database disposable và được reset trước mỗi lần harness khởi động. C01 vẫn giữ file adapter làm mặc định để tương thích demo/test.

## Phạm vi đã kiểm tra

- vào thẳng farm và không có Tutorial;
- readiness phân biệt PostgreSQL thật;
- enter nhân vật mới và enter nhân vật đã tồn tại;
- bootstrap state starter từ PostgreSQL;
- mutation lỗi `PLOT_NOT_EMPTY` rollback và không tăng state revision;
- plant, replay cùng `Idempotency-Key`, advance timer và harvest;
- hoàn tất order để mở level 2;
- market sell/buy;
- xây pond và chicken coop;
- feed chicken, advance timer và collect egg;
- claim quest;
- restart API harness, reload trình duyệt và khôi phục session/aggregate từ PostgreSQL.

## Cách chạy

Chỉ chạy với database disposable. Ví dụ PowerShell khi PostgreSQL đã mở cổng host:

```powershell
$env:RUN_POSTGRES_E2E = '1'
$env:PW_PERSISTENCE_DRIVER = 'postgres'
$env:PW_DATABASE_URL = 'postgresql://mo_farm:change_me@localhost:55432/mo_farm'
npm run e2e -- --reporter=line tests/e2e/c02-postgres.spec.mjs
```

Harness tự chạy các migration `001`/`002`, truncate các bảng runtime, khởi tạo `PostgresFarmRepository`, rồi phục vụ web same-origin. `POST /__e2e/restart` chỉ là control endpoint local của harness để kiểm tra restart persistence; endpoint này không tồn tại trong API production.

## Checklist

- [x] Suite opt-in, không làm thay đổi C01 file/demo compatibility.
- [x] Dùng PostgreSQL runtime repository thật, không dùng mock repository.
- [x] Kiểm tra direct entry, existing entry và session cookie.
- [x] Kiểm tra bootstrap đầy đủ state starter.
- [x] Kiểm tra plant/harvest và transaction rollback.
- [x] Kiểm tra idempotency replay và state revision.
- [x] Kiểm tra market, pond, coop, feed, egg, order và quest.
- [x] Kiểm tra restart/reload persistence.
- [x] Không sửa renderer, animation, asset hoặc content definitions.

## Kết quả và blocker

Kết quả local ngày 2026-09-30: **1 passed, 2 skipped có chủ đích** (mobile Chromium và mobile-pwa bị skip vì C02 chạy một lần trên desktop Chromium). Test syntax và C01 suite vẫn phải chạy trong gate tổng.

Không có blocker kỹ thuật trong C02. C02 không mở Cloudflare; E01 chỉ được mở sau khi A03 và C02 cùng PASS theo dependency gate.

## Hoạt động kế tiếp

Đã đưa C02 vào gate tổng cùng A03 và C03. Hai remote CI run 36660295559 và 36662455574 đã chạy browser gate trên database disposable; tiếp tục không bật C02 bằng database dùng chung hoặc dữ liệu người dùng.
