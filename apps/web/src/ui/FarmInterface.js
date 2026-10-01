import { formatNumber } from '../locales/vi-VN.js';
import { warehouseMarkup as referenceWarehouseMarkup, shopMarkup as referenceShopMarkup } from './ReferencePanels.js';
import { alignPanel } from './PanelLayout.js';

export const ITEMS = Object.freeze({
  rice: { name: 'Lúa', emoji: '🌾', asset: 'icon_rice', category: 'crops', price: 8, description: 'Những bông lúa vàng óng từ nông trại. Dùng để giao đơn hàng hoặc bán lấy Xu.' },
  carrot: { name: 'Cà rốt', emoji: '🥕', asset: 'icon_carrot', category: 'crops', price: 14, description: 'Cà rốt tươi giòn vừa thu hoạch. Tích trữ cho đơn hàng hoặc bán lấy Xu.' },
  corn: { name: 'Bắp', emoji: '🌽', asset: 'icon_corn', category: 'crops', price: 22, description: 'Bắp ngọt vàng ươm. Chăm chỉ gieo trồng để có những vụ mùa bội thu!' },
  tomato: { name: 'Cà chua', emoji: '🍅', asset: 'icon_tomato', category: 'crops', price: 34, description: 'Cà chua chín mọng, sẵn sàng cho những đơn hàng tươi ngon.' },
  egg: { name: 'Trứng gà', emoji: '🥚', asset: 'icon_egg', category: 'animals', price: 20, description: 'Trứng tươi từ những cô gà được chăm sóc mỗi ngày. Có thể bán lấy Xu.' },
  chicken_feed: { name: 'Thức ăn gà', emoji: '🌾', asset: 'icon_chicken_feed', category: 'animals', description: 'Cho gà ăn một phần để nhận một quả trứng sau 10 phút.' },
  wood: { name: 'Gỗ', category: 'materials', description: 'Nguyên liệu xây dựng. Chưa được mở bán.' },
  stone: { name: 'Đá', category: 'materials', description: 'Nguyên liệu xây dựng. Chưa được mở bán.' },
  coins: { name: 'Xu', emoji: '🪙', asset: 'icon_coin', category: 'other', description: 'Dùng để gieo trồng, mua thức ăn và xây dựng nông trại.' },
  diamonds: { name: 'Kim cương', emoji: '💎', asset: 'icon_diamond', category: 'other', description: 'Phần thưởng quý giá nhận được khi hoàn thành nhiệm vụ.' },
});

const QUESTS = {
  first_harvest: { name: 'Thu hoạch đầu tiên', description: 'Thu hoạch lúa chín để bắt đầu hành trình nhé!', icon: '🌾', coins: 50, xp: 10 },
  first_sale: { name: 'Lần bán đầu tiên', description: 'Bán 5 nông sản trong kho đồ.', icon: '🪙', coins: 100, xp: 20 },
  first_build: { name: 'Xây dựng đầu tiên', description: 'Xây một công trình mới cho nông trại.', icon: '🏡', coins: 100, xp: 20 },
  first_egg: { name: 'Quả trứng đầu tiên', description: 'Cho gà ăn và thu quả trứng đầu tiên.', icon: '🥚', coins: 150, xp: 30 },
};
const LEVELS = [0, 100, 260, 480, 760, 1100, 1500, 1960, 2480, 3060];

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

export function itemArt(id, className = 'item-art') {
  const item = ITEMS[id];
  return `<span class="${className}" aria-hidden="true"><span class="art-fallback">${item?.emoji || '📦'}</span>${item?.asset ? `<canvas width="160" height="160" data-asset="${item.asset}"></canvas>` : ''}</span>`;
}

