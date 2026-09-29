import { Container, Sprite } from 'pixi.js';
import { EntityView } from './EntityView.js';
import { PixiAnimationPlayer } from '../PixiAnimationPlayer.js';

export class CropView extends EntityView {
  constructor(model, deps) {
    super(model, deps);
    this.deps = deps;
    this.visual = new Container();
    this.container.addChild(this.visual);
    this.cropSprite = new Sprite();
    this.visual.addChild(this.cropSprite);
    this.glow = null;
    this.#applyAsset(model.assetId);
    this.#syncGlow(Boolean(model.ready));
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.on('pointertap', () => deps.onSelect?.(this.model));
    this.cullHalfWidth = 96;
    this.cullHalfHeight = 128;
  }

  #applyAsset(assetId) {
    if (!assetId || !this.deps.assetRegistry.has(assetId)) {
      this.cropSprite.visible = false;
      return;
    }
    this.cropSprite.visible = true;
    this.cropSprite.texture = this.deps.assetRegistry.texture(assetId);
    const sourceScale = this.deps.assetRegistry.sourceScale(assetId);
    const anchor = this.deps.assetRegistry.anchor(assetId, { x: 0.5, y: 0.9 });
    this.cropSprite.anchor.set(anchor.x, anchor.y);
    this.cropSprite.scale.set(1 / sourceScale);
  }

  #syncGlow(ready) {
    if (ready && !this.glow) {
      this.glow = new PixiAnimationPlayer({
        assetRegistry: this.deps.assetRegistry,
        animationRegistry: this.deps.animationRegistry,
        animationId: 'crop_ready_glow',
        state: 'DEFAULT',
        direction: 'NONE',
        phase: Math.random(),
      });
      this.glow.sprite.alpha = 0.6;
      this.glow.sprite.zIndex = -1;
      this.visual.addChildAt(this.glow.sprite, 0);
    } else if (!ready && this.glow) {
      this.glow.sprite.destroy();
      this.glow = null;
    }
  }

  sync(model) {
    const oldAsset = this.model.assetId;
    const oldReady = this.model.ready;
    super.sync(model);
    if (oldAsset !== this.model.assetId) this.#applyAsset(this.model.assetId);
    if (oldReady !== this.model.ready) this.#syncGlow(Boolean(this.model.ready));
  }

  update(deltaMs) {
    this.glow?.update(deltaMs);
  }
}
