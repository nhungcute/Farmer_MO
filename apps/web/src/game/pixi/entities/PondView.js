import { Sprite } from 'pixi.js';
import { EntityView } from './EntityView.js';
import { PixiAnimationPlayer } from '../PixiAnimationPlayer.js';

export class PondView extends EntityView {
  constructor(model, deps) {
    super(model, deps);
    this.deps = deps;
    const assetId = model.assetId || 'pond_small_lv1_base';
    this.base = new Sprite(deps.assetRegistry.texture(assetId));
    const scale = deps.assetRegistry.sourceScale(assetId);
    const anchor = deps.assetRegistry.anchor(assetId, { x: 0.5, y: 0.86 });
    this.base.anchor.set(anchor.x, anchor.y);
    this.base.scale.set(1 / scale);
    this.container.addChild(this.base);

    this.water = this.#makeLayer('pond_water', 0.13, 0.92);
    this.ripple = this.#makeLayer('pond_ripple', 0.47, 0.72);
    this.sparkle = this.#makeLayer('pond_sparkle', 0.71, 0.75);
    this.container.addChild(this.water.sprite, this.ripple.sprite, this.sparkle.sprite);

    this.cullHalfWidth = Math.max(180, this.base.width * 0.55);
    this.cullHalfHeight = Math.max(150, this.base.height * 0.6);
    this.updateDepth(8);
  }

  #makeLayer(animationId, phase, alpha) {
    const player = new PixiAnimationPlayer({
      assetRegistry: this.deps.assetRegistry,
      animationRegistry: this.deps.animationRegistry,
      animationId,
      state: 'DEFAULT', direction: 'NONE', phase,
    });
    player.sprite.alpha = alpha;
    return player;
  }

  update(deltaMs) {
    this.water.update(deltaMs);
    this.ripple.update(deltaMs);
    this.sparkle.update(deltaMs);
  }
}
