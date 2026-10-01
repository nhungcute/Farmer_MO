import { Container, Graphics, Sprite } from 'pixi.js';
import { EntityView } from './EntityView.js';
import { PixiAnimationPlayer } from '../PixiAnimationPlayer.js';
import { cropPresentationAt } from '../../core/cropPresentation.js';

export class CropView extends EntityView {
  constructor(model, deps) {
    super(model, deps);
    this.deps = deps;
    const bed = new Graphics();
    bed.poly([-78, 5, 0, -34, 78, 5, 0, 45]).fill(0x739d3d);
    bed.poly([-73, 0, 0, -36, 73, 0, 0, 37]).fill(0xbd9459).stroke({ color: 0xe0c181, width: 3 });
    bed.poly([-64, 0, 0, -31, 64, 0, 0, 31]).fill(0x946438);
    for (let row = -2; row <= 2; row += 1) {
      const y = row * 9;
      const width = 54 - Math.abs(row) * 15;
      bed.moveTo(-width, y + 2).lineTo(width, y - 2).stroke({ color: 0x6e4c2d, width: 3, alpha: 0.65, cap: 'round' });
      bed.moveTo(-width + 3, y + 5).lineTo(width - 3, y + 1).stroke({ color: 0xc49554, width: 2, alpha: 0.6, cap: 'round' });
    }
    this.container.addChild(bed);
    this.visual = new Container();
    this.container.addChild(this.visual);
    this.cropSprite = new Sprite();
    this.visual.addChild(this.cropSprite);
    this.glow = null;
    this.swayTime = ((model.gridX || 0) * 0.7 + (model.gridY || 0) * 0.3);
    this.#applyAsset(model.assetId);
    this.#syncGlow(Boolean(model.ready));
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
    this.cropSprite.scale.set(1.18 / sourceScale);
    this.cropSprite.position.y = 13;
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
      // Remove the child before destroying it. Keeping a destroyed Sprite in
      // `visual.children` breaks a later ready -> growing -> ready transition.
      this.visual.removeChild(this.glow.sprite);
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
    // The timestamp is server-owned. This client-side check only updates the
    // visual stage when the crop becomes ready between state synchronizations.
    const presentation = cropPresentationAt(this.model);
    if (presentation.assetId !== this.model.assetId) this.#applyAsset(presentation.assetId);
    if (presentation.ready !== this.model.ready) this.#syncGlow(presentation.ready);
    Object.assign(this.model, presentation);
    this.glow?.update(deltaMs);
    this.swayTime += Math.min(100, Math.max(0, deltaMs)) / 1000;
    this.cropSprite.rotation = this.cropSprite.visible ? Math.sin(this.swayTime * 1.45) * 0.028 : 0;
  }
}
