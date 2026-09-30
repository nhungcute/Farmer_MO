# MỠ FARM — Production Art Style Guide (B02.1)

| Trường | Giá trị |
|---|---|
| Trạng thái | DONE — APPROVED WITH MINOR REVISIONS |
| Phạm vi | B02.1 style lock và B02.2 Chicken production candidate |
| Source of truth kỹ thuật | `assets-src/manifests/animation-manifest.json` |
| Asset contract | `assets-src/style/style-sheet.md`, `docs/assets/CHICKEN_PRODUCTION_CONTRACT.md` |
| Người duyệt cuối | Asset/art owner; agent chỉ đề xuất candidate |
| Ngày | 2026-09-30 |

Tài liệu này khóa art direction trước khi thay bất kỳ PNG Chicken nào. Nó không thay đổi asset ID, animation ID, manifest schema, renderer, animation runtime, gameplay, economy hoặc database. Mọi giá trị màu và mô tả hình ảnh bên dưới là art-direction rule; chúng không phải content definition và không được dùng để thay đổi logic game.

## 1. Phối cảnh và khung logic

- Phối cảnh là **2.5D isometric**.
- Tile logic chuẩn là **128 × 64 logical px**.
- World asset phải dùng cùng hướng nhìn và cùng cảm giác độ sâu; không trộn phối cảnh top-down, side-view hoặc perspective hội tụ.
- Terrain hiện tại có source canvas `256 × 128` ở `sourceScale=2`, tương đương tile logic `128 × 64`.
- Chicken dùng canvas `256 × 256`, `sourceScale=2`, anchor `{ x: 0.5, y: 0.9 }`, render offset `{ x: 0, y: 0 }`. Không tự đổi canvas hoặc anchor khi vẽ lại.
- Feet/contact point của Chicken nằm ổn định quanh cùng baseline trong cả bốn hướng và mọi frame.

## 2. Hướng hình ảnh

Phong cách mục tiêu:

- cozy, bright, cute cartoon farm;
- hình khối mềm, silhouette rõ, đọc được ở kích thước nhỏ;
- màu tươi nhưng không neon gắt;
- chi tiết đủ để nhận dạng state, không dùng texture nhỏ để thay cho silhouette;
- không pixel-art;
- không realistic;
- không dark/gritty;
- không dùng viền đen tuyệt đối nếu làm mất cảm giác mềm của style.

Mỗi asset phải đọc được trước ở silhouette, sau đó mới đến chi tiết bên trong. Chi tiết bên trong có độ tương phản thấp hơn biên ngoài và không được phá shape chính.

## 3. Ánh sáng, outline và bóng

### Ánh sáng

- Nguồn sáng khóa ở **trên-trái**.
- Mặt trên/trước nhận highlight nhẹ; mặt dưới/phía sau tối hơn.
- Không để mỗi frame hoặc mỗi hướng tự chọn hướng sáng khác nhau.
- Highlight không được nhấp nháy giữa các frame nếu state không mô tả thay đổi ánh sáng.

### Outline

- Outline mềm, có anti-aliasing, độ dày nhất quán trong cùng asset.
- Outline không đen tuyệt đối; ưu tiên họ xanh lá đậm/nâu ấm của palette.
- Interior detail mảnh và nhạt hơn silhouette.
- Không để outline bị mất khi thu nhỏ về viewport mobile.

### Shadow

- Shadow rơi về **dưới-phải**, cùng hướng với toàn bộ world.
- Contact shadow phải bám chân và không trượt giữa frame.
- Với Chicken hiện tại, giữ shadow/contact treatment trong cùng source canvas; không tự tạo layer runtime mới. Tách layer chỉ được phép qua contract review riêng.
- Shadow mềm, opacity vừa đủ để tách nhân vật khỏi grass/dirt; không dùng một mảng đen cứng.

## 4. Palette direction

Đây là palette baseline cho style review. Có thể tinh chỉnh sắc độ trong cùng color family khi owner review, nhưng không đổi mood hoặc độ tương phản nền/nhân vật.

| Nhóm | Baseline | Mục đích |
|---|---|---|
| Grass | `#79B85A`, highlight `#A7D96B`, shadow `#4D7E4A` | Nền cỏ và tile |
| Dirt | `#B8835C`, highlight `#D4A170`, shadow `#80563F` | Luống đất/lối đi |
| Wood | `#9A633F`, highlight `#C28A5A`, shadow `#68432F` | Coop, farmhouse, warehouse |
| Roof | `#D86D50`, shadow `#9B463B` | Mảng mái và điểm nhấn |
| Water | `#63B9D4`, deep `#3988B0`, highlight `#A5E3E1` | Pond và ripple |
| Foliage | `#4F9B55`, highlight `#8BCB68` | Cây và chi tiết xanh |
| Chicken body | `#FFF4DA`, shadow `#E5D0A8`, accent `#E5A45E` | Thân, cánh, bóng ấm |
| Chicken comb/beak | comb `#D95B5B`, beak `#F2B84B` | Nhận dạng Chicken |
| UI accent | `#F4C95D`, `#5B8E55` | HUD và trạng thái |

Không dùng gradient mạnh hoặc glow trắng để che lỗi silhouette. Màu `#000000` chỉ được dùng cho điểm mắt rất nhỏ nếu cần, không dùng làm outline hoặc shadow chính.

## 5. Source resolution và alpha

Rule bắt buộc:

```text
source pixels >= maximum logical display size × target renderer DPR × maximum camera zoom
```

Baseline runtime hiện tại:

- renderer DPR tối đa: `2`;
- camera max zoom: khoảng `1.30`;
- source Chicken: `256 × 256`, `sourceScale=2`;
- source Chicken hiện tương đương `128 × 128` logical canvas trước zoom.

Không tự nâng Chicken lên `@3x` hoặc đổi `sourceScale`; đó là contract change. Với canvas hiện tại, painted silhouette phải được kiểm tra ở DPR 2 và zoom 1.30. Không được kết luận sharpness chỉ từ kích thước canvas; nếu silhouette thực tế không đọc được thì ghi blocker để owner review.

Tất cả production world asset phải là PNG/WebP có alpha thật:

- nền trong suốt;
- không checkerboard bake-in;
- không màu nền cố định;
- không alpha fringe khác nhau giữa các frame;
- source Chicken phải giữ RGBA PNG `256 × 256`.

## 6. Canvas, anchor, pivot và scale

Frame trong cùng animation phải giữ:

- cùng canvas width/height;
- cùng anchor/pivot theo manifest;
- cùng baseline chân;
- cùng logical footprint;
- không auto-crop khác nhau;
- không đổi render offset để che jitter.

Scale reference dùng cho visual review:

| Đối tượng | Source canvas hiện tại | Logical canvas ở `sourceScale=2` | Ghi chú |
|---|---:|---:|---|
| Terrain | `256 × 128` | `128 × 64` | Tile chuẩn |
| Chicken | `256 × 256` | `128 × 128` | Hero asset; anchor `0.5,0.9` |
| Crop | `256 × 256` | `128 × 128` | Theo manifest hiện tại |
| Pond/building | `512 × 384` | `256 × 192` | Giữ base/footprint hiện tại |
| Plot | Chưa có asset ID | Chưa có contract | Chỉ là tham chiếu logic |
| Tree | Chưa có asset ID | Chưa có contract | Chỉ là tham chiếu logic |

Chicken phải đủ lớn để đọc state nhưng không được lớn hơn cảm giác tỷ lệ của coop/tile. Không dùng Plot hoặc Tree để tự suy ra asset contract vì manifest hiện tại chưa có ID cho hai đối tượng này.

## 7. Ngôn ngữ chuyển động Chicken

Giữ đúng state và timing trong manifest:

- **IDLE**: thở nhẹ, đầu/thân dịch chuyển rất nhỏ; loop sạch.
- **WALK**: chu kỳ chân/thân rõ, chân không trượt; loop kín.
- **EAT**: đầu/thân cúi và nâng rõ; event `FEED_CONSUMED` vẫn ở frame `2`.
- **HAPPY**: chuyển động ngắn, vui và đọc được; không dùng flash quá mạnh.
- **SLEEP**: chuyển động nhẹ, kín đáo; loop chậm.
- **PRODUCT_READY**: trạng thái dễ nhận biết, tiết chế; không glow quá flashy.

Không thêm state, không xóa state, không đổi frame count/FPS/loop/holdLast và không chuyển event sang frame khác để phù hợp artwork mới.

## 8. Direction và mirror

Chicken phải có bốn hướng thật:

```text
NE, SE, SW, NW
```

Manifest khóa `mirrorAllowed=false`. Không mirror frame Chicken để tiết kiệm công việc. Đặc biệt không mirror khi có comb, beak, marking, accessory, asymmetry hoặc baked directional lighting.

## 9. Mobile readability

Style review bắt buộc kiểm tra ít nhất các viewport:

```text
932 × 430
915 × 412
844 × 390
740 × 360
```

Ở default zoom và max zoom:

- silhouette Chicken phải nhận ra ngay;
- mắt/comb/beak không biến thành nhiễu;
- chân không mất khỏi baseline;
- không dựa vào texture cực nhỏ;
- không blur rõ ở DPR 2;
- không có halo/alpha fringe;
- Chicken gần building, pond, grass và dirt vẫn đọc được.

## 10. Approval model

Các trạng thái tách biệt:

| Trạng thái | Ý nghĩa |
|---|---|
| `placeholder=true` | Art nội bộ/deterministic, không được phát hành |
| `placeholder=false` | Source đã thay, nhưng chưa đủ technical/style/release approval |
| `production_ready=true` | Technical review PASS, metadata/license/source đầy đủ; vẫn chưa là approval cuối |
| `approved=true` | Owner/art approver đã duyệt cho target release |

Mỗi Chicken source hoặc source group phải có `source`, `creator`, `tool`, `license`, `contentVersion`, `placeholder`, `production_ready`, `technicalReview`, `styleReview` và `approvalRef` theo schema mapping đã được document. Agent chỉ được đề xuất candidate; không tự đặt `approved=true`, không tự tạo `approvalRef` và không dùng strict validation thay cho style/release approval.

## 11. Acceptance B02.1

B02.1 chỉ được chuyển `DONE` khi style guide này được owner xác nhận và các rule sau đã được ghi rõ:

- perspective/tile;
- visual direction;
- lighting/outline/palette;
- source resolution/alpha;
- canvas/anchor/scale;
- shadow;
- animation motion;
- direction/mirror;
- mobile readability;
- metadata/license/approval model.

B02.1 không tự đóng B02 tổng và không mở E01/RC01.

Owner review Revision 2 xác nhận style direction `APPROVED WITH MINOR REVISIONS`: concept Chicken, palette, facial identity, silhouette, lighting, shadow, canvas và anchor được giữ nguyên. Các minor revisions còn lại thuộc B02.2-PROOF Revision 2 (scale consistency, micro-detail, shading và EAT motion), không thay đổi style contract.
