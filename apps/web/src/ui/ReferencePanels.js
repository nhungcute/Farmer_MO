import { formatNumber } from '../locales/vi-VN.js';

const configuredAssetBase = String(globalThis.__MO_FARM_CONFIG__?.assetBase || '/public/assets');
const ASSET_BASE = (globalThis.location ? new URL(`${configuredAssetBase.replace(/\/$/, '')}/`, globalThis.location.href).href : configuredAssetBase).replace(/\/$/, '');
const SHEETS = {
  warehouse: `${ASSET_BASE}/design/reference/05_Warehouse.png`,
  shop: `${ASSET_BASE}/design/reference/06_Shop.png`,
};

function setSheetStyles(ui) {
  for (const [name, url] of Object.entries(SHEETS)) ui.dialog?.style.setProperty(`--reference-${name}-sheet`, `url("${url}")`);
}

const WAREHOUSE_CATEGORIES = [
  ['all', 'Tất cả'], ['seeds', 'Hạt giống'], ['crops', 'Nông sản'],
  ['animals', 'Vật nuôi'], ['materials', 'Nguyên liệu'], ['other', 'Khác'],
];
const SHOP_CATEGORIES = [
  ['seeds', 'Hạt giống'], ['animals', 'Vật nuôi'], ['materials', 'Nguyên liệu'],
  ['decor', 'Trang trí'], ['offers', 'Ưu đãi'],
];

// View boxes expose original artwork without modifying or regenerating the PNG.
const ITEM_CROPS = {
  rice: [788, 381, 86, 86], carrot: [270, 386, 96, 89],
  corn: [400, 388, 79, 88], tomato: [518, 388, 96, 86],
  egg: [644, 388, 89, 87], chicken_feed: [143, 536, 85, 86],
  wood: [270, 535, 94, 84], stone: [393, 536, 102, 80],
  coins: [529, 536, 81, 83], diamonds: [655, 542, 76, 74],
};
const SHOP_ART = {
  rice: [167, 379, 110, 78], carrot: [340, 379, 102, 78],
  corn: [517, 379, 100, 80], tomato: [686, 379, 102, 78],
  chicken_feed: [156, 585, 89, 68], chicken: [303, 583, 77, 74],
  wood: [435, 585, 91, 70], stone: [571, 586, 92, 68],
  fence: [707, 583, 98, 72],
};
const PRICE_CROPS = { coins: [637, 189, 30, 33], diamonds: [753, 190, 30, 30] };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

function art(sheet, rectangle, className = '', label = '', mask = '') {
  const [x, y, width, height] = rectangle;
  return `<svg class="reference-art ${className}" viewBox="${x} ${y} ${width} ${height}" ${label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"'} focusable="false"><image href="${SHEETS[sheet]}" width="1448" height="1086" />${mask}</svg>`;
}

function itemArt(id, className = 'item-art') {
  const quantities = {
    carrot: [336, 453], corn: [460, 453], tomato: [588, 453], egg: [712, 453],
    chicken_feed: [211, 597], wood: [337, 597], stone: [463, 597],
    coins: [566, 598], diamonds: [714, 597],
  };
  const quantityPosition = quantities[id];
  // Baked example counts must never masquerade as the player's real inventory.
  const mask = quantityPosition ? `<rect x="${quantityPosition[0]}" y="${quantityPosition[1]}" width="60" height="30" fill="#fff8df" />` : '';
  return ITEM_CROPS[id] ? art('warehouse', ITEM_CROPS[id], className, '', mask) : '';
}

function tabMarkup(ui, categories, shop = false) {
  const rectangles = shop
    ? [[210, 297, 35, 35], [369, 296, 42, 41], [500, 296, 46, 39], [655, 296, 45, 41], [792, 296, 40, 41]]
    : [[139, 332, 26, 25], [235, 329, 28, 29], [328, 326, 29, 33], [425, 326, 31, 33], [514, 326, 37, 33], [645, 326, 31, 33]];
  return `<nav class="category-tabs reference-tabs" aria-label="Danh mục">${categories.map(([id, name], index) => `<button class="category-tab${ui.category === id ? ' active' : ''}" data-category="${id}" data-focus-key="category-${id}" aria-pressed="${ui.category === id}">${art(shop ? 'shop' : 'warehouse', rectangles[index], 'tab-art')}<span>${name}</span></button>`).join('')}</nav>`;
}

