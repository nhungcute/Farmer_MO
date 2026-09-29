import { formatNumber, t } from './locales/vi-VN.js';

const CONFIG = {
  apiBaseUrl: '',
  assetBase: './public/assets',
  ...(globalThis.__MO_FARM_CONFIG__ || {}),
};

const STORAGE_KEY = 'mo-farm-demo-session-v1';
const MAX_NAME_LENGTH = 24;
const MAP = { width: 24, height: 24, tileW: 64, tileH: 32 };
const STARTER_PLOTS = [
  { id: 'plot-01', x: 8, y: 10, cropId: 'rice', stage: 'ready', readyAt: 0 },
  { id: 'plot-02', x: 10, y: 10, cropId: 'rice', stage: 'ready', readyAt: 0 },
  { id: 'plot-03', x: 12, y: 10, cropId: 'rice', stage: 'ready', readyAt: 0 },
  { id: 'plot-04', x: 8, y: 13, cropId: null, stage: 'empty', readyAt: null },
  { id: 'plot-05', x: 10, y: 13, cropId: null, stage: 'empty', readyAt: null },
  { id: 'plot-06', x: 12, y: 13, cropId: null, stage: 'empty', readyAt: null },
];
const CROPS = {
  rice: { label: 'Lúa', cost: 5, grow: 120, yield: 3, sell: 8, xp: 10 },
  carrot: { label: 'Cà rốt', cost: 8, grow: 240, yield: 3, sell: 14, xp: 14 },
  corn: { label: 'Bắp', cost: 12, grow: 420, yield: 3, sell: 22, xp: 20 },
  tomato: { label: 'Cà chua', cost: 15, grow: 600, yield: 3, sell: 34, xp: 28 },
};
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
function timestamp(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return Date.parse(value);
}

function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

function defaultFarm(name) {
  return {
    contentVersion: 'mvp-1',
    character: { id: `local-${globalThis.crypto?.randomUUID?.() || Date.now()}`, name },
    coins: 1000, diamonds: 5, xp: 0, level: 1, warehouseCapacity: 100,
    inventory: { rice: 0, carrot: 0, corn: 0, tomato: 0, chicken_feed: 1, egg: 0 },
    plots: deepClone(STARTER_PLOTS),
    buildings: [
      { id: 'farmhouse-1', buildingId: 'farmhouse_lv1', x: 8, y: 4, footprint: [3, 3] },
      { id: 'warehouse-1', buildingId: 'warehouse_lv1', x: 13, y: 4, footprint: [2, 2] },
    ],
    chickens: [],
    orders: [],
    quests: [],
  };
}

function normalizeName(raw) {
  return String(raw || '').normalize('NFC').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

class FarmApi {
  constructor(baseUrl) { this.baseUrl = String(baseUrl || '').replace(/\/$/, ''); }

  async request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const method = String(options.method || 'GET').toUpperCase();
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      if (method !== 'GET' && method !== 'HEAD' && !headers['Idempotency-Key']) headers['Idempotency-Key'] = globalThis.crypto?.randomUUID?.() || `demo-${Date.now()}-${Math.random()}`;
      const response = await fetch(this.baseUrl ? `${this.baseUrl}${path}` : path, {
        ...options, credentials: 'include', headers, signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { const error = new Error(body?.error?.message || body?.message || `API ${response.status}`); error.status = response.status; error.network = false; throw error; }
      return body?.data ?? body;
    } catch (error) { if (error.network === undefined) error.network = true; throw error; }
    finally { clearTimeout(timer); }
  }

  enter(name) { return this.request('/api/character/enter', { method: 'POST', body: JSON.stringify({ name }) }); }
  bootstrap() { return this.request('/api/game/bootstrap', { method: 'GET' }); }
  plant(plotId, cropId) { return this.request('/api/crops/plant', { method: 'POST', body: JSON.stringify({ plotId, cropId }) }); }
  harvest(plotId) { return this.request('/api/crops/harvest', { method: 'POST', body: JSON.stringify({ plotId }) }); }
  buyFeed(quantity = 1) { return this.request('/api/market/buy', { method: 'POST', body: JSON.stringify({ itemId: 'chicken_feed', quantity }) }); }
  feed(chickenId) { return this.request('/api/animals/feed', { method: 'POST', body: JSON.stringify({ animalId: chickenId }) }); }
  collect(chickenId) { return this.request('/api/animals/collect', { method: 'POST', body: JSON.stringify({ animalId: chickenId }) }); }
  sell(itemId, quantity = 1) { return this.request('/api/market/sell', { method: 'POST', body: JSON.stringify({ itemId, quantity }) }); }
  completeOrder(orderId) { return this.request(`/api/orders/${encodeURIComponent(orderId)}/complete`, { method: 'POST', body: JSON.stringify({}) }); }
  claimQuest(questId) { return this.request(`/api/quests/${encodeURIComponent(questId)}/claim`, { method: 'POST', body: JSON.stringify({}) }); }
  build(buildingId, x, y) { return this.request('/api/buildings/place', { method: 'POST', body: JSON.stringify({ definitionId: buildingId, gridX: x, gridY: y, rotation: 0 }) }); }
}

class AssetRegistry {
  constructor(base) { this.base = base.replace(/\/$/, ''); this.manifest = null; this.frames = new Map(); this.images = new Map(); }

  async json(path) {
    const candidates = [`${this.base}/${path}`, `/assets/${path.replace(/^assets\//, '')}`];
    let lastError;
    for (const url of candidates) {
      try { const response = await fetch(url); if (response.ok) { this.base = url.slice(0, -path.length - 1); return response.json(); } } catch (error) { lastError = error; }
    }
    throw lastError || new Error(`Không tải được ${path}`);
  }

  async load() {
    try {
      this.manifest = await this.json('manifests/animation-manifest.json');
      const pages = this.manifest.generated?.pages || {};
      await Promise.all(Object.entries(pages).flatMap(([group, groupPages]) => groupPages.map(async (page) => {
        const atlasJson = await this.json(`atlases/${page.json}`);
        const image = new Image(); image.decoding = 'async';
        const imageCandidates = [this.url(`atlases/${page.image}`), `/assets/atlases/${page.image}`];
        image.src = imageCandidates[0];
        await image.decode().catch(async () => { image.src = imageCandidates[1]; await image.decode().catch(() => undefined); });
        this.images.set(page.image, image);
        for (const [id, meta] of Object.entries(atlasJson.frames || {})) this.frames.set(id, { ...meta, atlas: page.image, group });
      })));
      return true;
    } catch (error) { console.warn('[MO Farm] Dùng fallback renderer:', error); return false; }
  }

  url(path) { return `${this.base}/${path}`; }
  frame(id) { return this.frames.get(id); }
  draw(ctx, id, x, y, scale = 0.5, alpha = 1) {
    const meta = this.frame(id); const image = meta && this.images.get(meta.atlas);
    if (!meta || !image || !image.complete || !image.naturalWidth) return false;
    const { frame, pivot = { x: .5, y: .5 } } = meta;
    ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, x - frame.w * scale * pivot.x, y - frame.h * scale * pivot.y, frame.w * scale, frame.h * scale);
    ctx.restore(); return true;
  }

  animationFrame(id, state, direction, elapsed) {
    const animation = this.manifest?.animations?.[id];
    const clip = animation?.animations?.[state]?.[direction] || animation?.animations?.[state]?.[animation?.defaultDirection];
    if (!clip?.frames?.length) return null;
    const index = clip.loop ? Math.floor(elapsed * clip.fps) % clip.frames.length : Math.min(clip.frames.length - 1, Math.floor(elapsed * clip.fps));
    return clip.frames[index]?.id || null;
  }
}

