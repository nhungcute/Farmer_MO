# B02 — Production artwork replacement contract audit

| Trường | Giá trị |
|---|---|
| ID | B02 |
| Tên | Production artwork replacement và approval audit |
| Trạng thái | BLOCKED |
| Owner | Asset workstream / art approval |
| Phụ thuộc | B01 DONE; approved production artwork and approval evidence |
| Đường dẫn sở hữu | `assets-src/**` chỉ khi có artwork được duyệt; `docs/assets/**`; task này |
| Đường dẫn cấm sửa | Renderer, animation runtime, asset IDs/frame IDs, FPS, pivot/anchor, atlas schema, backend, gameplay, economy/content definitions, Tutorial |
| Deliverables | Audit bằng chứng artwork/license/style approval và contract validation; chưa thay asset vì chưa có production source |
| Bắt đầu | 2026-09-30 |
| Kết thúc | Chưa kết thúc — chờ artwork được cung cấp và duyệt |
| Hoạt động hiện tại | BLOCKED — xác nhận tất cả source hiện tại vẫn là placeholder nội bộ |
| Hoạt động gần nhất | Kiểm tra inventory 188 asset/10 animation, license manifest và strict output validation |
| Hoạt động kế tiếp | Khi nhận artwork: đối chiếu ID/frame/canvas/FPS/loop/hold-last/event/pivot/anchor/atlas, rồi chạy strict validation và review approval |
| Tests | `node tools/asset-inventory.mjs`; `npm run assets:validate`; `npm run assets:validate:strict` |
| Blocker | Chưa có artwork production, license/source evidence, style approval hoặc release approval |

## Checklist

- [x] Inventory đầy đủ source asset, animation contract và category hiện tại.
- [x] Kiểm tra placeholder/license/source metadata cho toàn bộ inventory.
- [x] Kiểm tra style sheet và release approval evidence.
- [x] Audit asset ID, frame order, FPS, loop/hold-last, event, pivot/anchor và atlas contract.
- [x] Chạy asset inventory và strict validation trên bộ placeholder hiện tại.
- [ ] Nhận đủ production artwork hoặc mapping replacement được duyệt.
- [ ] Nhận license/source evidence, style approval và release approval.
- [ ] Thay artwork, visual review và đóng B02.

## Kết quả audit ngày 2026-09-30

- Inventory deterministic hiện có **188 source assets**, **10 animation contracts** và **8 categories**.
- Status hiện tại: `placeholder=188`, `production_ready=0`, `approved=0`.
- `assets-src/manifests/licenses.json` có 188/188 entry với `license=internal-placeholder` và `placeholder=true`; source được ghi là generated deterministic placeholder.
- `assets-src/style/style-sheet.md` xác nhận đây là placeholder style sheet và nêu rõ toàn bộ asset hiện tại không phải production art.
- Không tìm thấy bằng chứng release artwork, commercial/open-source license có thể dùng cho production, art-director style sign-off hoặc approval record.
- Không tự tạo/thay PNG và không thay đổi manifest contract trong khi blocker còn tồn tại.

## Contract audit

Các contract hiện tại vẫn giữ đúng thông tin cần bảo toàn khi thay artwork:

- static asset ID, source path, canvas/source scale, atlas, anchor và render offset;
- animation ID, state, direction, frame ID/order, FPS, loop và hold-last;
- event `FEED_CONSUMED` trên frame 2 của các hướng `animal_chicken.EAT`;
- bốn hướng gà `NE`, `SE`, `SW`, `NW` và các state runtime hiện có;
- các pond/effect/crop timelines theo contract trong `animation-manifest.json`.

Validation hiện tại đạt:

```text
Asset inventory PASS: 188 assets, 10 animations, 8 categories.
Asset validation PASS: 188 assets, 10 animations.
Asset strict validation PASS: 188 assets, 10 animations.
```

Các kết quả trên chỉ xác nhận tính đúng của placeholder và contract; chúng không phải bằng chứng artwork đã được duyệt để phát hành.

## Điều kiện mở B02

B02 chỉ chuyển sang RUNNING khi có đủ:

1. source artwork cho từng ID trong inventory hoặc một mapping replacement được phê duyệt;
2. bằng chứng license/source/creator/tool cho từng asset;
3. style approval của target release;
4. xác nhận kỹ thuật không đổi ID/frame order/FPS/loop/hold-last/event/pivot/anchor/atlas nếu không có change review riêng;
5. strict validation và visual review đạt trước khi đưa vào bundle.

Không mở Cloudflare hoặc RC artwork gate từ B02 khi các bằng chứng trên còn thiếu.