function quantity(value, kind, max = 99) {
  return `<div class="quantity-stepper" aria-label="Số lượng"><button data-step="${kind}" data-delta="-1" data-focus-key="${kind}-minus" aria-label="Giảm số lượng" ${value <= 1 ? 'disabled' : ''}>−</button><output aria-label="Số lượng đã chọn">${value}</output><button data-step="${kind}" data-delta="1" data-focus-key="${kind}-plus" aria-label="Tăng số lượng" ${value >= max ? 'disabled' : ''}>+</button></div>`;
}

function fixedQuantity(label) {
  return `<div class="reference-product-quantity" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><button disabled aria-label="Giảm số lượng">−</button><b>1</b><button disabled aria-label="Tăng số lượng">+</button></div>`;
}

export function warehouseMarkup(ui, items) {
  setSheetStyles(ui);
  const entries = Object.entries(items).filter(([, item]) => ui.category === 'all' || item.category === ui.category);
  if (!entries.some(([id]) => id === ui.selectedItem)) ui.selectedItem = entries[0]?.[0] || null;
  const selected = items[ui.selectedItem];
  const amount = selected ? ui.amount(ui.selectedItem) : 0;
  ui.quantity = Math.max(1, Math.min(amount || 1, ui.quantity));
  const category = selected && WAREHOUSE_CATEGORIES.find(([id]) => id === selected.category)?.[1];
  return `<div class="inventory-layout reference-inventory"><div class="inventory-main">${tabMarkup(ui, WAREHOUSE_CATEGORIES)}<div class="item-grid">${entries.length ? entries.map(([id, item]) => `<button class="item-card${id === ui.selectedItem ? ' active' : ''}" data-item="${id}" data-focus-key="item-${id}" aria-pressed="${id === ui.selectedItem}" aria-label="${escapeHtml(item.name)}: ${ui.amount(id)}">${itemArt(id)}<strong>${escapeHtml(item.name)}</strong><span class="item-count">${formatNumber(ui.amount(id))}</span></button>`).join('') : '<div class="reference-empty"><p>Chưa có vật phẩm trong danh mục này.</p><button class="secondary" data-category="all">Xem tất cả vật phẩm</button></div>'}</div></div><aside class="item-detail">${selected ? `<div class="detail-heading">${itemArt(ui.selectedItem, 'detail-art')}<div><h3>${escapeHtml(selected.name)}</h3><span class="category-pill">${art('warehouse', [235, 329, 28, 29], 'leaf-art')}${escapeHtml(category)}</span></div></div><p class="detail-description">${escapeHtml(selected.description)}</p><p class="detail-quantity">Số lượng hiện có: <strong>${formatNumber(amount)}</strong></p>${selected.price ? `<div class="reference-sale-quantity">${quantity(ui.quantity, 'sell', amount)}<span>${formatNumber(selected.price * ui.quantity)} Xu</span></div>` : ''}<div class="detail-actions"><button class="reference-use" data-action="use-feed" ${ui.selectedItem !== 'chicken_feed' || !amount ? 'disabled' : ''}>Dùng</button><button class="reference-sell" ${selected.price ? 'data-action="sell"' : ''} aria-label="Bán ${ui.quantity} ${escapeHtml(selected.name.toLowerCase())}" ${!selected.price || !amount ? 'disabled' : ''}>Bán</button><button class="reference-detail" data-panel="orders">Đơn hàng</button></div>${art('warehouse', [955, 534, 109, 76], 'detail-decoration')}` : '<div class="reference-empty"><h3>Kho đồ</h3><p>Chọn một vật phẩm để xem thông tin.</p></div>'}</aside></div>`;
}

function seedCard(ui, id, crop, index) {
  const locked = ui.farm.level < index + 1;
  return `<article class="product-card seed-product"><h3 class="product-name">${escapeHtml(crop.label)} giống</h3><span class="product-info" title="Thu hoạch ${crop.yield}; kinh nghiệm +${crop.xp}" aria-label="Thông tin hạt giống">i</span>${art('shop', SHOP_ART[id], 'item-art')}<p class="product-description">Trồng ${crop.grow / 60} phút<br>Gieo từng ô đất</p>${fixedQuantity('Gieo một ô mỗi lần')}<button class="price-button" data-seed="${id}" ${locked ? 'disabled' : ''} aria-label="${locked ? `Mở ở cấp ${index + 1}` : `Chọn ${escapeHtml(crop.label)} giống, ${crop.cost} Xu`}">${art('warehouse', PRICE_CROPS.coins, 'price-icon')}${locked ? `Cấp ${index + 1}` : formatNumber(crop.cost)}</button></article>`;
}

