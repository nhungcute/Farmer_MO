const ICONS = {
  quests: '<path fill="#b97635" d="M14 9h36v44H14z"/><rect x="17" y="12" width="30" height="37" rx="4" fill="#fff8db"/><rect x="25" y="7" width="15" height="9" rx="3" fill="#dc9951"/><path d="m22 25 3 3 5-6m-8 15 3 3 5-6" fill="none" stroke="#7ca73d" stroke-width="3"/><path d="M34 26h8m-8 11h8" stroke="#b79360" stroke-width="3"/>',
  orders: '<path fill="#c89043" d="m8 23 24-13 24 13-24 14z"/><path fill="#aa682e" d="M8 23v27l24 12V37z"/><path fill="#dfaa58" d="M32 37v25l24-12V23z"/><path fill="#ffda85" d="m21 16 25 14v13l-8 4V35L15 20z"/><path d="m13 32 13 6m-13 6 13 6m12-11 13-7m-13 18 13-7" stroke="#835322" stroke-width="2.5"/>',
  shop: '<rect x="11" y="25" width="42" height="29" rx="3" fill="#f6d58e"/><path fill="#bd6635" d="M15 53V31h34v22"/><rect x="18" y="34" width="13" height="12" rx="2" fill="#b3dba5"/><path fill="#ffedb8" d="M36 35h10v19H36z"/><path fill="#fff9df" d="m12 9-6 17c0 9 11 10 13 1 2 9 11 9 13 0 2 9 11 9 13 0 2 9 13 8 13-1L52 9z"/><path fill="#e46742" d="m12 9-6 17c0 9 11 10 13 1l4-18zm21 0-1 18c2 9 11 9 13 0L42 9z"/><path d="M12 9h40" stroke="#9e542d" stroke-width="3"/>',
  warehouse: '<path fill="#b77532" d="M23 10c0-8 20-8 20 0v8h-5v-8c0-3-10-3-10 0v8h-5z"/><rect x="10" y="13" width="45" height="43" rx="12" fill="#cf9149"/><rect x="15" y="16" width="35" height="23" rx="9" fill="#e9b467"/><path fill="#ac6b32" d="M17 35h32v15H17z"/><rect x="25" y="28" width="12" height="18" rx="4" fill="#f7ca79"/><rect x="28" y="34" width="6" height="7" rx="1" fill="#99622c"/>',
  build: '<path d="m19 51 25-29" stroke="#75472a" stroke-width="13" stroke-linecap="round"/><path d="m19 49 24-28" stroke="#cb9350" stroke-width="8" stroke-linecap="round"/><path fill="#748c95" d="m22 11 9-8 23 21-9 10z"/><path fill="#b5c8c8" d="m22 11 6-5 23 21-6 6z"/><path d="m21 12 25 22m6-13 5 4" stroke="#546a75" stroke-width="3" stroke-linecap="round"/>',
  crops: '<path d="M32 55V28" fill="none" stroke="#5b8b29" stroke-width="5" stroke-linecap="round"/><path fill="#79b83b" stroke="#437c27" stroke-width="2" d="M32 36C9 35 8 18 10 12c18-1 26 8 22 24Z"/><path fill="#a4d54c" stroke="#437c27" stroke-width="2" d="M32 31c-2-17 10-25 24-23 1 18-9 27-24 23Z"/><path d="m15 17 17 18m1-5L50 13" stroke="#d0e989" stroke-width="2" fill="none"/><ellipse cx="32" cy="57" rx="17" ry="4" fill="#a27b3f" opacity=".25"/>',
  decor: '<path fill="#c18a4b" d="M11 30h42l-5 29H16z"/><path fill="#dca760" d="M8 28h48v8H8z"/><path d="M25 32V17m17 16V14" stroke="#589332" stroke-width="4"/><path fill="#82bb46" d="M24 28c-11 0-12-11-12-11 11-1 15 5 12 11m17-2c11 0 12-11 12-11-11-1-15 5-12 11"/><g fill="#ec826f"><circle cx="24" cy="11" r="7"/><circle cx="18" cy="17" r="7"/><circle cx="30" cy="17" r="7"/></g><g fill="#f8d757"><circle cx="42" cy="9" r="7"/><circle cx="36" cy="15" r="7"/><circle cx="48" cy="15" r="7"/></g><circle cx="24" cy="16" r="5" fill="#ffdf78"/><circle cx="42" cy="14" r="5" fill="#df9950"/>',
  map: '<path fill="#d9e9a4" stroke="#b99654" stroke-width="2" d="m7 16 17-6 17 6 17-6v40l-17 6-17-6-17 6z"/><path fill="#9fcde0" d="m24 10 17 6v40l-17-6z"/><path d="m8 42 17-9 13 6 19-11" fill="none" stroke="#fff7cb" stroke-width="6"/><path fill="#e5684c" stroke="#ab4b37" stroke-width="2" d="M42 3c-16 0-16 19 0 30 16-11 16-30 0-30Z"/><circle cx="42" cy="13" r="5" fill="#fff5cc"/>',
  settings: '<path fill="#97a9af" stroke="#62767e" stroke-width="2" d="m26 5 12 0 2 8 7 4 8-2 6 11-6 6v7l6 6-6 11-8-2-7 4-2 8H26l-2-8-7-4-8 2-6-11 6-6v-7l-6-6 6-11 8 2 7-4z" transform="translate(3 0) scale(.9)"/><circle cx="32" cy="32" r="12" fill="#e8f0e7" stroke="#657b82" stroke-width="3"/>',
};

