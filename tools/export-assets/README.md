# Pipeline asset deterministic

Pipeline này tạo placeholder nội bộ, kiểm tra manifest, pack atlas PNG tương thích PixiJS 8 và tạo preview HTML có trình phát animation. Input duy nhất là `assets-src/` và `assets-src/manifests/animation-manifest.json`; atlas trong `apps/web/public/assets/` là output được sinh lại.

Chạy từ root repository:

```text
node tools/export-assets/index.mjs generate
node tools/export-assets/index.mjs validate
node tools/export-assets/index.mjs pack
node tools/export-assets/index.mjs validate --strict-output
node tools/export-assets/index.mjs preview
```

Hoặc chạy toàn bộ chu trình bằng `pnpm assets:build` (có thể dùng `npm run` nếu máy chưa cài pnpm). Chu trình build tạo 188 frame placeholder, kiểm tra source, pack atlas, kiểm tra output strict và sinh preview.

Trong root `package.json`, các lệnh tương ứng là `pnpm assets:generate`, `pnpm assets:validate`, `pnpm assets:validate:strict`, `pnpm assets:pack` và `pnpm assets:preview`.

Pipeline không cần dependency runtime bên ngoài Node.js. PNG source và atlas được mã hóa/đọc bằng implementation deterministic trong `lib.mjs`; vì vậy CI không phụ thuộc ImageMagick hoặc công cụ desktop. Asset production có thể thay placeholder bằng PNG RGBA cùng kích thước/anchor theo manifest.

Output:

```text
apps/web/public/assets/atlases/*.png
apps/web/public/assets/atlases/*.json
apps/web/public/assets/manifests/animation-manifest.json
apps/web/public/assets/preview/animation-preview.html
```

Preview có trình phát canvas cho từng animation, chọn được state/hướng và hiển thị FPS/khung hiện tại. Preview nạp trực tiếp JSON atlas nên có thể mở bằng `file://` mà không cần web server.

Mỗi frame source có `placeholder: true`, `license: internal-placeholder`, `source`, `tool`, `toolVersion`, `creator` và metadata tương ứng trong `assets-src/manifests/licenses.json`. Không dùng placeholder làm production art khi chưa có review license/style.
