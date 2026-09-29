import { Sprite, Texture } from 'pixi.js';
import { AnimationTimeline } from '../core/ManifestAnimationRegistry.js';

export class PixiAnimationPlayer {
  constructor({ assetRegistry, animationRegistry, animationId, state = 'DEFAULT', direction, onEvent, phase = 0 } = {}) {
    this.assetRegistry = assetRegistry;
    this.animationRegistry = animationRegistry;
    this.animationId = animationId;
    this.state = state;
    this.direction = direction;
    this.onEvent = onEvent || null;
    this.sprite = new Sprite();
    this.sprite.roundPixels = false;
    this.timeline = new AnimationTimeline({ onEvent: (event) => this.#emit(event) });
    this.clip = null;
    this.valid = false;
    this.phase = phase;
    this.setState(state, direction, { phase });
  }

  #emit(event) {
    this.onEvent?.({ ...event, player: this, animationId: this.animationId });
  }

  setState(state = this.state, direction = this.direction, { preservePhase = false, phase = this.phase, restart = false } = {}) {
    const resolved = this.animationRegistry.resolve(this.animationId, state, direction);
    if (!resolved) {
      this.valid = false;
      // Do not leave the previous state's last frame running when a malformed
      // or unavailable state arrives. Clear the timeline and show Pixi's empty
      // texture; a later valid state can still initialize the player normally.
      this.clip = null;
      this.timeline.setClip(null);
      this.sprite.texture = Texture.EMPTY;
      return false;
    }

    const same = this.clip && this.clip.state === resolved.state && this.clip.direction === resolved.direction && this.clip.flipX === resolved.flipX;
    this.state = resolved.state;
    // Keep the resolved direction so callers can inspect which manifest clip was
    // used after an unsupported direction falls back to the canonical default.
    this.direction = resolved.direction;
    this.clip = resolved;
    this.valid = true;

    if (!same || restart) {
      this.timeline.setClip(resolved, { preservePhase, phase });
      this.#applyClipLayout();
      this.#applyCurrentFrame();
    }
    return true;
  }

  #applyClipLayout() {
    if (!this.clip) return;
    const sourceScale = Math.max(0.001, this.clip.sourceScale || 1);
    const directionScale = this.clip.flipX ? -1 : 1;
    this.sprite.scale.set(directionScale / sourceScale, 1 / sourceScale);
    const anchor = this.clip.anchor || { x: 0.5, y: 0.5 };
    this.sprite.anchor.set(this.clip.flipX ? 1 - anchor.x : anchor.x, anchor.y);
  }

  #applyCurrentFrame() {
    const frame = this.timeline.currentFrame();
    if (!frame) return;
    this.sprite.texture = this.assetRegistry.texture(frame.id);
  }

  update(deltaMs) {
    const before = this.timeline.frameIndex;
    this.timeline.update(deltaMs);
    if (before !== this.timeline.frameIndex) this.#applyCurrentFrame();
    return !this.timeline.finished;
  }

  play() { this.timeline.paused = false; }
  pause() { this.timeline.paused = true; }

  get finished() { return this.timeline.finished; }
  get frameIndex() { return this.timeline.frameIndex; }
}
