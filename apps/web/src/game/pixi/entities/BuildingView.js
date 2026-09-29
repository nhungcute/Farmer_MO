import { Sprite } from 'pixi.js';
import { EntityView } from './EntityView.js';

export class BuildingView extends EntityView {
  constructor(model, deps) {
    super(model, deps);
    this.assetRegistry = deps.assetRegistry;
    this.sprite = new Sprite(this.assetRegistry.texture(model.assetId));
    const sourceScale = this.assetRegistry.sourceScale(model.assetId);
    const anchor = this.assetRegistry.anchor(model.assetId, { x: 0.5, y: 0.86 });
    const offset = this.assetRegistry.renderOffset(model.assetId);
    this.sprite.anchor.set(anchor.x, anchor.y);
    this.sprite.scale.set(1 / sourceScale);
    this.sprite.position.set(offset.x, offset.y);
    this.container.addChild(this.sprite);
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.on('pointertap', () => deps.onSelect?.(this.model));
    this.cullHalfWidth = Math.max(128, this.sprite.width * 0.55);
    this.cullHalfHeight = Math.max(128, this.sprite.height * 0.65);
    this.updateDepth(offset.y);
  }
}
