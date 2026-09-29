import { Application } from 'pixi.js';
import { ManifestAnimationRegistry } from '../core/ManifestAnimationRegistry.js';
import { adaptFarmToRenderWorld, createRendererDemoWorld } from '../core/WorldAdapter.js';
import { isoToWorld, worldToCell } from '../core/iso.js';
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
  }

  async init() {
    if (this.initialized) return this;
    const dpr = this.#resolutionForQuality();
    this.host.style.position ||= 'relative';
    this.host.style.overflow = 'hidden';

    this.app = new Application();
    await this.app.init({
      resizeTo: this.host,
      resolution: dpr,
      autoDensity: true,
      antialias: true,
      background: '#9ed77d',
      backgroundAlpha: 1,
    });
    this.app.canvas.classList.add('mo-farm-pixi-canvas');
    Object.assign(this.app.canvas.style, { width: '100%', height: '100%', display: 'block', touchAction: 'none' });
    this.host.appendChild(this.app.canvas);

    this.assetRegistry = new PixiAssetRegistry({ assetBase: this.assetBase });
    await this.assetRegistry.load();
    this.animationRegistry = new ManifestAnimationRegistry(this.assetRegistry.manifest);

    this.scene = new FarmScene({
      assetRegistry: this.assetRegistry,
      animationRegistry: this.animationRegistry,
      onSelect: (model) => this.emit('objectSelected', model),
      onAnimationEvent: (event) => this.emit('animationEvent', event),
    });
    this.app.stage.addChild(this.scene.root);

    const mobile = isCoarsePointer();
    this.camera = new CameraController({
      worldContainer: this.scene.root,
      viewportWidth: this.host.clientWidth || 1,
      viewportHeight: this.host.clientHeight || 1,
      minZoom: mobile ? 0.7 : 0.65,
      maxZoom: mobile ? 1.3 : 1.5,
    });

    this.input = new InputController({
      canvas: this.app.canvas,
      camera: this.camera,
      onTap: (screenX, screenY) => this.#onCanvasTap(screenX, screenY),
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
  }

  #onCanvasTap(screenX, screenY) {
    if (!this.camera || !this.scene) return;
    const world = this.camera.model.screenToWorld(screenX, screenY);
    const cell = worldToCell(world.x, world.y);
    if (cell.x < 0 || cell.y < 0 || cell.x >= (this.world?.width || this.mapWidth) || cell.y >= (this.world?.height || this.mapHeight)) return;
    this.scene.setSelection(cell.x, cell.y);
    this.emit('cellSelected', cell);
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
    this.camera.setBounds(bounds, { padding: 160, fit });
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
    this.scene.syncWorld(world);
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
    this.resizeObserver?.disconnect();
    this.input?.destroy();
    this.debugHud?.destroy();
    this.scene?.destroy();
    this.assetRegistry?.destroy();
    this.app?.destroy(true, { children: true, texture: false, textureSource: false });
    this.events.clear();
    this.initialized = false;
  }
}
