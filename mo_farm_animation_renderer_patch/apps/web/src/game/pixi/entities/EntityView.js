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

  destroy() {
    this.container.destroy({ children: true });
  }
}
