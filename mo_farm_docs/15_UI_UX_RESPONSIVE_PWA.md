# 15 — UI/UX, RESPONSIVE & PWA

## 1. Visual target

Phong cách:

- Cream panel.
- Wood frame.
- Grass green.
- Dark green.
- Sky blue.
- Water blue.
- Gold/yellow.
- Coral red danger.
- Rounded corners.
- Soft shadow.
- Icon có volume/cartoon 2.5D.

## 2. UI architecture

```text
GameShell
├── PixiCanvas
├── TopHud
├── LeftActions
├── QuestPanel
├── BottomToolbar
├── FloatingFeedback
├── ModalHost
└── OnboardingHint
```

## 3. Scale strategy

Không dùng `%` cho toàn bộ UI.

Dùng:

```css
clamp()
rem
vmin
media queries
safe-area
```

Ví dụ:

```css
.resource-bar {
  height: clamp(34px, 5.2vh, 56px);
}

.toolbar-button {
  width: clamp(54px, 7vw, 84px);
  height: clamp(54px, 11vh, 84px);
}
```

## 4. Responsive breakpoints theo chiều cao

Landscape mobile thường bị giới hạn height, nên cần quan tâm `max-height`.

Ví dụ:

```css
@media (max-height: 500px) { ... }
@media (min-height: 501px) and (max-height: 720px) { ... }
```

## 5. HUD mobile

Trên mobile nhỏ:

- Quest panel collapsed.
- Inventory popup không luôn mở.
- Resource bar rút gọn.
- Toolbar 5–6 nút chính + More nếu cần.
- Avatar nhỏ hơn desktop.

## 6. Modal

Warehouse/Market:

- Desktop: centered panel.
- Mobile landscape: gần full viewport nhưng giữ safe-area.
- Scroll nội bộ.
- Close button target lớn.

## 7. Portrait overlay

```css
@media (orientation: portrait) {
  #game-root { display: none; }
  #rotate-overlay { display: flex; }
}
```

## 8. PWA manifest

```json
{
  "name": "Mỡ Farm",
  "short_name": "Mỡ Farm",
  "start_url": "/",
  "display": "fullscreen",
  "orientation": "landscape",
  "theme_color": "#7FC64B",
  "background_color": "#FFF7E6"
}
```

## 9. Service Worker cache

Cache:

- App shell.
- Common UI assets.
- Frequently used farm textures.

Không cache API mutation.

Bootstrap nên network-first hoặc no-store tùy thiết kế.

## 10. Install

Hiện custom install prompt nếu browser hỗ trợ.

Không ép người chơi cài PWA mới được chơi.

## 11. Font

Ưu tiên bundled webfont hợp pháp, nhưng cần fallback.

Không dùng font quá nặng ảnh hưởng load.

## 12. Accessibility

- Touch target >= 44px.
- Text contrast đủ.
- Không chỉ dùng màu đỏ/xanh để báo valid; thêm icon check/x.
- Có reduce motion option trong Settings future.

## 13. Acceptance

- Không overflow trên 740x360.
- HUD không che > ~25% màn hình farm khi idle.
- Modal thao tác được bằng touch.


## 14. Prototype warning

Màn hình nhập tên phải hiển thị ngắn gọn:

```text
Đây là bản demo. Farm không riêng tư; người biết tên nhân vật có thể vào farm.
Không nhập thông tin cá nhân.
```

Warning không chặn người chơi và không cần lưu server.

## 15. Quy tắc ngôn ngữ giao diện

Toàn bộ text người chơi nhìn thấy phải là tiếng Việt có dấu. Không để English fallback trong giao diện production/demo.

Các nhóm bắt buộc Việt hóa:

```text
Login, HUD, toolbar, modal, tab, tooltip, hint
Tên crop/building/item/animal/order/quest
Loading, saving, saved, offline, retry, error
Thông báo thiếu coin/item, kho đầy, crop chưa chín
Build valid/invalid, confirmation, reward, rotate overlay
Button label, aria-label, title, alt text và screen-reader text
```

Quy tắc triển khai:

- Locale mặc định: `vi-VN`.
- Dùng localization key, không hardcode user-facing string trong component.
- English chỉ dùng cho code identifier, API route, asset ID, database field, log/debug và manifest.
- Không render trực tiếp `chicken_feed`, `NOT_ENOUGH_COINS`, `BUILDING_COLLISION` hoặc `order_rice_3`.
- Tên nhân vật giữ nguyên Unicode khi hiển thị.
- Số, ngày giờ và currency format bằng `Intl.*` với `vi-VN`.
- Nếu thiếu translation key, CI phải fail; không âm thầm hiển thị key hoặc English.

Glossary tối thiểu:

| Technical ID | Text giao diện |
|---|---|
| `Enter Farm` | `Vào nông trại` |
| `Warehouse` | `Kho` |
| `Market` | `Chợ` |
| `Orders` | `Đơn hàng` |
| `Build Mode` | `Xây dựng` |
| `Chicken Coop` | `Chuồng gà` |
| `Pond` | `Ao` |
| `chicken_feed` | `Thức ăn gà` |
| `egg` | `Trứng` |
| `coins` | `Xu` |
| `diamonds` | `Kim cương` |
| `NOT_ENOUGH_COINS` | `Không đủ Xu` |
| `WAREHOUSE_FULL` | `Kho đã đầy` |
| `CROP_NOT_READY` | `Cây chưa chín` |

Mọi glossary mới phải được thêm vào localization catalog và review bằng tiếng Việt trước khi merge.
