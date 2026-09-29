import { Container, Graphics, Sprite } from 'pixi.js';
import { isEntityVisible } from '../../core/Culling.js';
import { isoToWorld, mapWorldBounds, tileDiamond } from '../../core/iso.js';
import { BuildingView } from '../entities/BuildingView.js';
import { ChickenView } from '../entities/ChickenView.js';
import { CropView } from '../entities/CropView.js';
import { OneShotEffectView } from '../entities/OneShotEffectView.js';
import { PondView } from '../entities/PondView.js';

export class FarmScene {
  constructor({ assetRegistry, animationRegistry, tileWidth = 128, tileHeight = 64, onSelect, onAnimationEvent } = {}) {
    this.assetRegistry = assetRegistry;
    this.animationRegistry = animationRegistry;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.onSelect = onSelect || null;
    this.onAnimationEvent = onAnimationEvent || null;

    this.root = new Container();
    this.root.label = 'FarmScene';
    this.terrainLayer = new Container();
    this.entityLayer = new Container();
    this.entityLayer.sortableChildren = true;
    this.effectsLayer = new Container();
    this.effectsLayer.sortableChildren = true;
    this.selectionLayer = new Container();
    this.root.addChild(this.terrainLayer, this.entityLayer, this.effectsLayer, this.selectionLayer);

    this.entities = new Map();
    this.effects = new Set();
    this.world = null;
    this.worldBounds = null;
    this.selection = null;
    this.cullAccumulator = 0;
    this.visibleCount = 0;
    this.cullingApplied = false;
    this.animatedCount = 0;
  }

  loadWorld(world) {
    this.world = globalThis.structuredClone ? globalThis.structuredClone(world) : JSON.parse(JSON.stringify(world));
    this.#buildTerrain();
    this.#clearEntities();
    for (const model of this.#allModels(this.world)) this.#addEntity(model);
    this.worldBounds = mapWorldBounds(this.world.width, this.world.height, this.tileWidth, this.tileHeight);
    this.cullAccumulator = 0;
    this.visibleCount = 0;
    this.cullingApplied = false;
    return this.worldBounds;
  }

  syncWorld(world) {
    const dimensionsChanged = !this.world
      || this.world.width !== world?.width
      || this.world.height !== world?.height
      || this.world.terrainAssetId !== world?.terrainAssetId;
    this.world = world;
    if (dimensionsChanged) this.#buildTerrain();
    const incoming = new Map(this.#allModels(world).map((model) => [model.id, model]));

    for (const [id, view] of this.entities) {
      if (!incoming.has(id)) {
        view.destroy();
        this.entities.delete(id);
      }
    }

    for (const [id, model] of incoming) {
      const existing = this.entities.get(id);
      if (!existing || existing.model.kind !== model.kind) {
        existing?.destroy();
        if (existing) this.entities.delete(id);
        this.#addEntity(model);
      } else {
        existing.sync(model);
      }
    }
    this.worldBounds = mapWorldBounds(this.world.width, this.world.height, this.tileWidth, this.tileHeight);
    return this.worldBounds;
  }

  updateEntity(model) {
    if (!model?.id) return;
    const existing = this.entities.get(model.id);
    if (!existing) {
      this.#addEntity(model);
      return;
    }
    existing.sync(model);
  }

  #allModels(world) {
    // IDs are the renderer reconciliation key. Ignore malformed records and
    // collapse duplicates so a repeated bootstrap/mutation cannot create two
    // Pixi containers for one gameplay entity.
    const models = [];
    const seen = new Set();
    for (const model of [
      ...(world?.buildings || []),
      ...(world?.crops || []),
      ...(world?.animals || []),
    ]) {
      if (!model?.id || seen.has(model.id)) continue;
      seen.add(model.id);
      models.push(model);
    }
    return models;
  }

  #buildTerrain() {
    this.terrainLayer.removeChildren().forEach((child) => child.destroy?.());
    if (!this.world) return;
    const variants = ['terrain_grass_tile', 'terrain_grass_variant_01', 'terrain_grass_variant_02', 'terrain_grass_variant_03', 'terrain_grass_variant_04'];

    for (let y = 0; y < this.world.height; y += 1) {
      for (let x = 0; x < this.world.width; x += 1) {
        const variantIndex = (x * 17 + y * 31) % 13 === 0 ? 1 + ((x + y) % 4) : 0;
        const assetId = this.assetRegistry.has(variants[variantIndex]) ? variants[variantIndex] : this.world.terrainAssetId;
        const sprite = new Sprite(this.assetRegistry.texture(assetId));
        const anchor = this.assetRegistry.anchor(assetId, { x: 0.5, y: 0.5 });
        const sourceScale = this.assetRegistry.sourceScale(assetId);
        sprite.anchor.set(anchor.x, anchor.y);
        sprite.scale.set(1 / sourceScale);
        const point = isoToWorld(x, y, this.tileWidth, this.tileHeight);
        sprite.position.set(point.x, point.y);
        this.terrainLayer.addChild(sprite);
      }
    }
  }

