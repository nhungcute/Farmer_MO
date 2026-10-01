import { Application } from 'pixi.js';
import { ManifestAnimationRegistry } from '../core/ManifestAnimationRegistry.js';
import { adaptFarmToRenderWorld, createRendererDemoWorld } from '../core/WorldAdapter.js';
import { isoToWorld, worldToIso } from '../core/iso.js';
import { PixiAssetRegistry } from './PixiAssetRegistry.js';
import { FarmScene } from './scene/FarmScene.js';
import { CameraController } from './systems/CameraController.js';
import { DebugHudController } from './systems/DebugHudController.js';
import { InputController } from './systems/InputController.js';

function isCoarsePointer() {
  return globalThis.matchMedia?.('(pointer: coarse)')?.matches ?? false;
}

export class PixiFarmRenderer {
  constructor({
    host,
    assetBase = './public/assets',
    debug = false,
    quality = 'HIGH',
    mapWidth = 24,
    mapHeight = 24,
  } = {}) {
    if (!host) throw new Error('PixiFarmRenderer requires a host element.');
    this.host = host;
    this.assetBase = assetBase;
    this.debugEnabled = Boolean(debug);
    this.quality = String(quality || 'HIGH').toUpperCase();
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.app = null;
    this.assetRegistry = null;
    this.animationRegistry = null;
    this.scene = null;
    this.camera = null;
    this.input = null;
    this.debugHud = null;
    this.resizeObserver = null;
    this.events = new Map();
    this.world = null;
    this.initialized = false;
    this.interaction = { tool: 'inspect', assetId: null, footprint: [1, 1] };
    this.hoverCell = null;
    this.cameraTouched = false;
  }

  async init() {
    if (this.initialized) return this;
    const dpr = this.#resolutionForQuality();
    // The web shell provides an absolute overlay host. Only add a positioning
    // context for standalone callers whose host is otherwise static; never
    // overwrite a computed absolute/fixed layout and push the game grid taller.
    if (!this.host.style.position && getComputedStyle(this.host).position === 'static') this.host.style.position = 'relative';
    this.host.style.overflow = 'hidden';

    this.app = new Application();
    await this.app.init({
      resizeTo: this.host,
      resolution: dpr,
      autoDensity: true,
      antialias: true,
      background: '#96cd61',
      backgroundAlpha: 1,
    });
    this.app.canvas.classList.add('mo-farm-pixi-canvas');
    this.app.canvas.dataset.liveReady = 'false';
    this.app.canvas.__farmRenderer = this;
    this.host.__farmRenderer = this;
    Object.assign(this.app.canvas.style, { width: '100%', height: '100%', display: 'block', touchAction: 'none' });
    this.host.appendChild(this.app.canvas);

    this.assetRegistry = new PixiAssetRegistry({ assetBase: this.assetBase });
    await this.assetRegistry.load();
    this.animationRegistry = new ManifestAnimationRegistry(this.assetRegistry.manifest);

    this.scene = new FarmScene({
      assetRegistry: this.assetRegistry,
      animationRegistry: this.animationRegistry,
      onAnimationEvent: (event) => this.emit('animationEvent', event),
    });
    this.app.stage.addChild(this.scene.root);

    const mobile = isCoarsePointer();
    this.camera = new CameraController({
      worldContainer: this.scene.root,
      viewportWidth: this.host.clientWidth || 1,
      viewportHeight: this.host.clientHeight || 1,
      minZoom: 0.2,
      maxZoom: mobile ? 1.3 : 1.5,
    });

    this.input = new InputController({
      canvas: this.app.canvas,
      camera: this.camera,
      onTap: (screenX, screenY) => this.#onCanvasTap(screenX, screenY),
      onHover: (point) => this.#onHover(point),
      onGesture: () => { this.cameraTouched = true; },
    });

    this.debugHud = new DebugHudController({ host: this.host, enabled: this.debugEnabled });
    this.resizeObserver = new ResizeObserver(() => this.#syncViewport());
    this.resizeObserver.observe(this.host);
    this.#syncViewport();

    this.app.ticker.add((ticker) => this.#update(ticker.deltaMS));
    this.initialized = true;
    return this;
  }

  #resolutionForQuality() {
    const dpr = Math.max(1, globalThis.devicePixelRatio || 1);
    if (this.quality === 'LOW') return 1;
    if (this.quality === 'MEDIUM') return Math.min(1.5, dpr);
    return Math.min(2, dpr);
  }

  #syncViewport() {
    if (!this.camera) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.camera.setViewport(width, height);
    if (this.world && !this.cameraTouched) this.#frameFarm();
  }