function progress(value, target, className = 'progress-track') {
  const total = Math.max(1, Number(target) || 1);
  return `<div class="${className}" role="progressbar" aria-valuenow="${Math.min(total, Number(value) || 0)}" aria-valuemin="0" aria-valuemax="${total}"><span style="width:${Math.min(100, (Number(value) || 0) / total * 100)}%"></span><b>${formatNumber(value)} / ${formatNumber(total)}</b></div>`;
}

export class FarmInterface {
  constructor(app, crops) {
    this.app = app;
    this.crops = crops;
    this.panel = null;
    this.category = 'all';
    this.selectedItem = 'rice';
    this.quantity = 1;
    this.feedQuantity = 1;
    this.cartQuantity = 0;
    this.busy = false;
    this.panelNotice = '';
    this.dialog = app.root.querySelector('dialog');
    this.listener = (event) => this.handleClick(event);
    app.root.querySelector('.game').addEventListener('click', this.listener);
    this.dialog.addEventListener('click', (event) => {
      if (event.target !== this.dialog) return;
      const bounds = this.dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.close();
    });
    this.dialog.addEventListener('close', () => { this.panel = null; });
    this.resizeListener = () => alignPanel(this.dialog);
    window.addEventListener('resize', this.resizeListener);
    this.refresh();
  }

  get farm() { return this.app.farm; }
  get used() { return Object.values(this.farm.inventory).reduce((sum, value) => sum + Number(value || 0), 0); }
  amount(id) { return id === 'coins' || id === 'diamonds' ? this.farm[id] : this.farm.inventory[id] || 0; }

  paintIcons(scope = this.app.root) {
    for (const canvas of scope.querySelectorAll('canvas[data-asset]')) {
      const frame = this.app.assets.frame(canvas.dataset.asset);
      const image = frame && this.app.assets.images.get(frame.atlas);
      if (!frame || !image?.naturalWidth) continue;
      const ctx = canvas.getContext('2d');
      const { x, y, w, h } = frame.frame;
      const scale = Math.min(152 / w, 152 / h);
      ctx.clearRect(0, 0, 160, 160);
      ctx.drawImage(image, x, y, w, h, (160 - w * scale) / 2, (160 - h * scale) / 2, w * scale, h * scale);
      canvas.parentElement.classList.add('art-loaded');
    }
  }

  refresh() {
    if (!this.farm) return;
    const levelIndex = Math.min(LEVELS.length - 1, Math.max(0, this.farm.level - 1));
    const floor = LEVELS[levelIndex];
    const target = LEVELS[levelIndex + 1] || floor + 800;
    const earned = Math.max(0, this.farm.xp - floor);
    const needed = target - floor;
    this.app.root.querySelector('#xp-fill').style.width = `${Math.min(100, earned / needed * 100)}%`;
    this.app.root.querySelector('#xp-label').textContent = `${earned} / ${needed}`;
    const track = this.app.root.querySelector('.xp-track');
    track.setAttribute('aria-valuenow', String(earned));
    track.setAttribute('aria-valuemax', String(needed));
    this.app.root.querySelector('#quest-dot').hidden = !this.farm.quests.some((quest) => quest.completed && !quest.claimed);
    this.renderSidebar();
    const wood = this.app.root.querySelector('#wood');
    if (wood) wood.textContent = formatNumber(this.amount('wood'));
    if (this.panel && this.dialog.open && !this.busy) this.renderPanel();
    this.paintIcons();
  }

