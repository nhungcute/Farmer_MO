# Mỡ Farm — bản đồ tương tác theo Design Pack

Nguồn đối chiếu là sáu ảnh trong `Mo_Farm_UI_Design_Pack/Mo_Farm_UI_Design_Pack/`. Phần chơi đã bỏ cách dùng ảnh toàn cảnh rồi đặt vùng bấm lên trên. `ReferenceFarmRenderer`, HUD ảnh nền và các kiểm thử ánh xạ ảnh cũ đã được gỡ.

## Bản đồ và thao tác

- Pixi dựng từng nhà, ruộng, cây trồng, ao và gà từ dữ liệu người chơi. Đường đi, hàng rào, bờ nước và nền cỏ được dựng trong scene; cây trang trí là sprite riêng có alpha.
- Kéo bản đồ, cuộn chuột, chụm hai ngón hoặc dùng nút camera để thay đổi khung nhìn. HUD giữ nguyên vị trí. Khung nhìn ban đầu chừa chỗ cho công cụ để người chơi bấm được gà.
- Bộ chọn dùng vị trí thật và vùng alpha của sprite. Một lần chạm chỉ gửi một lựa chọn vật thể hoặc ô đất. Kéo, hủy chạm và kết thúc chụm hai ngón không tạo hành động trong game.
- Gieo hạt hiển thị cây mới; cây đổi qua hạt, ba giai đoạn lớn và chín dựa trên `plantedAt`/`readyAt` từ API. Thu hoạch xóa cây khỏi ruộng và cập nhật kho.
- Cây lay nhẹ, gà có chuyển động, ao có gợn nước. Hiệu ứng hình ảnh không cấp vật phẩm hay phần thưởng.
- Xây dựng có bóng xem trước xanh/đỏ theo diện tích trống. Công trình đã xây xuất hiện đúng ô, được lưu và khôi phục khi tải lại.
- Dữ liệu Xu, vật phẩm, cấp độ, đơn hàng và nhiệm vụ vẫn do API quản lý. Canvas 2D dựng vật thể được giữ làm dự phòng nếu không khởi tạo được Pixi.

## Giao diện

`LiveHud.js` và `live-game.css` tạo các nút, thanh tài nguyên, bảng nhiệm vụ và công cụ bằng HTML/CSS/SVG. Kho và cửa hàng là các thành phần tương tác, có lọc, chọn số lượng, giỏ thức ăn, bán hàng và kiểm tra điều kiện mua. Các chức năng chưa có API vẫn hiển thị trạng thái chưa mở.

Đăng nhập và tải game còn dùng minh họa từ ảnh mẫu. Kho/cửa hàng tái sử dụng một số hình vật phẩm và chi tiết trang trí. **Ảnh toàn cảnh nông trại không được dùng làm bản đồ chơi.**

Bản mới theo bố cục, bảng màu và phong cách nông trại của Design Pack; chưa trùng từng pixel với ảnh. Sprite công trình/cây trồng đang dùng bộ atlas của dự án, cây trang trí được tạo riêng. Các ảnh mẫu phẳng không chứa đầy đủ lớp vật thể và mọi trạng thái chơi.

## Tài nguyên cây trang trí

- Công cụ: imagegen tích hợp, chỉnh theo ảnh tham chiếu `03_Farm_Full.png`, bật nền trong suốt.
- Tệp: [`orchard-tree-v1.png`](../../apps/web/public/assets/design/sprites/orchard-tree-v1.png), 1317×1194, RGBA.
- Prompt đầy đủ: [`orchard-tree-v1.prompt.txt`](../../apps/web/public/assets/design/sprites/orchard-tree-v1.prompt.txt).
- Không dùng CLI, khóa API hoặc hậu xử lý cắt ảnh; tệp sinh được sao chép vào dự án và nạp thành sprite độc lập.

## Kiểm tra

