import assert from 'node:assert/strict';
import test from 'node:test';

import { Texture } from 'pixi.js';
import { AnimationTimeline } from '../../apps/web/src/game/core/ManifestAnimationRegistry.js';
import { adaptFarmToRenderWorld } from '../../apps/web/src/game/core/WorldAdapter.js';
import { CropView } from '../../apps/web/src/game/pixi/entities/CropView.js';
import { ChickenView } from '../../apps/web/src/game/pixi/entities/ChickenView.js';
import { OneShotEffectView } from '../../apps/web/src/game/pixi/entities/OneShotEffectView.js';
import { PixiAnimationPlayer } from '../../apps/web/src/game/pixi/PixiAnimationPlayer.js';

const clip = (animationId, { loop = false } = {}) => ({
  animationId,
  state: 'DEFAULT',
  direction: 'NONE',
  flipX: false,
  sourceScale: 1,
  anchor: { x: 0.5, y: 0.5 },
  loop,
  holdLast: !loop,
  frames: [{ id: `${animationId}-0`, durationMs: 100 }, { id: `${animationId}-1`, durationMs: 100 }],
  events: [],
});

function fakeRegistry({ valid = true } = {}) {
  return {
    texture: () => Texture.EMPTY,
    has: () => true,
    sourceScale: () => 1,
    anchor: () => ({ x: 0.5, y: 0.5 }),
    resolve: valid ? (animationId) => clip(animationId) : () => null,
  };
}

test('PixiAnimationPlayer can explicitly restart a finished non-looping clip', () => {
  const player = new PixiAnimationPlayer({
    assetRegistry: fakeRegistry(),
    animationRegistry: fakeRegistry(),
    animationId: 'chicken',
  });

  player.update(250);
  assert.equal(player.finished, true);
  player.setState('DEFAULT', 'NONE', { restart: true });
  assert.equal(player.finished, false);
  assert.equal(player.frameIndex, 0);
});

test('PixiAnimationPlayer clears a stale frame when a state is unavailable', () => {
  const player = new PixiAnimationPlayer({
    assetRegistry: fakeRegistry(),
    animationRegistry: {
      resolve: (animationId, state) => state === 'BROKEN' ? null : clip(animationId),
    },
    animationId: 'chicken',
  });

  player.update(50);
  assert.equal(player.setState('BROKEN', 'NONE'), false);
  assert.equal(player.valid, false);
  assert.equal(player.timeline.currentFrame(), null);
  assert.equal(player.sprite.texture, Texture.EMPTY);
});

test('ChickenView does not replay a finished feed clip on an unchanged server state', () => {
  const view = new ChickenView({ id: 'chicken-1', kind: 'chicken', state: 'EAT', direction: 'SE' }, {
    assetRegistry: fakeRegistry(),
    animationRegistry: fakeRegistry(),
  });

  view.update(250);
  assert.equal(view.player.finished, true);
  assert.equal(view.player.frameIndex, 1);
  view.sync({ state: 'EAT', direction: 'SE' });
  assert.equal(view.player.finished, true);
  assert.equal(view.player.frameIndex, 1);
  view.destroy();
});

test('OneShotEffectView immediately retires an unknown effect animation', () => {
  let done = 0;
  const effect = new OneShotEffectView({
    assetRegistry: fakeRegistry(),
    animationRegistry: fakeRegistry({ valid: false }),
    animationId: 'missing',
    onDone: () => { done += 1; },
  });

  assert.equal(effect.update(16), false);
  assert.equal(done, 1, 'invalid effects notify the scene so it can remove the effect');
  effect.destroy();
});

test('CropView removes a destroyed ready glow before it can be recreated', () => {
  const crop = new CropView({
    id: 'plot-1', kind: 'crop', cropId: 'rice', assetId: 'crop_rice_ready',
    stage: 'ready', gridX: 1, gridY: 1, ready: true,
  }, {
    assetRegistry: fakeRegistry(),
    animationRegistry: fakeRegistry(),
  });

  crop.sync({ ready: false, stage: 'growing', assetId: 'crop_rice_stage_1' });
  assert.equal(crop.glow, null);
  crop.sync({ ready: true, stage: 'ready', assetId: 'crop_rice_ready' });
  assert.ok(crop.glow);
  crop.destroy();
});

test('AnimationTimeline does not emit an invalid event frame', () => {
  const events = [];
  const timeline = new AnimationTimeline({ onEvent: (event) => events.push(event) });
  timeline.setClip({
    animationId: 'test', state: 'DEFAULT', direction: 'NONE', loop: false,
    frames: [{ id: 'frame', durationMs: 50 }],
    events: [{ frame: 9, name: 'INVALID' }],
  });
  timeline.update(100);
  assert.deepEqual(events, []);
});

test('WorldAdapter derives product-ready presentation without changing economy data', () => {
  const productReadyAt = new Date(Date.now() - 1).toISOString();
  const source = { chickens: [{ id: 'chicken-1', x: 2, y: 3, state: 'EAT', productReadyAt }] };
  const world = adaptFarmToRenderWorld(source);
  assert.equal(world.animals[0].state, 'PRODUCT_READY');
  assert.equal(world.animals[0].productReadyAt, productReadyAt);
  assert.equal(source.chickens[0].state, 'EAT');
});
