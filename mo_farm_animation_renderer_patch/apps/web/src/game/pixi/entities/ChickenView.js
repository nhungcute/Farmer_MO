import { Graphics } from 'pixi.js';
import { EntityView } from './EntityView.js';
import { PixiAnimationPlayer } from '../PixiAnimationPlayer.js';

export class ChickenView extends EntityView {
  constructor(model, deps) {
    super(model, deps);
    this.deps = deps;
    this.shadow = new Graphics().ellipse(0, -2, 34, 13).fill({ color: 0x19351f, alpha: 0.22 });
    this.container.addChild(this.shadow);
    this.player = new PixiAnimationPlayer({
      assetRegistry: deps.assetRegistry,
      animationRegistry: deps.animationRegistry,
      animationId: model.animationId || 'animal_chicken',
      state: model.state || 'IDLE',
      direction: model.direction || 'SE',
      phase: model.phase || 0,
      onEvent: (event) => deps.onAnimationEvent?.({ ...event, entity: this.model }),
    });
    this.container.addChild(this.player.sprite);
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.on('pointertap', () => deps.onSelect?.(this.model));
    this.cullHalfWidth = 86;
    this.cullHalfHeight = 110;
  }

  sync(model) {
    const oldState = this.model.state;
    const oldDirection = this.model.direction;
    super.sync(model);
    if (oldState !== this.model.state || oldDirection !== this.model.direction) {
      this.player.setState(this.model.state || 'IDLE', this.model.direction || 'SE', { preservePhase: oldState === this.model.state });
    }
  }

  update(deltaMs) {
    this.player.update(deltaMs);
  }
}