- 25 ca E2E phù hợp thiết bị đạt: 16 desktop và 9 điện thoại.
- Bộ E2E kiểm tra thao tác camera, cảm ứng kéo/chụm/chạm, thu hoạch thay đổi vùng ảnh của cây và dữ liệu kho, gieo trồng, xây bằng canvas, cho gà ăn/thu trứng, mua bán, giới hạn Xu/kho, nhiệm vụ và khôi phục phiên. Có ca riêng khởi tạo Pixi và thu hoạch với đúng Content Security Policy của production.
- 30 kiểm thử renderer đạt, gồm 7 kiểm tra sự kiện chuột/chạm và 7 kiểm tra giai đoạn lớn của cây.
- 6 kiểm thử phục vụ tệp tĩnh đạt. Kiểm tra cú pháp và tiếng Việt đạt.
- Các bài E2E bấm trực tiếp canvas Pixi và kiểm tra không có phần tử giao diện che điểm bấm; không vô hiệu hóa canvas để bấm renderer dự phòng.
- Kiểm tra HTTPS public đạt: 9 mô-đun khớp bản đã kiểm tra, Pixi chạy với CSP hiện tại, thu hoạch bằng canvas được lưu qua tải lại vào PostgreSQL, kho/cửa hàng mở được và có ảnh điện thoại; không ghi nhận lỗi trình duyệt/tài nguyên. Tunnel được giữ nguyên khi cập nhật.

```powershell
npm run renderer:vendor
npm run check:syntax
npm run check:localization
npm run renderer:test
node --test tests/web/static-server.test.mjs
npx playwright test tests/e2e/direct-entry.spec.mjs tests/e2e/design-ui.spec.mjs tests/e2e/live-world.spec.mjs --project=chromium
npx playwright test tests/e2e/direct-entry.spec.mjs tests/e2e/design-ui.spec.mjs tests/e2e/live-world.spec.mjs --project=mobile-chromium
```

Ảnh mới trong `artifacts/live-game/`: [nông trại khởi đầu](../../artifacts/live-game/04-farm-starter-desktop.png), [nông trại đầy đủ](../../artifacts/live-game/03-farm-full-desktop.png), [màn ngang điện thoại](../../artifacts/live-game/03-farm-full-mobile.png), [kho](../../artifacts/live-game/05-warehouse-desktop.png), [cửa hàng](../../artifacts/live-game/06-shop-desktop.png). Nông trại cấp 4 trong ảnh được chuẩn bị bằng API của máy chủ kiểm thử, không sửa dữ liệu người chơi public. Thư mục `artifacts/ui-reference/` lưu ảnh của phiên bản cũ.

## Chạy và cập nhật

```powershell
node tests/e2e/harness.mjs
```

Máy chủ kiểm thử tại `http://127.0.0.1:4173` có dữ liệu tạm và điều khiển thời gian; chỉ dùng cục bộ. Bản public dùng Docker và PostgreSQL.

```powershell
npm run e01:app:update
node tools/quick-tunnel.mjs status
```

Cập nhật ứng dụng giữ nguyên cơ sở dữ liệu và tunnel đang chạy. Các mô-đun chính: `main.js`, `ui/LiveHud.js`, `ui/FarmInterface.js`, `ui/PanelLayout.js`, `game/pixi/PixiFarmRenderer.js`, `game/pixi/scene/FarmScene.js`, `game/pixi/systems/InputController.js`, `game/core/cropPresentation.js`.

Gói Pixi được esbuild đóng cùng mô-đun chính thức `pixi.js/unsafe-eval`. Mô-đun này thay việc sinh hàm động bằng các hàm thông thường để chạy được khi CSP cấm eval; không nới chính sách của Nginx. Atlas được tải trên luồng chính bằng `preferWorkers: false`, tránh worker dạng blob bị CSP chặn. Docker và lệnh `renderer:vendor` dùng chung `apps/web/build/vendor-pixi.mjs`. Import map có phiên bản query để trình duyệt tải gói tương thích mới.
