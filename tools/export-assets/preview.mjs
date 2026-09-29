import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT_ROOT, readManifest, readJson, ensureDir, relativeToRoot } from './lib.mjs';

const manifest = readManifest();
const previewDir = path.join(OUTPUT_ROOT, 'preview');
ensureDir(previewDir);

const esc = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const frameCatalog = {};
const atlasMarkup = Object.entries(manifest.atlasGroups).map(([groupKey, group]) => {
  const generated = manifest.generated?.pages?.[group] ?? [];
  const files = generated.length ? generated : [{ image: `${group}.png`, json: `${group}.json` }];
  const figures = files.map((file) => {
    const jsonPath = path.join(OUTPUT_ROOT, 'atlases', file.json);
    if (fs.existsSync(jsonPath)) {
      const page = readJson(jsonPath);
      for (const [id, entry] of Object.entries(page.frames ?? {})) {
        frameCatalog[id] = {
          image: `../atlases/${file.image}`,
          frame: entry.frame,
          sourceSize: entry.sourceSize,
          pivot: entry.pivot,
        };
      }
    }
    return `<figure><figcaption>${esc(file.image)}</figcaption><img src="../atlases/${esc(file.image)}" loading="lazy" alt="Bộ atlas ${esc(groupKey)}" /></figure>`;
  }).join('');
  return `<section><h2>Bộ atlas ${esc(groupKey)}</h2>${figures}</section>`;
}).join('');

const playerMarkup = Object.values(manifest.animations).map((animation) => `<article class="player" data-animation="${esc(animation.id)}">
  <h3>${esc(animation.id)}</h3>
  <p class="meta">Bộ atlas: <code>${esc(animation.atlas)}</code> · Hướng: ${esc(animation.directions.join(', '))}</p>
  <div class="player-controls">
    <label>Trạng thái <select data-role="state" aria-label="Trạng thái"></select></label>
    <label>Hướng <select data-role="direction" aria-label="Hướng"></select></label>
    <button type="button" data-role="toggle">Dừng</button>
  </div>
  <canvas data-role="canvas" width="256" height="256" aria-label="Bản xem trước ${esc(animation.id)}"></canvas>
  <p data-role="status" class="status" aria-live="polite">Đang tải…</p>
</article>`).join('');

const animationRows = Object.values(manifest.animations).map((animation) => {
  const states = Object.entries(animation.animations).map(([state, directionMap]) => Object.entries(directionMap).map(([direction, clip]) => {
    if (clip.mirrorOf) return `<li><b>${esc(state)} / ${esc(direction)}</b>: dùng hướng ${esc(clip.mirrorOf)}</li>`;
    return `<li><b>${esc(state)} / ${esc(direction)}</b>: ${clip.frames.length} khung hình · ${clip.fps} FPS · ${clip.loop ? 'lặp' : 'một lần'}${clip.holdLast ? ' · giữ khung cuối' : ''}</li>`;
  }).join('')).join('');
  return `<article><h3>${esc(animation.id)}</h3><p class="meta">Bộ atlas: <code>${esc(animation.atlas)}</code> · Hướng: ${esc(animation.directions.join(', '))}</p><ul>${states}</ul></article>`;
}).join('');