  renderSidebar() {
    const quest = this.farm.quests.find((item) => !item.claimed);
    const info = QUESTS[quest?.questId] || QUESTS.first_harvest;
    const order = this.farm.orders.find((item) => item.status === 'OPEN');
    this.app.root.querySelector('.quest-sidebar').innerHTML = `<section class="quest-card"><h2 class="card-heading">📋 Nhiệm vụ hôm nay</h2><div class="card-content"><p class="quest-message"><span aria-hidden="true">👩🏻‍🌾</span>${escapeHtml(quest ? info.description : 'Nông trại nhỏ, niềm vui lớn. Cùng đón một vụ mùa mới!')}</p><strong>${escapeHtml(quest ? info.name : 'Chăm sóc nông trại')}</strong>${quest ? progress(quest.progress, quest.target, 'quest-progress') : '<p class="muted">Gieo hạt, thu hoạch và mở rộng mỗi ngày.</p>'}<button class="primary" data-panel="quests">${quest?.completed ? 'Nhận phần thưởng 🎁' : 'Xem nhiệm vụ 🌱'}</button></div></section><section class="quest-card"><h2 class="card-heading">📦 Đơn hàng</h2><div class="card-content"><p class="quest-message">Sản phẩm tươi ngon từ nông trại của bạn!</p>${order ? `<div class="order-preview">${order.lines.map((line) => `<div>${itemArt(line.itemId)}<strong>${this.amount(line.itemId)}/${line.quantity}</strong></div>`).join('')}</div><p class="reward-line">🪙 ${order.rewardCoins} <span>⭐ ${order.rewardXp}</span></p>` : '<p class="muted">Những vụ mùa ngon đang chờ bạn.</p>'}<button class="success" data-panel="orders">Xem đơn hàng</button></div></section>`;
  }

  open(panel, category) {
    if (panel === 'decor') return this.open('shop', 'decor');
    this.panel = panel;
    this.panelNotice = '';
    this.category = category || (panel === 'shop' ? 'seeds' : 'all');
    this.quantity = 1;
    this.renderPanel();
    if (!this.dialog.open) this.dialog.showModal();
    alignPanel(this.dialog);
  }

  close() { this.dialog.close(); this.panel = null; }
  destroy() {
    this.close();
    window.removeEventListener('resize', this.resizeListener);
    this.app.root.querySelector('.game')?.removeEventListener('click', this.listener);
  }

  renderPanel() {
    const panels = {
      warehouse: ['📦', 'Kho đồ'], shop: ['🏪', 'Cửa hàng'], quests: ['📋', 'Nhiệm vụ'],
      orders: ['📦', 'Đơn hàng'], build: ['🔨', 'Xây dựng'], settings: ['⚙️', 'Cài đặt'], friends: ['👥', 'Bạn bè'],
    };
    const panel = panels[this.panel] ? this.panel : 'settings';
    const [icon, title] = panels[panel];
    const active = this.dialog.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = active?.getAttribute('data-focus-key');
    this.dialog.className = `farm-dialog ${panel}-dialog`;
    const capacity = panel === 'warehouse'
      ? `<div class="capacity-meter"><strong>Sức chứa: ${this.used}/${this.farm.warehouseCapacity}</strong>${progress(this.used, this.farm.warehouseCapacity, 'capacity-track')}</div>` : '';
    const content = this[`${panel}Markup`]();
    const awning = panel === 'shop' ? '<div class="shop-awning" aria-hidden="true"></div>' : '';
    this.dialog.innerHTML = `<div class="dialog-frame"><header class="dialog-header"><h2 id="dialog-title">${icon} ${title}</h2>${capacity}<button class="close-button" data-action="close" aria-label="Đóng cửa sổ">×</button></header>${awning}<div class="dialog-body">${content}</div><p class="dialog-notice" role="status"></p></div>`;
    this.dialog.querySelector('.dialog-notice').textContent = this.panelNotice;
    this.paintIcons(this.dialog);
    alignPanel(this.dialog);
    if (focusKey) Array.from(this.dialog.querySelectorAll('[data-focus-key]')).find((element) => element.dataset.focusKey === focusKey)?.focus();
  }

  warehouseMarkup() { return referenceWarehouseMarkup(this, ITEMS); }

  shopMarkup() { return referenceShopMarkup(this); }

  friendsMarkup() {
    return '<div class="empty-state"><h3>Bạn bè</h3><p>Tính năng kết bạn chưa được mở trong phiên bản này.</p><button class="secondary" data-action="close">Về nông trại</button></div>';
  }

