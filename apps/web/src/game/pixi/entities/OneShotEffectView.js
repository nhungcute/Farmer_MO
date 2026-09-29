import { Container } from 'pixi.js';
import { PixiAnimationPlayer } from '../PixiAnimationPlayer.js';

export class OneShotEffectView {
  constructor({ assetRegistry, animationRegistry, animationId, worldX, worldY, onDone } = {}) {
    this.container = new Container();
    this.container.position.set(worldX, worldY);
    this.player = new PixiAnimationPlayer({ assetRegistry, animationRegistry, animationId, state: 'DEFAULT', direction: 'NONE' });
    this.container.addChild(this.player.sprite);
    this.onDone = onDone || null;
    this.done = !this.player.valid;
    this.doneNotified = false;
  }

  update(deltaMs) {
    if (this.done) {
      this.#notifyDone();
      return false;
    }
    this.player.update(deltaMs);
    if (this.player.finished) {
      this.done = true;
      this.#notifyDone();
      return false;
    }
    return true;
  }

  #notifyDone() {
    if (this.doneNotified) return;
    this.doneNotified = true;
    this.onDone?.(this);
  }

  destroy() { this.container.destroy({ children: true }); }
}
