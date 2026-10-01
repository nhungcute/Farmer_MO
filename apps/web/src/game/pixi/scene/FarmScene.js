import { Container, Graphics, Sprite } from 'pixi.js';
import { isEntityVisible } from '../../core/Culling.js';
import { isoToWorld, mapWorldBounds, tileDiamond } from '../../core/iso.js';
import { BuildingView } from '../entities/BuildingView.js';
import { ChickenView } from '../entities/ChickenView.js';
import { CropView } from '../entities/CropView.js';
import { OneShotEffectView } from '../entities/OneShotEffectView.js';
import { PondView } from '../entities/PondView.js';
import { createFarmLandscape } from './FarmLandscape.js';

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
    this.root.eventMode = 'none';
    this.terrainLayer = new Container();
    this.entityLayer = new Container();
    this.entityLayer.sortableChildren = true;
    this.effectsLayer = new Container();
    this.effectsLayer.sortableChildren = true;
    this.selectionLayer = new Container();
    this.placementLayer = new Container();
    this.root.addChild(this.terrainLayer, this.entityLayer, this.effectsLayer, this.selectionLayer, this.placementLayer);

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
      || this.world.terrainAssetId !== world?.terrainAssetId
      || this.#landscapeKey(this.world) !== this.#landscapeKey(world);
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

  #landscapeKey(world) {
    return [...(world?.buildings || []), ...(world?.crops || [])]
      .map(model => `${model.id}:${model.gridX}:${model.gridY}`).join('|');
  }

  #buildTerrain() {
    this.terrainLayer.removeChildren().forEach((child) => child.destroy?.({ children: true }));
    if (this.world) {
      this.landscape = createFarmLandscape(this.world, this.tileWidth, this.tileHeight, {
        treeTexture: this.assetRegistry.has('decor_orchard_tree') ? this.assetRegistry.texture('decor_orchard_tree') : null,
      });
      this.terrainLayer.addChild(this.landscape);
    }
  }

  refreshLandscape() { this.#buildTerrain(); }

  pick(worldX, worldY) {
    const point = { x: worldX, y: worldY };
    const views = [...this.entities.values()].sort((a, b) => b.container.zIndex - a.container.zIndex);
    for (const view of views) {
      if (view.container.visible && view.containsWorldPoint(point, this.root, this.assetRegistry)) return view.model;
    }
    return null;
  }

  targetForCell(gridX, gridY) {
    const views = [...this.entities.values()];
    const view = views.find(entry => entry.model.gridX === gridX && entry.model.gridY === gridY)
      || views.find(entry => {
        const model = entry.model;
        return model.kind === 'building' && gridX >= model.gridX && gridY >= model.gridY
          && gridX < model.gridX + (model.footprint?.[0] || 1)
          && gridY < model.gridY + (model.footprint?.[1] || 1);
      });
    return view ? { ...view.targetWorldPoint(this.root), entityId: view.model.id }
      : isoToWorld(gridX, gridY, this.tileWidth, this.tileHeight);
  }

  canPlace(gridX, gridY, footprint = [1, 1]) {
    const [width, height] = footprint;
    if (gridX < 0 || gridY < 0 || gridX + width > this.world.width || gridY + height > this.world.height) return false;
    return ![...(this.world.buildings || []), ...(this.world.crops || [])].some(model => {
      const [otherWidth, otherHeight] = model.footprint || [1, 1];
      return gridX < model.gridX + otherWidth && gridX + width > model.gridX
        && gridY < model.gridY + otherHeight && gridY + height > model.gridY;
    });
  }

  setPlacement(cell, { assetId, footprint = [1, 1] } = {}) {
    this.placementLayer.removeChildren().forEach(child => child.destroy({ children: true }));
    this.placement = null;
    if (!cell || !this.world) return;
    const valid = this.canPlace(cell.x, cell.y, footprint);
    const color = valid ? 0x71d94a : 0xf16a5b;
    const tiles = new Graphics();
    for (let x = 0; x < footprint[0]; x += 1) {
      for (let y = 0; y < footprint[1]; y += 1) {
        tiles.poly(tileDiamond(cell.x + x, cell.y + y, this.tileWidth, this.tileHeight).flatMap(p => [p.x, p.y]))
          .fill({ color, alpha: 0.32 }).stroke({ color, width: 2.5, alpha: 0.9 });
      }
    }
    this.placementLayer.addChild(tiles);
    if (assetId && this.assetRegistry.has(assetId)) {
      const ghost = new Sprite(this.assetRegistry.texture(assetId));
      const p = isoToWorld(cell.x, cell.y, this.tileWidth, this.tileHeight);
      const anchor = this.assetRegistry.anchor(assetId);
      ghost.anchor.set(anchor.x, anchor.y);
      ghost.position.set(p.x, p.y);
      ghost.scale.set((assetId.startsWith('building_') ? 1.48 : 1) / this.assetRegistry.sourceScale(assetId));
      ghost.alpha = 0.52;
      ghost.tint = valid ? 0xe4ffcc : 0xffb8ac;
      this.placementLayer.addChild(ghost);
    }
    this.placement = { ...cell, valid, footprint };
    return valid;
  }

  framingBounds({ prioritizeActions = false } = {}) {
    const models = this.#allModels(this.world);
    if (!models.length) return this.worldBounds;
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    let firstActionY = Infinity;
    for (const model of models) {
      const p = isoToWorld(model.gridX, model.gridY, this.tileWidth, this.tileHeight);
      const building = model.kind === 'building' || model.kind === 'pond';
      if (!building) firstActionY = Math.min(firstActionY, p.y - 135);
      bounds.minX = Math.min(bounds.minX, p.x - (building ? 205 : 110));
      bounds.maxX = Math.max(bounds.maxX, p.x + (building ? 205 : 110));
      bounds.minY = Math.min(bounds.minY, p.y - (building ? 285 : 135));
      bounds.maxY = Math.max(bounds.maxY, p.y + (building ? 45 : 42));
    }
    // Short screens frame the reachable crops and animals at a useful size.
    // Tall roofs may extend above the viewport and remain reachable by panning.
    if (prioritizeActions && Number.isFinite(firstActionY)) bounds.minY = firstActionY;
    return bounds;
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
    this.selection = null;
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
    this.landscape?.update?.(deltaMs);
    for (const view of this.entities.values()) {
      if (!view.container.visible) continue;
      view.update(deltaMs);
      if (view.player || view.water || view.glow || view.cropSprite?.visible) this.animatedCount += 1;
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