  #frameFarm() {
    if (!this.camera) return;
    const { viewportWidth: width, viewportHeight: height } = this.camera.model;
    const bounds = this.scene?.framingBounds({ prioritizeActions: height < 600 });
    if (!bounds) return;
    // The playable area stays between the portrait, action dock and quest card.
    const desktop = width >= 1200;
    const left = width >= 700 ? 98 : 32;
    const right = desktop ? 295 : 32;
    const top = height >= 600 ? 105 : 50;
    // Reserve the open action palette too, so feeding and planting never place
    // the target behind DOM controls when a tool is selected.
    const bottom = height >= 600 ? 210 : 132;
    const availableWidth = Math.max(240, width - left - right);
    const availableHeight = Math.max(180, height - top - bottom);
    const zoom = Math.max(this.camera.model.minZoom, Math.min(1.12,
      availableWidth / Math.max(600, bounds.maxX - bounds.minX + 100),
      availableHeight / Math.max(460, bounds.maxY - bounds.minY + 40)));
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    this.camera.focus(centerX + (right - left) / (2 * zoom), centerY + (bottom - top) / (2 * zoom), zoom);
  }

  #onCanvasTap(screenX, screenY) {
    if (!this.camera || !this.scene) return;
    const world = this.camera.model.screenToWorld(screenX, screenY);
    const object = this.interaction.tool.startsWith('build') ? null : this.scene.pick(world.x, world.y);
    if (object) {
      this.scene.setSelection(object.gridX, object.gridY);
      this.emit('objectSelected', object);
      return;
    }
    const cell = this.#cellAt(world.x, world.y);
    if (cell.x < 0 || cell.y < 0 || cell.x >= (this.world?.width || this.mapWidth) || cell.y >= (this.world?.height || this.mapHeight)) return;
    this.scene.setSelection(cell.x, cell.y);
    this.emit('cellSelected', cell);
  }

  #cellAt(worldX, worldY) {
    // Gameplay objects are centered on integer grid coordinates.
    const p = worldToIso(worldX, worldY, this.scene.tileWidth, this.scene.tileHeight);
    return { x: Math.round(p.x), y: Math.round(p.y) };
  }

  #onHover(point) {
    if (!this.scene || !this.camera || !this.world) return;
    if (!point) {
      this.hoverCell = null;
      this.scene.setPlacement(null);
      this.app.canvas.style.cursor = this.input?.pointers.size ? 'grabbing' : 'grab';
      return;
    }
    const world = this.camera.model.screenToWorld(point.x, point.y);
    if (this.interaction.tool.startsWith('build')) {
      const cell = this.#cellAt(world.x, world.y);
      if (cell.x !== this.hoverCell?.x || cell.y !== this.hoverCell?.y) {
        this.hoverCell = cell;
        this.scene.setPlacement(cell, this.interaction);
      }
      this.app.canvas.style.cursor = 'crosshair';
    } else {
      this.app.canvas.style.cursor = this.scene.pick(world.x, world.y) ? 'pointer' : 'grab';
    }
  }

  #update(deltaMs) {
    if (!this.scene || !this.camera) return;
    const visible = this.camera.model.visibleWorldRect(180);
    this.scene.update(deltaMs, visible);
    this.debugHud?.update(performance.now(), deltaMs, {
      dpr: this.app.renderer.resolution || this.#resolutionForQuality(),
      camera: this.camera.model,
      scene: this.scene.stats(),
      atlasPages: Object.values(this.assetRegistry.manifest?.generated?.pages || {}).reduce((sum, pages) => sum + pages.length, 0),
    });
  }

  setWorld(world, { fit = true } = {}) {
    if (!this.initialized) throw new Error('Call renderer.init() before setWorld().');
    this.world = world;
    const bounds = this.scene.loadWorld(world);
    this.camera.setBounds(bounds, { padding: 240, fit: false });
    if (fit) this.#frameFarm();
    this.app.render();
    this.app.canvas.dataset.liveReady = 'true';
    this.emit('worldLoaded', { world, bounds });
  }

  loadFarm(farm, options = {}) {
    this.setWorld(adaptFarmToRenderWorld(farm, { width: this.mapWidth, height: this.mapHeight }), options);
  }

  loadDemo(options = {}) {
    this.setWorld(createRendererDemoWorld({ width: this.mapWidth, height: this.mapHeight, ...options }));
  }

  syncWorld(world) {
    this.world = world;
    const bounds = this.scene.syncWorld(world);
    if (bounds) this.camera.setBounds(bounds, { padding: 240, fit: false });
    if (this.hoverCell) this.scene.setPlacement(this.hoverCell, this.interaction);
  }

  updateEntity(entityModel) {
    if (!this.world) return;
    const groups = ['buildings', 'crops', 'animals'];
    for (const key of groups) {
      const index = this.world[key]?.findIndex((entry) => entry.id === entityModel.id) ?? -1;
      if (index >= 0) this.world[key][index] = { ...this.world[key][index], ...entityModel };
    }
    this.scene.updateEntity(entityModel);
  }

  selectCell(gridX, gridY, options) {
    this.scene.setSelection(gridX, gridY, options);
  }

  focusGrid(gridX, gridY, zoom = 1.05) {
    const point = isoToWorld(gridX, gridY);
    this.camera.focus(point.x, point.y, zoom);
  }

  focusHome() {
    this.cameraTouched = false;
    this.#frameFarm();
  }

  zoomBy(factor) {
    if (!this.camera || !Number.isFinite(factor) || factor <= 0) return;
    const camera = this.camera.model;
    this.cameraTouched = true;
    this.camera.zoomAt(camera.viewportWidth / 2, camera.viewportHeight / 2, camera.zoom * factor);
  }

  cellToScreen(gridX, gridY) {
    if (!this.scene || !this.camera || !Number.isFinite(gridX) || !Number.isFinite(gridY)) return null;
    const target = this.interaction.tool.startsWith('build')
      ? isoToWorld(gridX, gridY, this.scene.tileWidth, this.scene.tileHeight)
      : this.scene.targetForCell(gridX, gridY);
    const point = this.camera.model.worldToScreen(target.x, target.y);
    const rect = this.app.canvas.getBoundingClientRect();
    return { ...point, clientX: point.x + rect.left, clientY: point.y + rect.top, entityId: target.entityId || null };
  }

  setInteraction(tool = 'inspect', { assetId = null, footprint = [1, 1] } = {}) {
    this.interaction = {
      tool: String(tool), assetId,
      footprint: [0, 1].map(index => Math.max(1, Math.min(24, Math.floor(Number(footprint?.[index]) || 1)))),
    };
    this.hoverCell = null;
    this.scene?.setPlacement(null);
    if (this.app) this.app.canvas.style.cursor = String(tool).startsWith('build') ? 'crosshair' : 'grab';
  }

  playEffectAtGrid(animationId, gridX, gridY) {
    const point = isoToWorld(gridX, gridY);
    return this.scene.playEffect(animationId, point.x, point.y);
  }

  setDebug(enabled) {
    this.debugEnabled = Boolean(enabled);
    this.debugHud?.setEnabled(this.debugEnabled);
  }

  on(eventName, handler) {
    if (!this.events.has(eventName)) this.events.set(eventName, new Set());
    this.events.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    this.events.get(eventName)?.delete(handler);
  }

  emit(eventName, payload) {
    for (const handler of this.events.get(eventName) || []) handler(payload);
  }

  destroy() {
    if (this.host.__farmRenderer === this) delete this.host.__farmRenderer;
    if (this.app?.renderer) {
      delete this.app.canvas.__farmRenderer;
      this.app.canvas.dataset.liveReady = 'false';
    }
    this.resizeObserver?.disconnect();
    this.input?.destroy();
    this.debugHud?.destroy();
    this.scene?.destroy();
    this.assetRegistry?.destroy();
    if (this.app?.renderer) this.app.destroy(true, { children: true, texture: false, textureSource: false });
    else this.app?.stage?.destroy({ children: true });
    this.events.clear();
    this.initialized = false;
  }
}