class FarmRenderer {
  constructor(canvas, registry, getFarm) {
    this.canvas = canvas; this.registry = registry; this.getFarm = getFarm; this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(2, globalThis.devicePixelRatio || 1); this.zoom = 1; this.pan = { x: 0, y: 0 }; this.drag = null; this.frameStarted = performance.now();
    this.resize = this.resize.bind(this); this.tick = this.tick.bind(this); this.active = true; this.rafId = 0; window.addEventListener('resize', this.resize); canvas.addEventListener('pointerdown', (event) => this.pointerDown(event)); canvas.addEventListener('pointermove', (event) => this.pointerMove(event)); canvas.addEventListener('pointerup', (event) => this.pointerUp(event)); canvas.addEventListener('pointercancel', () => { this.drag = null; });
    this.resize(); this.rafId = requestAnimationFrame(this.tick);
  }

  resize() { const rect = this.canvas.getBoundingClientRect(); this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr)); this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr)); this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); this.view = { width: rect.width, height: rect.height }; this.fit(); }
  fit() { const w = this.view?.width || 800; const h = this.view?.height || 500; const mapWidth = (MAP.width + MAP.height) * MAP.tileW / 2; const mapHeight = (MAP.width + MAP.height) * MAP.tileH / 2; this.zoom = clamp(Math.min((w - 36) / mapWidth, (h - 38) / mapHeight) * 1.65, .45, 1.25); this.origin = { x: w / 2 + this.pan.x, y: h / 2 - mapHeight * this.zoom / 2 + this.pan.y }; }
  iso(x, y) { return { x: this.origin.x + (x - y) * MAP.tileW / 2 * this.zoom, y: this.origin.y + (x + y) * MAP.tileH / 2 * this.zoom }; }
  screenToCell(clientX, clientY) { const rect = this.canvas.getBoundingClientRect(); const sx = (clientX - rect.left - this.origin.x) / this.zoom; const sy = (clientY - rect.top - this.origin.y) / this.zoom; const a = sx / (MAP.tileW / 2); const b = sy / (MAP.tileH / 2); return { x: Math.floor((a + b) / 2), y: Math.floor((b - a) / 2) }; }
  pointerDown(event) { this.drag = { x: event.clientX, y: event.clientY, moved: false, panX: this.pan.x, panY: this.pan.y }; this.canvas.setPointerCapture?.(event.pointerId); }
  pointerMove(event) { if (!this.drag) return; const dx = event.clientX - this.drag.x; const dy = event.clientY - this.drag.y; if (Math.abs(dx) + Math.abs(dy) > 5) this.drag.moved = true; if (this.drag.moved) { this.pan.x = this.drag.panX + dx; this.pan.y = this.drag.panY + dy; this.fit(); } }
  pointerUp(event) { if (!this.drag?.moved) this.onCell?.(this.screenToCell(event.clientX, event.clientY)); this.drag = null; }
  tick(now) { if (!this.active) return; this.draw(now); this.rafId = requestAnimationFrame(this.tick); }
  pause() { this.active = false; if (this.rafId) cancelAnimationFrame(this.rafId); this.rafId = 0; }
  destroy() { this.pause(); window.removeEventListener('resize', this.resize); }
  draw(now) {
    const ctx = this.ctx, { width, height } = this.view || { width: 800, height: 500 }; ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#9fc8a2'; ctx.fillRect(0, 0, width, height); this.fit();
    const farm = this.getFarm(); if (!farm) return;
    for (let sum = 0; sum <= MAP.width + MAP.height - 2; sum += 1) for (let x = 0; x < MAP.width; x += 1) { const y = sum - x; if (y >= 0 && y < MAP.height) this.drawTile(ctx, x, y); }
    const objects = [];
    farm.buildings.forEach((building) => objects.push({ depth: building.x + building.y + building.footprint[1], type: 'building', value: building }));
    farm.plots.forEach((plot) => objects.push({ depth: plot.x + plot.y + 1, type: 'plot', value: plot }));
    farm.chickens.forEach((chicken) => objects.push({ depth: chicken.x + chicken.y + 1, type: 'chicken', value: chicken }));
    objects.sort((a, b) => a.depth - b.depth).forEach((object) => this.drawObject(ctx, object, now));
  }
  drawTile(ctx, x, y) { const p = this.iso(x + .5, y + .5); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(this.zoom, this.zoom); ctx.beginPath(); ctx.moveTo(0, -MAP.tileH / 2); ctx.lineTo(MAP.tileW / 2, 0); ctx.lineTo(0, MAP.tileH / 2); ctx.lineTo(-MAP.tileW / 2, 0); ctx.closePath(); ctx.fillStyle = (x + y) % 3 === 0 ? '#78b77d' : '#83c184'; ctx.fill(); ctx.strokeStyle = '#70ab75'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
  drawObject(ctx, object, now) {
    const { type, value } = object; const p = this.iso(value.x + .5, value.y + .5); const scale = this.zoom * .5;
    if (type === 'plot') { this.drawPlot(ctx, value, p); return; }
    if (type === 'building') { const id = value.buildingId === 'farmhouse_lv1' ? 'building_farmhouse_lv1' : value.buildingId === 'warehouse_lv1' ? 'building_warehouse_lv1' : String(value.buildingId || '').includes('pond') ? 'pond_small_lv1_base' : 'building_chicken_coop_lv1'; if (!this.registry.draw(ctx, id, p.x, p.y, scale)) this.drawBuildingFallback(ctx, p, value); return; }
    const frame = this.registry.animationFrame('animal_chicken', value.state || 'IDLE', value.direction || 'SE', (now - this.frameStarted) / 1000); if (!this.registry.draw(ctx, frame, p.x, p.y, scale)) this.drawChickenFallback(ctx, p); if (Number.isFinite(timestamp(value.productReadyAt)) && timestamp(value.productReadyAt) <= Date.now()) this.badge(ctx, p.x, p.y - 52 * this.zoom, '🥚');
  }
  drawPlot(ctx, plot, p) { const c = CROPS[plot.cropId]; if (plot.stage === 'growing' && Number.isFinite(timestamp(plot.readyAt)) && timestamp(plot.readyAt) <= Date.now()) plot.stage = 'ready'; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(this.zoom, this.zoom); ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(22, 0); ctx.lineTo(0, 14); ctx.lineTo(-22, 0); ctx.closePath(); ctx.fillStyle = '#765331'; ctx.fill(); ctx.strokeStyle = '#a87848'; ctx.stroke(); if (c && plot.stage !== 'empty') { const stage = plot.stage === 'ready' ? 'ready' : plot.stage === 'growing' ? stageFor(plot) : 'seed'; const id = `crop_${plot.cropId}_${stage}`; if (!this.registry.draw(ctx, id, 0, -7, .38)) { ctx.fillStyle = plot.stage === 'ready' ? '#f7c948' : '#4f9d54'; ctx.beginPath(); ctx.arc(0, -9, 8, 0, Math.PI * 2); ctx.fill(); } } if (plot.stage === 'ready') this.badge(ctx, 0, -30, '✦'); ctx.restore(); }
  drawBuildingFallback(ctx, p, value) { const buildingId = String(value.buildingId || ''); ctx.save(); ctx.translate(p.x, p.y); if (buildingId.includes('pond')) { ctx.fillStyle = '#4e9fc2'; ctx.beginPath(); ctx.ellipse(0, -8 * this.zoom, 30 * this.zoom, 18 * this.zoom, 0, 0, Math.PI * 2); ctx.fill(); } else { ctx.fillStyle = buildingId.includes('warehouse') ? '#d0a56b' : buildingId.includes('coop') ? '#d37a54' : '#d9c486'; ctx.beginPath(); ctx.roundRect(-30 * this.zoom, -42 * this.zoom, 60 * this.zoom, 42 * this.zoom, 5); ctx.fill(); } ctx.restore(); }
  drawChickenFallback(ctx, p) { ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = '#fff5d2'; ctx.beginPath(); ctx.ellipse(0, -9 * this.zoom, 12 * this.zoom, 10 * this.zoom, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e66c4e'; ctx.beginPath(); ctx.arc(9 * this.zoom, -17 * this.zoom, 4 * this.zoom, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  badge(ctx, x, y, text) { ctx.save(); ctx.font = `${Math.max(12, 18 * this.zoom)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(text, x, y); ctx.restore(); }
}

function stageFor(plot) { const remaining = Math.max(0, (timestamp(plot.readyAt) - Date.now()) / 1000); const total = CROPS[plot.cropId]?.grow || 120; const ratio = 1 - remaining / total; return ratio > .66 ? 'stage_3' : ratio > .33 ? 'stage_2' : 'stage_1'; }

class FarmApp {
  constructor(root) { this.root = root; this.api = new FarmApi(CONFIG.apiBaseUrl); this.assets = new AssetRegistry(CONFIG.assetBase); this.farm = null; this.tool = 'inspect'; this.selectedCrop = 'rice'; this.noticeTimer = null; this.gameRenderer = null; this.rendererEpoch = 0; this.presentationTimer = null; }
  async start() { const saved = this.loadSession(); if (saved?.farm && saved?.name) { try { const remote = await this.api.bootstrap(); this.farm = normalizeFarm(remote, saved.name); this.persist(); } catch (error) { if (error.status === 401) { localStorage.removeItem(STORAGE_KEY); this.renderLogin(t('sessionExpired')); return; } this.farm = normalizeFarm(saved.farm, saved.name); } this.renderGame(); return; } this.renderLogin(); }
  loadSession() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } }
  persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: this.farm.character.name, farm: this.farm })); }
  destroyGameRenderer() {
    this.rendererEpoch += 1;
    clearInterval(this.presentationTimer);
    this.presentationTimer = null;
    this.gameRenderer?.destroy?.();
    this.gameRenderer = null;
    this.renderer?.destroy?.();
    this.renderer = null;
    const host = this.root?.querySelector('#game-renderer-host');
    host?.replaceChildren();
  }
  async mountPixiRenderer() {
    const epoch = this.rendererEpoch;
    const host = this.root.querySelector('#game-renderer-host');
    const fallbackCanvas = this.root.querySelector('#farm-canvas');
    if (!host || !fallbackCanvas) return;
    // Keep the host measurable while Pixi initializes. A display:none host
    // reports a zero viewport and can create a one-pixel backing canvas.
    host.hidden = false;
    host.style.display = 'block';
    host.style.visibility = 'hidden';
    host.style.pointerEvents = 'none';
    try {
      // Pixi is optional for the zero-install demo shell. A failed dynamic
      // import leaves the proven Canvas renderer active.
      const { mountPixiFarmRenderer } = await import('./game/integration/mountPixiFarmRenderer.js');
      if (epoch !== this.rendererEpoch) return;
      const mounted = await mountPixiFarmRenderer({
        host,
        farm: this.farm,
        assetBase: CONFIG.assetBase,
        debug: new URLSearchParams(globalThis.location?.search || '').has('debug'),
        onCellSelected: (cell) => this.handleCell(cell),
        onObjectSelected: (object) => this.handleRendererObject(object),
        onAnimationEvent: (event) => this.handleRendererAnimation(event),
      });
      if (epoch !== this.rendererEpoch) { mounted.destroy?.(); return; }
      this.gameRenderer = mounted;
      host.hidden = false;
      host.setAttribute('aria-hidden', 'false');
      host.style.display = 'block';
      host.style.visibility = 'visible';
      host.style.pointerEvents = 'auto';
      this.renderer?.pause?.();
      fallbackCanvas.style.visibility = 'hidden';
      fallbackCanvas.style.pointerEvents = 'none';
      this.setStatus(t('ready'));
    } catch (error) {
      host.hidden = true;
      host.setAttribute('aria-hidden', 'true');
      host.style.display = 'none';
      host.style.visibility = 'hidden';
      host.style.pointerEvents = 'none';
      fallbackCanvas.style.visibility = 'visible';
      fallbackCanvas.style.pointerEvents = 'auto';
      console.info('[MO Farm] Pixi renderer unavailable; using Canvas fallback.', error);
    }
  }
  handleRendererObject(object) {
    if (!object) return;
    // InputController also reports the same pointer as a cell tap. Action
    // tools must be dispatched once through that path; object callbacks are
    // reserved for inspect feedback to avoid duplicate mutations.
    if (this.tool !== 'inspect') return;
    const plot = object.kind === 'crop' ? this.farm?.plots.find((item) => item.x === object.gridX && item.y === object.gridY) : null;
    if (plot) return this.handleCell({ x: plot.x, y: plot.y });
    const chicken = object.kind === 'chicken' ? this.farm?.chickens.find((item) => item.id === object.id) : null;
    if (chicken) return this.handleCell({ x: chicken.x, y: chicken.y });
    if ((object.kind === 'building' || object.kind === 'pond') && Number.isFinite(object.gridX) && Number.isFinite(object.gridY)) {
      return this.handleCell({ x: object.gridX, y: object.gridY });
    }
    this.setStatus(t('inspectHint'));
  }
  handleRendererAnimation(event) {
    // Animation events are presentation-only. Economy state is still applied
    // from the API mutation response in feed/collect handlers.
    if (event?.name === 'FEED_CONSUMED' || event?.type === 'FEED_CONSUMED') this.setStatus(t('fed'));
  }
  syncGameRenderer() { this.gameRenderer?.updateFarm?.(this.farm); }
  syncAnimalPresentation() {
    if (!this.farm) return;
    const now = Date.now();
    let changed = false;
    for (const plot of this.farm.plots || []) {
      const readyAt = timestamp(plot.readyAt);
      if (plot.stage === 'growing' && Number.isFinite(readyAt) && readyAt <= now) {
        plot.stage = 'ready';
        changed = true;
      }
    }
    for (const chicken of this.farm.chickens || []) {
      if (!chicken.productReadyAt || chicken.state === 'HAPPY' || chicken.state === 'PRODUCT_READY') continue;
      const readyAt = timestamp(chicken.productReadyAt);
      if (Number.isFinite(readyAt) && readyAt <= now) {
        chicken.state = 'PRODUCT_READY';
        changed = true;
      }
    }
    if (changed) {
      this.persist();
      this.syncGameRenderer();
    }
  }
  renderLogin(error = '') {
    this.destroyGameRenderer();
    this.root.innerHTML = `<section class="screen"><form class="login-card" id="login-form" novalidate><div class="brand"><div class="brand-mark" aria-hidden="true">🌾</div><div><h1>${t('brandTitle')}</h1><p>${t('brandSubtitle')}</p></div></div><label for="farmer-name">${t('playerName')}</label><input id="farmer-name" name="name" autocomplete="nickname" maxlength="${MAX_NAME_LENGTH}" placeholder="${t('namePlaceholder')}" required /><p class="hint">${t('directEntryHint')}</p><p class="error" id="login-error" role="alert">${escapeHtml(error)}</p><button class="primary" type="submit">${t('enterFarm')}</button></form></section>`;
    const form = this.root.querySelector('#login-form'); form.addEventListener('submit', (event) => this.login(event)); this.root.querySelector('#farmer-name').focus();
  }
  async login(event) { event.preventDefault(); const input = this.root.querySelector('#farmer-name'); const name = normalizeName(input.value); if (name.length < 2) { this.root.querySelector('#login-error').textContent = t('nameTooShort'); return; } const button = event.submitter; button.disabled = true; button.textContent = t('openingFarm'); let farm; try { await this.api.enter(name); farm = await this.api.bootstrap(); } catch (error) { if (!error.network) { button.disabled = false; button.textContent = t('enterFarm'); this.root.querySelector('#login-error').textContent = error.message; return; } farm = defaultFarm(name); } this.farm = normalizeFarm(farm, name); this.persist(); this.renderGame(); }
  renderGame() { this.destroyGameRenderer(); this.root.innerHTML = `<section class="game"><header class="topbar"><div class="brand"><div class="brand-mark" aria-hidden="true">🌾</div><div><h1>${t('brandTitle')}</h1><p><span id="farm-caption"></span> <span id="farmer-name-label"></span></p></div></div><div class="resources" aria-label="${t('resources')}"><span class="resource">🪙 <b id="coins">0</b></span><span class="resource">💎 <b id="diamonds">0</b></span><span class="resource">⭐ <b id="level">${t('level',{level:1})}</b></span><span class="resource">📦 <b id="capacity">${t('capacity',{used:0,capacity:100})}</b></span></div><button class="logout" id="logout" type="button">${t('logout')}</button></header><div class="world-wrap"><canvas id="farm-canvas" aria-label="${t('farmMap')}"></canvas><div id="game-renderer-host" aria-hidden="true" hidden></div><div class="legend">${t('mapHint')}</div><div class="orientation"><div class="orientation-card"><strong>${t('rotateTitle')}</strong><p>${t('rotateHint')}</p></div></div><div class="notice" id="notice" role="status"></div></div><nav class="toolbar" aria-label="${t('tools')}"><button class="tool active" data-tool="inspect" type="button">${t('inspect')}</button><button class="tool" data-tool="plant" type="button">${t('plant')} <span class="count" id="crop-choice">${t('rice')}</span></button><button class="tool" data-tool="harvest" type="button">${t('harvest')}</button><button class="tool" data-tool="build" type="button">${t('buildCoop')}</button><button class="tool" data-tool="feed" type="button">${t('feed')}</button><button class="tool" data-tool="collect" type="button">${t('collect')}</button><button class="tool" data-tool="buy-feed" type="button">${t('buyFeed')}</button><button class="tool" data-tool="sell-rice" type="button">${t('sellRice')}</button><button class="tool" data-tool="complete-order" type="button">${t('completeOrder')}</button><button class="tool" data-tool="claim-quest" type="button">${t('claimQuest')}</button><span class="status" id="status">${t('loadingAssets')}</span></nav></section>`; this.root.querySelector('#farm-caption').textContent = t('farmOf',{name:''}).trim(); this.root.querySelector('#farmer-name-label').textContent = this.farm.character.name; this.root.querySelector('#logout').addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); this.farm = null; this.renderLogin(); }); this.root.querySelectorAll('[data-tool]').forEach((button) => button.addEventListener('click', () => { const tool = button.dataset.tool; if (tool === 'buy-feed') return this.buyFeed(); if (tool === 'sell-rice') return this.sellItem('rice', 1); if (tool === 'complete-order') return this.completeFirstOrder(); if (tool === 'claim-quest') return this.claimFirstQuest(); if (tool === 'plant' && this.tool === 'plant') return this.cycleCrop(); this.setTool(tool); })); this.updateHeader(); const canvas = this.root.querySelector('#farm-canvas'); const renderer = new FarmRenderer(canvas, this.assets, () => this.farm); renderer.onCell = (cell) => this.handleCell(cell); this.renderer = renderer; this.presentationTimer = setInterval(() => this.syncAnimalPresentation(), 1000); this.assets.load().then(() => this.setStatus(t('ready'))); this.mountPixiRenderer(); }
  setTool(tool) { this.tool = tool; this.root.querySelectorAll('[data-tool]').forEach((button) => button.classList.toggle('active', button.dataset.tool === tool)); const names = { inspect: t('inspectHint'), plant: t('chooseCrop', { crop: CROPS[this.selectedCrop].label }), harvest: t('chooseHarvest'), build: t('chooseBuild'), feed: t('chooseFeed'), collect: t('chooseCollect'), 'buy-feed': t('buyFeedHint') }; this.setStatus(names[tool]); }
  cycleCrop() { const unlocked = ['rice', 'carrot', 'corn', 'tomato'].filter((id) => this.farm.level >= ({ rice: 1, carrot: 2, corn: 3, tomato: 4 }[id])); const index = unlocked.indexOf(this.selectedCrop); this.selectedCrop = unlocked[(index + 1) % unlocked.length]; this.root.querySelector('#crop-choice').textContent = CROPS[this.selectedCrop].label; this.setTool('plant'); }
  async handleCell(cell) {
    if (!this.farm || cell.x < 0 || cell.y < 0 || cell.x >= MAP.width || cell.y >= MAP.height) return;
    const plot = this.farm.plots.find((item) => item.x === cell.x && item.y === cell.y);
    const building = this.farm.buildings.find((item) => item.x === cell.x && item.y === cell.y);
    const chicken = this.farm.chickens.find((item) => item.x === cell.x && item.y === cell.y);
    // Keep the application model's presentation stage in sync when Pixi is
    // active. This is derived from the server timestamp; harvest remains an
    // API mutation and cannot be completed locally by this check.
    if (plot?.stage === 'growing' && Number.isFinite(timestamp(plot.readyAt)) && timestamp(plot.readyAt) <= Date.now()) plot.stage = 'ready';
    if (this.tool === 'harvest' && plot?.stage === 'ready') return this.harvest(plot);
    if (this.tool === 'plant' && plot?.stage === 'empty') return this.plant(plot);
    if (this.tool === 'build' && !building) return this.buildCoop(cell.x, cell.y);
    if (this.tool === 'feed' && chicken) return this.feedChicken(chicken);
    if (this.tool === 'collect' && chicken) return this.collectChicken(chicken);
    if (this.tool !== 'inspect') return;
    if (plot) {
      if (plot.stage === 'ready') this.setStatus(t('readyCrop', { crop: CROPS[plot.cropId].label }));
      else if (plot.stage === 'empty') this.setStatus(t('emptyPlot'));
      else this.setStatus(t('growingCrop', { crop: CROPS[plot.cropId].label }));
    } else if (building) this.setStatus(building.buildingId === 'chicken_coop_lv1' ? t('coopLevel') : t('fixedBuilding'));
    else if (chicken) this.setStatus(Number.isFinite(timestamp(chicken.productReadyAt)) && timestamp(chicken.productReadyAt) <= Date.now() ? t('chickenReady') : t('chickenResting'));
  }
  applyMutation(data) {
    if (!data?.character) throw new Error(t('invalidMutation'));
    Object.assign(this.farm, { coins: data.character.coins, diamonds: data.character.diamonds, xp: data.character.xp, level: data.character.level });
    for (const delta of data.inventoryDelta || []) this.farm.inventory[delta.itemId] = delta.newQuantity;
    return data;
  }
  async plant(plot) {
    const crop = CROPS[this.selectedCrop];
    if (!crop || this.farm.coins < crop.cost) return this.setStatus(t('notEnoughCoins', { crop: crop?.label || t('rice') }));
    try {
      const data = this.applyMutation(await this.api.plant(plot.id, this.selectedCrop));
      plot.cropId = data.crop.cropId; plot.readyAt = Date.parse(data.crop.readyAt); plot.stage = 'growing'; this.setStatus(t('planted', { crop: crop.label }));
    } catch (error) {
      if (error.network) { this.farm.coins -= crop.cost; plot.cropId = this.selectedCrop; plot.readyAt = Date.now() + crop.grow * 1000; plot.stage = 'growing'; this.setStatus(t('plantedLocal', { crop: crop.label })); }
      else this.setStatus(error.message || t('invalidMutation'));
    }
    this.persist(); this.updateHeader();
  }
  async harvest(plot) {
    const crop = CROPS[plot.cropId];
    try {
      const data = this.applyMutation(await this.api.harvest(plot.id)); plot.stage = 'empty'; plot.cropId = null; plot.readyAt = null;
      this.gameRenderer?.renderer?.playEffectAtGrid?.('fx_harvest', plot.x, plot.y);
      this.setStatus(t('harvested', { crop: crop.label, quantity: data.harvested?.quantity || crop.yield }));
    } catch (error) {
      if (error.network) { this.farm.inventory[plot.cropId] = (this.farm.inventory[plot.cropId] || 0) + crop.yield; this.farm.xp += crop.xp; plot.stage = 'empty'; plot.cropId = null; plot.readyAt = null; this.setStatus(t('harvestedLocal', { crop: crop.label, quantity: crop.yield })); }
      else this.setStatus(error.message || t('invalidMutation'));
    }
    this.persist(); this.updateHeader();
  }
  async buildCoop(x, y) {
    if (this.farm.level < 2) return this.setStatus(t('needLevelCoop'));
    if (this.farm.coins < 300) return this.setStatus(t('needCoinsCoop'));
    if (this.farm.buildings.some((item) => item.buildingId === 'chicken_coop_lv1')) return this.setStatus(t('uniqueCoop'));
    try {
      const data = this.applyMutation(await this.api.build('chicken_coop_lv1', x, y)); const object = data.object;
      this.farm.buildings.push({ id: object.id, buildingId: object.definitionId, x: object.gridX, y: object.gridY, footprint: [3, 2] });
      this.gameRenderer?.renderer?.playEffectAtGrid?.('fx_build_success', object.gridX, object.gridY);
      if (data.animal) this.farm.chickens.push({ ...data.animal, x: x + 1, y: y + 1, direction: 'SE' }); this.setStatus(t('builtCoop'));
    } catch (error) {
      if (error.network) { this.farm.coins -= 300; this.farm.buildings.push({ id: 'local-coop-' + Date.now(), buildingId: 'chicken_coop_lv1', x, y, footprint: [3, 2] }); this.farm.chickens.push({ id: 'local-chicken-' + Date.now(), x: x + 1, y: y + 1, direction: 'SE', state: 'IDLE', productReadyAt: null }); this.setStatus(t('builtCoopLocal')); }
      else this.setStatus(error.message || t('invalidMutation'));
    }
    this.persist(); this.updateHeader();
  }
  async buyFeed() {
    try { this.applyMutation(await this.api.buyFeed(1)); this.setStatus(t('boughtFeed')); }
    catch (error) { if (error.network) { if (this.farm.coins < 5) return this.setStatus(t('noCoinsFeed')); this.farm.coins -= 5; this.farm.inventory.chicken_feed = (this.farm.inventory.chicken_feed || 0) + 1; this.setStatus(t('boughtFeedLocal')); } else this.setStatus(error.message || t('invalidMutation')); }
    this.persist(); this.updateHeader();
  }
  async sellItem(itemId, quantity = 1) {
    const available = this.farm.inventory[itemId] || 0; if (available < quantity) return this.setStatus(t('noRice'));
    try { const data = this.applyMutation(await this.api.sell(itemId, quantity)); this.setStatus(t('soldRice', { quantity, coins: data.earned?.coins || 0 })); }
    catch (error) { if (error.network) { this.farm.inventory[itemId] -= quantity; this.farm.coins += quantity * (CROPS[itemId]?.sell || 0); this.setStatus(t('soldRiceLocal', { quantity })); } else this.setStatus(error.message || t('invalidMutation')); }
    this.persist(); this.updateHeader();
  }
  async completeFirstOrder() {
    const order = this.farm.orders?.find((item) => item.status === 'OPEN'); if (!order) return this.setStatus(t('noOrders'));
    try { const data = this.applyMutation(await this.api.completeOrder(order.id)); const index = this.farm.orders.findIndex((item) => item.id === order.id); if (index >= 0) this.farm.orders[index] = data.replacement || { ...order, status: 'COMPLETED' }; this.setStatus(t('completedOrder', { coins: data.earned?.coins || 0 })); }
    catch (error) { this.setStatus(error.message || t('invalidMutation')); }
    this.persist(); this.updateHeader();
  }
  async claimFirstQuest() {
    const quest = this.farm.quests?.find((item) => item.completed && !item.claimed); if (!quest) return this.setStatus(t('noQuest'));
    try { const data = this.applyMutation(await this.api.claimQuest(quest.questId)); Object.assign(quest, data.quest); this.setStatus(t('claimedQuest', { coins: data.reward?.coins || 0 })); }
    catch (error) { this.setStatus(error.message || t('invalidMutation')); }
    this.persist(); this.updateHeader();
  }
  async feedChicken(chicken) {
    if ((this.farm.inventory.chicken_feed || 0) < 1) return this.setStatus(t('noFeed'));
    try { const data = this.applyMutation(await this.api.feed(chicken.id)); Object.assign(chicken, data.animal, { productReadyAt: Date.parse(data.animal.productReadyAt), state: 'EAT' }); this.setStatus(t('fed')); }
    catch (error) { if (error.network) { this.farm.inventory.chicken_feed -= 1; chicken.state = 'EAT'; chicken.productReadyAt = Date.now() + 600000; this.setStatus(t('fedLocal')); } else this.setStatus(error.message || t('invalidMutation')); }
    this.persist(); this.updateHeader();
  }
  async collectChicken(chicken) {
    try { const data = this.applyMutation(await this.api.collect(chicken.id)); Object.assign(chicken, data.animal, { productReadyAt: null, state: 'HAPPY' }); this.gameRenderer?.renderer?.playEffectAtGrid?.('fx_egg_collect', chicken.x, chicken.y); this.setStatus(t('collectedEgg')); }
    catch (error) { if (error.network) { if (!chicken.productReadyAt || chicken.productReadyAt > Date.now()) return this.setStatus(t('eggNotReady')); this.farm.inventory.egg = (this.farm.inventory.egg || 0) + 1; chicken.productReadyAt = null; chicken.state = 'HAPPY'; this.setStatus(t('collectedEggLocal')); } else this.setStatus(error.message || t('eggNotReady')); }
    this.persist(); this.updateHeader();
  }
  updateHeader() { if (!this.farm) return; this.root.querySelector('#coins').textContent = formatNumber(this.farm.coins); this.root.querySelector('#diamonds').textContent = formatNumber(this.farm.diamonds); this.root.querySelector('#level').textContent = t('level', { level: this.farm.level }); const used = Object.values(this.farm.inventory).reduce((sum, value) => sum + Number(value || 0), 0); this.root.querySelector('#capacity').textContent = t('capacity', { used, capacity: this.farm.warehouseCapacity }); this.syncGameRenderer(); }
  setStatus(message) { const status = this.root.querySelector('#status'); if (status) status.textContent = message; const notice = this.root.querySelector('#notice'); if (notice) { notice.textContent = message; notice.classList.add('show'); clearTimeout(this.noticeTimer); this.noticeTimer = setTimeout(() => notice.classList.remove('show'), 2600); } }
}