  questsMarkup() {
    return `<div class="panel-list">${this.farm.quests.length ? this.farm.quests.map((quest) => {
      const info = QUESTS[quest.questId];
      if (!info) return '';
      return `<article class="task-row"><span class="task-icon">${info.icon}</span><div class="task-info"><h3>${info.name}</h3><p>${info.description}</p>${progress(quest.progress, quest.target)}<p class="reward-line">🪙 ${info.coins} <span>⭐ ${info.xp}</span></p></div><button class="success action-button" data-quest="${escapeHtml(quest.questId)}" ${!quest.completed || quest.claimed ? 'disabled' : ''}>${quest.claimed ? '✓ Đã nhận' : '🎁 Nhận thưởng'}</button></article>`;
    }).join('') : '<div class="empty-state"><span>🌱</span><h3>Chào mừng đến Mỡ Farm</h3><p>Thu hoạch những bông lúa chín và gieo hạt cho vụ mùa tiếp theo.</p></div>'}</div>`;
  }

  ordersMarkup() {
    const orders = this.farm.orders.filter((order) => order.status === 'OPEN');
    return `<div class="panel-list">${orders.length ? orders.map((order, index) => `<article class="task-row"><span class="task-icon">📦</span><div class="task-info"><h3>Đơn hàng nông sản #${index + 1}</h3><div class="order-lines">${order.lines.map((line) => `<span>${ITEMS[line.itemId]?.emoji || '📦'} ${escapeHtml(ITEMS[line.itemId]?.name || line.itemId)} <b>${this.amount(line.itemId)}/${line.quantity}</b></span>`).join('')}</div><p class="reward-line">🪙 ${order.rewardCoins} <span>⭐ ${order.rewardXp}</span></p></div><button class="success action-button" data-order="${escapeHtml(order.id)}" ${order.lines.some((line) => this.amount(line.itemId) < line.quantity) ? 'disabled' : ''}>Giao hàng</button></article>`).join('') : '<div class="empty-state"><span>📦</span><h3>Chưa có đơn hàng</h3><p>Tiếp tục chăm sóc nông trại và quay lại sau nhé.</p></div>'}</div>`;
  }

  buildMarkup() {
    return `<div class="build-grid">${[['chicken_coop_lv1', '🐔', 'Chuồng gà', 300, 'Ngôi nhà nhỏ cho gà. Cho ăn và thu trứng mỗi ngày.'], ['pond_small_lv1', '🐟', 'Ao nhỏ', 200, 'Thêm một góc nước trong xanh cho nông trại.']].map(([id, icon, name, cost, description]) => {
      const owned = this.farm.buildings.some((building) => building.buildingId === id);
      return `<article class="build-card"><span class="item-art">${icon}</span><h3>${name}</h3><p>${description}</p><p class="reward-line">🪙 ${cost} Xu</p><button class="success" data-building="${id}" ${owned || this.farm.level < 2 || this.farm.coins < cost ? 'disabled' : ''}>${owned ? '✓ Đã xây' : this.farm.level < 2 ? '🔒 Mở ở cấp 2' : this.farm.coins < cost ? 'Chưa đủ Xu' : 'Chọn vị trí xây'}</button></article>`;
    }).join('')}</div>`;
  }

  settingsMarkup() {
    return `<div class="settings-list"><div class="setting-row"><span>👩🏻‍🌾 Người chơi</span><strong>${escapeHtml(this.farm.character.name)}</strong></div><div class="setting-row"><span>🌟 Cấp độ</span><strong>${this.farm.level}</strong></div><div class="setting-row"><span>🗺️ Bản đồ</span><button class="secondary" data-action="center">Về giữa nông trại</button></div><article class="help-card"><h3>🌱 Một ngày ở Mỡ Farm</h3><p>Chọn Cây trồng, chọn Gieo rồi chạm ô đất trống. Chọn Hạt giống để đổi loại cây đã mở khóa.</p><p>Chọn Thu hoạch rồi chạm cây chín. Bán nông sản trong Kho đồ hoặc giao Đơn hàng để nhận Xu và kinh nghiệm.</p><p>Kéo bản đồ để di chuyển. Cuộn chuột hoặc dùng hai ngón tay để thu phóng. Khi xây dựng, bóng công trình màu xanh cho biết vị trí có thể đặt.</p></article><button class="secondary" data-action="logout">Thoát về màn hình đăng nhập</button></div>`;
  }