function icon(name, fallback) {
  return ICONS[name]
    ? `<svg class="hud-icon" viewBox="0 0 64 64" aria-hidden="true">${ICONS[name]}</svg>`
    : `<span class="hud-emoji" aria-hidden="true">${fallback}</span>`;
}

function art(asset, fallback) {
  return `<span class="hud-art" aria-hidden="true"><span class="art-fallback">${fallback}</span><canvas width="160" height="160" data-asset="${asset}"></canvas></span>`;
}

function resource(id, title, asset, fallback, panel, value) {
  const picture = asset ? art(asset, fallback) : `<span class="hud-resource-emoji" aria-hidden="true">${fallback}</span>`;
  return `<div class="hud-resource" aria-label="${title}">${picture}<b id="${id}">${value}</b><button class="hud-add" data-panel="${panel}" aria-label="${title === 'Xu' ? 'Kiếm thêm Xu qua đơn hàng' : `Xem ${title.toLowerCase()}`}" title="${title}">+</button></div>`;
}

const NAV_ITEMS = [
  ['quests', 'Nhiệm vụ'], ['orders', 'Đơn hàng'], ['shop', 'Cửa hàng'], ['warehouse', 'Kho đồ'],
];
const TOOLS = [
  ['build', 'Xây dựng', 'data-tool="build"'],
  ['crops', 'Cây trồng', 'data-context="crops"'],
  ['animals', 'Vật nuôi', 'data-context="animals"', '🐮'],
  ['decor', 'Trang trí', 'data-panel="decor"'],
  ['map', 'Bản đồ', 'data-camera="home"'],
  ['friends', 'Bạn bè', 'data-panel="friends"', '👫'],
  ['settings', 'Cài đặt', 'data-panel="settings"'],
];