  #clearEntities() {
    for (const view of this.entities.values()) view.destroy();
    this.entities.clear();
    this.entityLayer.removeChildren();
  }

  #deps() {
    return {
      assetRegistry: this.assetRegistry,
      animationRegistry: this.animationRegistry,
      tileWidth: this.tileWidth,
      tileHeight: this.tileHeight,
      onSelect: (model) => this.onSelect?.(model),
      onAnimationEvent: (event) => this.onAnimationEvent?.(event),
    };
  }

  #addEntity(model) {
    let view;
    if (model.kind === 'chicken') view = new ChickenView(model, this.#deps());
    else if (model.kind === 'pond') view = new PondView(model, this.#deps());
    else if (model.kind === 'crop') view = new CropView(model, this.#deps());
    else view = new BuildingView(model, this.#deps());
    this.entities.set(model.id, view);
    this.entityLayer.addChild(view.container);
  }

  setSelection(gridX, gridY, { valid = null } = {}) {
    this.selectionLayer.removeChildren().forEach((child) => child.destroy?.());
    if (!Number.isFinite(gridX) || !Number.isFinite(gridY)) return;
    const points = tileDiamond(gridX, gridY, this.tileWidth, this.tileHeight);
    const color = valid === false ? 0xf05a4f : valid === true ? 0x6ad44c : 0xffdc63;
    const graphics = new Graphics().poly(points.flatMap((point) => [point.x, point.y])).fill({ color, alpha: 0.2 }).stroke({ color, width: 3, alpha: 0.9 });
    this.selectionLayer.addChild(graphics);
    this.selection = { gridX, gridY, valid };
  }

  playEffect(animationId, worldX, worldY) {
    let effect;
    effect = new OneShotEffectView({
      assetRegistry: this.assetRegistry,
      animationRegistry: this.animationRegistry,
      animationId,
      worldX,
      worldY,
      onDone: () => {
        this.effects.delete(effect);
        effect.destroy();
      },
    });
    effect.container.zIndex = worldY + 2048;
    this.effects.add(effect);
    this.effectsLayer.addChild(effect.container);
    return effect;
  }

  update(deltaMs, visibleWorldRect) {
    this.animatedCount = 0;
    for (const view of this.entities.values()) {
      if (!view.container.visible) continue;
      view.update(deltaMs);
      if (view.player || view.water || view.glow) this.animatedCount += 1;
    }

    for (const effect of [...this.effects]) effect.update(deltaMs);

    this.cullAccumulator += deltaMs;
    if (visibleWorldRect && this.cullAccumulator >= 100) {
      this.cullAccumulator = 0;
      let visible = 0;
      for (const view of this.entities.values()) {
        const isVisible = isEntityVisible(view, visibleWorldRect, 128);
        view.container.visible = isVisible;
        if (isVisible) visible += 1;
      }
      this.visibleCount = visible;
      this.cullingApplied = true;
    }
  }

  stats() {
    return {
      objects: this.entities.size,
      visible: this.cullingApplied ? this.visibleCount : this.entities.size,
      culled: this.cullingApplied ? Math.max(0, this.entities.size - this.visibleCount) : 0,
      animated: this.animatedCount,
      effects: this.effects.size,
      terrainTiles: this.world ? this.world.width * this.world.height : 0,
    };
  }

  destroy() {
    this.#clearEntities();
    for (const effect of this.effects) effect.destroy();
    this.effects.clear();
    this.root.destroy({ children: true });
  }
}