function normalizeFarm(value, name) {
  const fallback = defaultFarm(name);
  if (value?.farm && Array.isArray(value.objects) && Array.isArray(value.plots)) {
    const buildingSizes = { farmhouse_lv1: [3, 3], warehouse_lv1: [2, 2], pond_small_lv1: [2, 2], chicken_coop_lv1: [3, 2] };
    const buildings = value.objects.map((object) => ({ id: object.id, buildingId: object.definitionId, x: object.gridX, y: object.gridY, footprint: buildingSizes[object.definitionId] || [1, 1] }));
    const cropsByPlot = new Map((value.crops || []).map((crop) => [crop.plotId, crop]));
    const plots = value.plots.map((plot) => {
      const crop = cropsByPlot.get(plot.id);
      const readyAt = crop?.readyAt ? Date.parse(crop.readyAt) : null;
      return { id: plot.id, x: plot.gridX, y: plot.gridY, cropId: crop?.cropId || null, readyAt, stage: crop ? (readyAt <= Date.now() ? 'ready' : 'growing') : 'empty' };
    });
    const inventory = { ...fallback.inventory };
    for (const entry of value.inventory || []) inventory[entry.itemId] = entry.quantity;
    const chickens = (value.animals || []).map((animal) => {
      const coop = buildings.find((building) => building.id === animal.buildingId);
      return { ...animal, x: coop ? coop.x + 1 : 1, y: coop ? coop.y + 1 : 1, direction: 'SE' };
    });
    return {
      ...fallback, contentVersion: value.contentVersion || fallback.contentVersion,
      character: { id: value.character?.id || fallback.character.id, name: normalizeName(value.character?.displayName || name) },
      coins: value.character?.coins ?? fallback.coins, diamonds: value.character?.diamonds ?? fallback.diamonds,
      xp: value.character?.xp ?? fallback.xp, level: value.character?.level ?? fallback.level,
      warehouseCapacity: value.warehouse?.capacity ?? fallback.warehouseCapacity, inventory, plots, buildings, chickens,
      orders: Array.isArray(value.orders) ? value.orders : fallback.orders,
      quests: Array.isArray(value.quests) ? value.quests : fallback.quests,
    };
  }
  const source = value?.farm && typeof value.farm === 'object' ? value.farm : value;
  if (!source || typeof source !== 'object') return fallback;
  return { ...fallback, ...source, character: { ...fallback.character, ...(source.character || {}), name: normalizeName(source.character?.name || name) }, inventory: { ...fallback.inventory, ...(source.inventory || {}) }, plots: Array.isArray(source.plots) ? source.plots : fallback.plots, buildings: Array.isArray(source.buildings) ? source.buildings : fallback.buildings, chickens: Array.isArray(source.chickens) ? source.chickens : fallback.chickens, orders: Array.isArray(source.orders) ? source.orders : fallback.orders, quests: Array.isArray(source.quests) ? source.quests : fallback.quests };
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }

const app = new FarmApp(document.querySelector('#app'));
app.start();
