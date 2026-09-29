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
    const nextState = this.model.state || 'IDLE';
    const nextDirection = this.model.direction || 'SE';
    const stateChanged = oldState !== nextState || oldDirection !== nextDirection;
    // Replay only when the server changes the presentation state/direction. A
    // finished EAT clip must stay finished while the server keeps the chicken
    // in EAT until its product timer elapses; restarting on every unrelated
    // mutation would emit FEED_CONSUMED repeatedly.
    if (stateChanged) {
      this.player.setState(nextState, nextDirection, {
        preservePhase: stateChanged && oldState === nextState,
      });
    }
  }

  update(deltaMs) {
    if (this.model.productReadyAt && this.model.state !== 'PRODUCT_READY') {
      const timestamp = this.model.productReadyAt instanceof Date
        ? this.model.productReadyAt.getTime()
        : typeof this.model.productReadyAt === 'number'
          ? this.model.productReadyAt
          : Date.parse(this.model.productReadyAt);
      if (Number.isFinite(timestamp) && timestamp <= Date.now()) {
        this.model.state = 'PRODUCT_READY';
        this.player.setState('PRODUCT_READY', this.model.direction || 'SE', { preservePhase: false });
      }
    }
    this.player.update(deltaMs);
  }
}