// Embed metadata so the preview also works from file:// without fetch/CORS.
const previewData = JSON.stringify({ animations: manifest.animations, frames: frameCatalog }).replaceAll('<', '\\u003c');
const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MO Farm — kiểm tra animation</title>
<style>
:root{font-family:system-ui,sans-serif;color:#26352b;background:#f5f0e5}body{margin:24px;line-height:1.45}h1{color:#315d3c}h2{margin-top:0}section,article{background:#fff;border:1px solid #d8cdb9;border-radius:12px;padding:16px;margin:16px 0}
figure{display:inline-flex;vertical-align:top;flex-direction:column;gap:8px;margin:8px;padding:8px;background:#eef6e9;border-radius:8px;max-width:calc(100% - 32px)}figure img{display:block;max-width:min(90vw,1024px);height:auto;background:repeating-conic-gradient(#eee 0% 25%,#fff 0% 50%) 50%/16px 16px}figcaption,code{font-family:ui-monospace,monospace;font-size:13px}code{background:#eef6e9;padding:2px 5px;border-radius:4px}li{margin:4px 0}.meta{color:#53665a}
.player{display:grid;grid-template-columns:minmax(220px,320px) 1fr;gap:8px 20px;align-items:start}.player h3,.player .meta{grid-column:1/-1;margin:0}.player-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:end}.player-controls label{display:flex;flex-direction:column;gap:4px;font-size:14px}.player-controls select,.player-controls button{font:inherit;padding:7px 9px;border:1px solid #b9cbb8;border-radius:6px;background:#fff}.player-controls button{cursor:pointer;background:#315d3c;color:#fff}.player canvas{width:min(100%,320px);height:auto;aspect-ratio:1;background:repeating-conic-gradient(#eee 0% 25%,#fff 0% 50%) 50%/16px 16px;image-rendering:auto;border:1px solid #d8cdb9;border-radius:8px}.status{font-size:13px;color:#53665a;margin:0}.warning{padding:10px;background:#fff8d8;border-left:4px solid #d5a72a}@media (max-width:700px){body{margin:12px}.player{display:block}.player-controls{margin:12px 0}.player canvas{max-width:100%}}
</style></head>
<body><h1>MO Farm — bản xem trước asset và animation</h1><p>Phiên bản nội dung: <code>${esc(manifest.contentVersion)}</code>. Tất cả hình hiện tại là placeholder nội bộ.</p><p class="warning">Bản xem trước dùng cùng manifest và atlas sẽ được nạp bởi renderer Pixi. Hãy thay placeholder bằng source đã duyệt trước khi phát hành.</p>
<h2>Trình phát animation</h2>${playerMarkup || '<p>Chưa có animation trong manifest.</p>'}<h2>Thông số animation</h2>${animationRows || '<p>Chưa có animation trong manifest.</p>'}<h2>Bộ atlas</h2>${atlasMarkup}<noscript><p class="warning">Cần bật JavaScript để chạy trình phát animation.</p></noscript>
<script>
const DATA = ${previewData};
const players = [...document.querySelectorAll('[data-animation]')];
const imageCache = new Map();
const loadImage = (src) => { if (!imageCache.has(src)) { const image = new Image(); image.src = src; imageCache.set(src, image); } return imageCache.get(src); };
const getClip = (animation, state, direction) => { const directionMap = animation.animations[state] ?? {}; const selected = directionMap[direction] ?? directionMap[animation.defaultDirection] ?? directionMap[animation.directions[0]]; if (selected?.mirrorOf) return directionMap[selected.mirrorOf] ?? selected; return selected; };
const option = (value) => { const node = document.createElement('option'); node.value = value; node.textContent = value; return node; };
for (const player of players) {
  const animation = DATA.animations[player.dataset.animation]; const stateSelect = player.querySelector('[data-role="state"]'); const directionSelect = player.querySelector('[data-role="direction"]'); const toggle = player.querySelector('[data-role="toggle"]'); const canvas = player.querySelector('[data-role="canvas"]'); const status = player.querySelector('[data-role="status"]'); const context = canvas.getContext('2d');
  const stateNames = Object.keys(animation.animations); stateNames.forEach((state) => stateSelect.append(option(state))); stateSelect.value = stateNames[0]; animation.directions.forEach((direction) => directionSelect.append(option(direction))); directionSelect.value = animation.defaultDirection ?? animation.directions[0];
  let frameIndex = 0; let timer = null; let running = true;
  const render = () => { const clip = getClip(animation, stateSelect.value, directionSelect.value); if (!clip?.frames?.length) { status.textContent = 'Không tìm thấy khung hình'; return; } const frameId = clip.frames[Math.min(frameIndex, clip.frames.length - 1)].id; const asset = DATA.frames[frameId]; if (!asset) { status.textContent = 'Thiếu frame ' + frameId; return; } const image = loadImage(asset.image); if (!image.complete || !image.naturalWidth) { image.onload = render; status.textContent = 'Đang tải khung hình…'; return; } const width = asset.sourceSize?.w ?? asset.frame.w; const height = asset.sourceSize?.h ?? asset.frame.h; if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; } context.clearRect(0, 0, width, height); context.drawImage(image, asset.frame.x, asset.frame.y, asset.frame.w, asset.frame.h, 0, 0, width, height); status.textContent = stateSelect.value + ' / ' + directionSelect.value + ' · khung ' + (frameIndex + 1) + '/' + clip.frames.length + ' · ' + clip.fps + ' FPS'; };
  const start = () => { clearInterval(timer); running = true; toggle.textContent = 'Dừng'; frameIndex = 0; render(); const advance = () => { const clip = getClip(animation, stateSelect.value, directionSelect.value); if (!clip?.frames?.length) return; if (frameIndex >= clip.frames.length - 1) { if (!clip.loop) { clearInterval(timer); running = false; toggle.textContent = 'Phát'; if (clip.holdLast) render(); return; } frameIndex = 0; } else frameIndex += 1; render(); }; const clip = getClip(animation, stateSelect.value, directionSelect.value); timer = setInterval(advance, Math.max(16, 1000 / (clip?.fps || 1))); };
  stateSelect.addEventListener('change', start); directionSelect.addEventListener('change', start); toggle.addEventListener('click', () => { if (running) { clearInterval(timer); running = false; toggle.textContent = 'Phát'; } else start(); }); start();
}
</script></body></html>`;
fs.writeFileSync(path.join(previewDir, 'animation-preview.html'), html, 'utf8');
fs.writeFileSync(path.join(previewDir, 'README.txt'), 'Mở animation-preview.html bằng trình duyệt. Trình phát dùng manifest và atlas đã pack bằng pipeline deterministic.\n', 'utf8');
console.log(`Đã tạo preview: ${relativeToRoot(path.join(previewDir, 'animation-preview.html'))}`);