  camera(action) {
    const renderer = this.app.gameRenderer?.renderer || this.app.renderer;
    if (renderer?.focusHome) {
      if (action === 'home') renderer.focusHome();
      else renderer.zoomBy?.(action === 'in' ? 1.15 : 1 / 1.15);
      return;
    }
    if (action === 'home') {
      renderer?.focusGrid?.(11, 9);
      if (this.app.renderer) { this.app.renderer.pan = { x: 0, y: 0 }; this.app.renderer.fit(); }
    } else if (renderer?.camera) {
      const camera = renderer.camera;
      const model = camera.model;
      model.zoomAtScreen(model.viewportWidth / 2, model.viewportHeight / 2, model.zoom * (action === 'in' ? 1.15 : 1 / 1.15));
      camera.apply?.();
    }
  }

  async transaction(button, callback) {
    if (this.busy) return;
    this.busy = true;
    button.disabled = true;
    try { await callback(); }
    catch (error) { this.app.setStatus(error.message || 'Chưa thể thực hiện thao tác. Hãy thử lại.'); }
    finally { this.busy = false; if (this.dialog.open) this.renderPanel(); }
  }

  async handleClick(event) {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const data = button.dataset;
    if (data.panel) return this.open(data.panel);
    if (data.camera) return this.camera(data.camera);
    if (data.category) { this.category = data.category; this.quantity = 1; return this.renderPanel(); }
    if (data.item) { this.selectedItem = data.item; this.quantity = 1; return this.renderPanel(); }
    if (data.seed) { this.app.selectedCrop = data.seed; this.app.root.querySelector('#crop-choice').textContent = this.crops[data.seed].label; this.app.showActions('crops'); this.app.setTool('plant'); return this.close(); }
    if (data.building) { this.app.selectedBuilding = data.building; this.app.setTool('build'); this.app.setStatus(`Chọn ô đất trống để xây ${data.building === 'pond_small_lv1' ? 'ao nhỏ' : 'chuồng gà'}.`); return this.close(); }
    if (data.step) {
      const key = { sell: 'quantity', feed: 'feedQuantity', cart: 'cartQuantity' }[data.step];
      if (key) this[key] = Math.max(1, Math.min(data.step === 'sell' ? this.amount(this.selectedItem) : 99, this[key] + Number(data.delta)));
      return this.renderPanel();
    }
    if (data.quest) return this.transaction(button, () => this.app.claimFirstQuest(data.quest));
    if (data.order) return this.transaction(button, () => this.app.completeFirstOrder(data.order));
    switch (data.action) {
      case 'close': return this.close();
      case 'sell': return this.transaction(button, () => this.app.sellItem(this.selectedItem, this.quantity));
      case 'use-feed': this.app.showActions('animals'); this.app.setTool('feed'); return this.close();
      case 'add-feed': this.cartQuantity = Math.min(99, this.cartQuantity + this.feedQuantity); return this.renderPanel();
      case 'remove-feed': this.cartQuantity = 0; return this.renderPanel();
      case 'checkout': return this.transaction(button, async () => { if (await this.app.buyFeed(this.cartQuantity)) this.cartQuantity = 0; });
      case 'center': this.camera('home'); return this.close();
      case 'logout': this.close(); return this.app.root.querySelector('#logout').click();
      default: break;
    }
  }
}