/** A real DOM HUD: every control has a live game action and every number is mutable. */
export function liveGameMarkup() {
  return `<section class="game live-game">
    <div class="reference-stage live-stage">
      <div class="world-wrap"><canvas id="farm-canvas" aria-label="Bản đồ nông trại tương tác"></canvas><div id="game-renderer-host" hidden aria-label="Cảnh nông trại"></div></div>
      <header class="live-hud" aria-label="Thông tin người chơi và tài nguyên">
        <div class="live-profile">
          <div class="hud-avatar" aria-hidden="true">👩🏻‍🌾</div>
          <div class="hud-profile-info"><strong id="farmer-name-label">Người nông dân</strong><div class="xp-track" role="progressbar" aria-label="Kinh nghiệm" aria-valuemin="0" aria-valuenow="0" aria-valuemax="100"><span id="xp-fill"></span><b id="xp-label">0 / 100</b></div></div>
          <span class="hud-level" title="Cấp độ"><b id="level">1</b></span>
        </div>
        <div class="hud-resources">
          ${resource('coins', 'Xu', 'icon_coin', '🪙', 'orders', '0')}
          ${resource('diamonds', 'Kim cương', 'icon_diamond', '💎', 'quests', '0')}
          ${resource('wood', 'Gỗ', null, '🪵', 'warehouse', '0')}
          ${resource('capacity', 'Sức chứa kho', null, '🌱', 'warehouse', '0/100')}
        </div>
        <button class="hud-settings" data-panel="settings" aria-label="Cài đặt" title="Cài đặt">${icon('settings')}</button>
      </header>
      <div class="live-farm-label"><span aria-hidden="true">🌿</span> Mỡ Farm <span class="live-farm-tagline">Một ngày thật xanh</span></div>
      <nav class="live-side-nav side-nav" aria-label="Quản lý nông trại">${NAV_ITEMS.map(([panel, title]) => `<button class="live-nav-button" data-panel="${panel}" aria-label="${title}">${icon(panel)}<span>${title}</span>${panel === 'quests' ? '<i id="quest-dot" class="notification-dot" hidden>!</i>' : ''}</button>`).join('')}</nav>
      <aside class="quest-sidebar" aria-label="Nhiệm vụ và đơn hàng"></aside>
      <nav class="live-toolbar" aria-label="Công cụ nông trại">${TOOLS.map(([name, title, attributes, fallback]) => `<button class="live-tool" ${attributes} aria-label="${title}" title="${title}">${icon(name, fallback)}<span>${title}</span></button>`).join('')}</nav>
      <div class="action-palette" aria-label="Thao tác nông trại" hidden>
        <div class="crop-actions" hidden><button class="tool palette-tool" data-tool="plant">${icon('crops')}<span>Gieo <b id="crop-choice">Lúa</b></span></button><button class="tool palette-tool" data-tool="harvest">${art('icon_rice', '🌾')}<span>Thu hoạch</span></button><button class="tool palette-tool" data-panel="shop">${icon('shop')}<span>Hạt giống</span></button></div>
        <div class="animal-actions" hidden><button class="tool palette-tool" data-tool="feed">${art('icon_chicken_feed', '🌾')}<span>Cho gà ăn</span></button><button class="tool palette-tool" data-tool="collect">${art('icon_egg', '🥚')}<span>Thu trứng</span></button><button class="tool palette-tool" data-tool="buy-feed">${icon('shop')}<span>Mua thức ăn</span></button></div>
        <button class="palette-close" data-tool="inspect" aria-label="Đóng công cụ" title="Đóng công cụ">×</button>
      </div>
      <div class="world-status"><span id="status" role="status">Chạm vào nông trại để khám phá.</span></div>
      <div class="live-camera"><span class="camera-hint">Kéo để di chuyển · Cuộn để thu phóng</span><div class="camera-buttons"><button data-camera="out" aria-label="Thu nhỏ" title="Thu nhỏ">−</button><button data-camera="home" aria-label="Về giữa nông trại" title="Về giữa nông trại">⌂</button><button data-camera="in" aria-label="Phóng to" title="Phóng to">+</button></div></div>
      <button id="logout" hidden>Thoát</button><div class="notice" id="notice" role="status"></div>
      <div class="orientation live-orientation" role="status"><span aria-hidden="true">↻</span><span>Xoay ngang để ngắm nông trại rộng hơn.</span></div>
    </div><dialog class="farm-dialog" aria-labelledby="dialog-title"></dialog>
  </section>`;
}
