import { Container } from 'pixi.js';
import { PixiAnimationPlayer } from '../PixiAnimationPlayer.js';

export class OneShotEffectView {
  constructor({ assetRegistry, animationRegistry, animationId, worldX, worldY, onDone } = {}) {
    this.container = new Container();
    this.container.position.set(worldX, worldY);
    this.player = new PixiAnimationPlayer({ assetRegistry, animationRegistry, animationId, state: 'DEFAULT', direction: 'NONE' });
    this.container.addChild(this.player.sprite);
    this.onDone = onDone || null;
  }

  update(deltaMs) {
    this.player.update(deltaMs);
    if (this.player.finished) {
      this.onDone?.(this);
      return false;
    }
    return true;
  }

  destroy() { this.container.destroy({ children: true }); }
}