function extraCard(ui, id, name, description, price, category) {
  const feed = id === 'chicken_feed';
  return `<article class="product-card extra-product${feed ? '' : ' unavailable-product'}" data-product-category="${category}"><h3 class="product-name">${name}</h3><span class="product-info" title="${feed ? 'Mua thức ăn cho gà' : 'Vật phẩm chưa được mở bán'}" aria-label="Thông tin vật phẩm">i</span>${art('shop', SHOP_ART[id], 'item-art')}<p class="product-description">${description}</p>${feed ? quantity(ui.feedQuantity, 'feed') : fixedQuantity('Vật phẩm chưa mở bán')}<button class="price-button" ${feed ? 'data-action="add-feed"' : 'disabled'} aria-label="${feed ? `Thêm ${ui.feedQuantity} thức ăn gà vào giỏ` : `${name}: chưa mở bán`}">${art('warehouse', PRICE_CROPS[id === 'chicken' || id === 'fence' ? 'diamonds' : 'coins'], 'price-icon')}${feed ? formatNumber(ui.feedQuantity * 5) : 'Chưa mở'}</button></article>`;
}

export function shopMarkup(ui) {
  setSheetStyles(ui);
  const extras = [
    ['chicken_feed', 'Thức ăn gà', 'Nuôi gà<br>Nhận trứng mỗi ngày', 5, 'animals'],
    ['chicken', 'Gà con', 'Vật nuôi<br>Chưa mở bán riêng', 20, 'animals'],
    ['wood', 'Gỗ', 'Nguyên liệu xây dựng', 50, 'materials'],
    ['stone', 'Đá', 'Nguyên liệu xây dựng', 50, 'materials'],
    ['fence', 'Hàng rào gỗ', 'Trang trí nông trại<br>Làm đẹp khu vực', 15, 'decor'],
  ];
  const products = ui.category === 'seeds'
    ? Object.entries(ui.crops).map(([id, crop], index) => seedCard(ui, id, crop, index)).join('') + extras.map((product) => extraCard(ui, ...product)).join('')
    : extras.filter((product) => product[4] === ui.category).map((product) => extraCard(ui, ...product)).join('');
  const total = ui.cartQuantity * 5;
  const noSpace = ui.used + ui.cartQuantity > ui.farm.warehouseCapacity;
  return `${tabMarkup(ui, SHOP_CATEGORIES, true)}<div class="shop-layout reference-shop"><div class="reference-products"><div class="product-grid">${products || '<div class="reference-empty"><p>Hiện chưa có ưu đãi.</p><button class="secondary" data-category="seeds">Xem hạt giống</button></div>'}</div><p class="shop-note">${ui.category === 'seeds' ? 'Chọn hạt rồi chạm ô đất trống để gieo. Xu được trừ khi gieo hạt.' : 'Thêm thức ăn vào giỏ để chăm sóc những cô gà.'}</p></div><aside class="cart-panel"><h3>${art('shop', [837, 343, 54, 49], 'cart-heading-art')}<span>Giỏ hàng</span>${art('warehouse', [235, 329, 28, 29], 'leaf-art')}</h3><div class="cart-items">${ui.cartQuantity ? `<div class="cart-row">${art('shop', SHOP_ART.chicken_feed, 'item-art')}<div class="cart-item-name"><strong>Thức ăn gà</strong>${quantity(ui.cartQuantity, 'cart')}</div><span class="cart-row-price">${formatNumber(total)}</span><button class="remove-item" data-action="remove-feed" aria-label="Xóa thức ăn khỏi giỏ">×</button></div>` : '<div class="cart-empty"><p>Giỏ hàng đang trống</p><small>Thêm thức ăn gà để mua.</small></div>'}</div><div class="cart-summary"><span>Tổng tiền:</span><strong>${art('warehouse', PRICE_CROPS.coins, 'price-icon')}${formatNumber(total)}</strong></div><button class="success reference-buy" data-action="checkout" ${!ui.cartQuantity || total > ui.farm.coins || noSpace ? 'disabled' : ''}><span>Mua ngay</span></button><p class="shop-note">Bạn có ${formatNumber(ui.farm.coins)} Xu${noSpace ? ' · Kho không đủ chỗ' : ''}</p></aside></div>`;
}
