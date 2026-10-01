import { Container } from 'pixi.js';
import { depthFromGrid, isoToWorld } from '../../core/iso.js';

export class EntityView {
  constructor(model, { tileWidth = 128, tileHeight = 64 } = {}) {
    this.model = { ...model };
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.container = new Container();
    this.container.sortableChildren = true;
    this.container.label = model.id || model.kind || 'entity';
    // The canvas input controller is the only source of interaction events.
    this.container.eventMode = 'none';
    this.worldX = 0;
    this.worldY = 0;
    this.cullHalfWidth = 128;
    this.cullHalfHeight = 128;
    this.setGridPosition(model.gridX || 0, model.gridY || 0);
  }

  setGridPosition(gridX, gridY) {
    this.model.gridX = Number(gridX) || 0;
    this.model.gridY = Number(gridY) || 0;
    const world = isoToWorld(this.model.gridX, this.model.gridY, this.tileWidth, this.tileHeight);
    this.worldX = world.x;
    this.worldY = world.y;
    this.container.position.set(world.x, world.y);
    this.updateDepth();
  }

  updateDepth(offsetY = 0) {
    this.container.zIndex = depthFromGrid(this.model.gridX, this.model.gridY, offsetY, this.tileHeight);
  }

  sync(model) {
    const moved = model.gridX !== this.model.gridX || model.gridY !== this.model.gridY;
    this.model = { ...this.model, ...model };
    if (moved) this.setGridPosition(this.model.gridX, this.model.gridY);
  }

  update() {}

  pickSprite() {
    return this.sprite || this.cropSprite || this.player?.sprite || this.base || null;
  }

  containsWorldPoint(point, root, assetRegistry) {
    if (this.nameplate) {
      const local = this.nameplate.toLocal(point, root);
      const bounds = this.nameplate.getLocalBounds();
      if (local.x >= bounds.x && local.x <= bounds.x + bounds.width
        && local.y >= bounds.y && local.y <= bounds.y + bounds.height) return true;
    }
    const sprite = this.pickSprite();
    if (sprite?.visible && sprite.texture?.width > 1) {
      const local = sprite.toLocal(point, root);
      const x = local.x + sprite.anchor.x * sprite.texture.orig.width;
      const y = local.y + sprite.anchor.y * sprite.texture.orig.height;
      if (assetRegistry.textureContainsPoint(sprite.texture, x, y)) return true;
    }
    if (this.model.kind === 'crop') {
      const x = point.x - this.worldX;
      const y = point.y - this.worldY;
      return Math.abs(x) / 78 + Math.abs(y - 2) / 40 <= 1;
    }
    return false;
  }

  targetWorldPoint(root) {
    const sprite = this.pickSprite();
    if (!sprite?.visible || sprite.texture.width <= 1) return { x: this.worldX, y: this.worldY };
    return root.toLocal(sprite.toGlobal({
      x: (0.5 - sprite.anchor.x) * sprite.texture.orig.width,
      y: (0.58 - sprite.anchor.y) * sprite.texture.orig.height,
    }));
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
