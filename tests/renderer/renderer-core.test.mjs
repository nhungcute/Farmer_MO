import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { CameraModel } from '../../apps/web/src/game/core/CameraModel.js';
import { AnimationTimeline, ManifestAnimationRegistry } from '../../apps/web/src/game/core/ManifestAnimationRegistry.js';
import { adaptFarmToRenderWorld } from '../../apps/web/src/game/core/WorldAdapter.js';
import { mapBootstrapToWorld } from '../../apps/web/src/game/integration/mapBootstrapToWorld.js';
import { isoToWorld, worldToIso } from '../../apps/web/src/game/core/iso.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'apps/web/public/assets/manifests/animation-manifest.json'), 'utf8'));

test('isometric conversion round-trips fractional grid coordinates', () => {
  for (const [x, y] of [[0, 0], [5, 9], [12.5, 4.25], [23, 23]]) {
    const world = isoToWorld(x, y);
    const grid = worldToIso(world.x, world.y);
    assert.ok(Math.abs(grid.x - x) < 1e-9);
    assert.ok(Math.abs(grid.y - y) < 1e-9);
  }
});

test('canonical chicken manifest resolves every MVP state and direction', () => {
  const registry = new ManifestAnimationRegistry(manifest);
  const states = ['IDLE', 'WALK', 'EAT', 'HAPPY', 'SLEEP', 'PRODUCT_READY'];
  const directions = ['NE', 'SE', 'SW', 'NW'];
  for (const state of states) {
    for (const direction of directions) {
      const clip = registry.resolve('animal_chicken', state, direction);
      assert.ok(clip, `${state}/${direction} must resolve`);
      assert.equal(clip.requestedDirection, direction);
      assert.ok(clip.frames.length >= manifest.contracts.minFrames[state]);
      for (const frame of clip.frames) assert.ok(manifest.assets[frame.id], `${frame.id} must exist in assets`);
    }
  }
});

test('animation registry reports the DEFAULT state when an unknown state falls back', () => {
  const registry = new ManifestAnimationRegistry({
    animations: {
      test: {
        defaultDirection: 'NONE',
        animations: {
          DEFAULT: { NONE: { frames: ['frame-default'], loop: true } },
        },
      },
    },
  });
  const resolved = registry.resolve('test', 'MISSING', 'NONE');
  assert.equal(resolved.state, 'DEFAULT');
  assert.equal(resolved.frames[0].id, 'frame-default');
});

test('EAT timeline emits FEED_CONSUMED on canonical frame boundary', () => {
  const registry = new ManifestAnimationRegistry(manifest);
  const clip = registry.resolve('animal_chicken', 'EAT', 'SE');
  const events = [];
  const timeline = new AnimationTimeline({ onEvent: (event) => events.push(event) });
  timeline.setClip(clip);
  const frameMs = 1000 / clip.fps;
  timeline.update(frameMs * 3.1);
  assert.ok(events.some((event) => event.name === 'FEED_CONSUMED'));
  assert.equal(timeline.finished, false);
});

test('per-frame duration overrides are respected', () => {
  const clip = {
    animationId: 'test', state: 'IDLE', direction: 'NONE', loop: true, events: [],
    frames: [
      { id: 'a', durationMs: 600 },
      { id: 'b', durationMs: 100 },
      { id: 'c', durationMs: 100 },
      { id: 'd', durationMs: 200 },
    ],
  };
  const timeline = new AnimationTimeline();
  timeline.setClip(clip);
  timeline.update(550);
  assert.equal(timeline.currentFrame().id, 'a');
  timeline.update(100);
  assert.equal(timeline.currentFrame().id, 'b');
  timeline.update(100);
  assert.equal(timeline.currentFrame().id, 'c');
});

test('camera zoomAtScreen keeps world point stable beneath cursor', () => {
  const camera = new CameraModel({ viewportWidth: 1000, viewportHeight: 600, minZoom: 0.5, maxZoom: 2, zoom: 1 });
  camera.focus(300, 200, 1);
  const screen = { x: 750, y: 350 };
  const before = camera.screenToWorld(screen.x, screen.y);
  camera.zoomAtScreen(screen.x, screen.y, 1.5);
  const after = camera.screenToWorld(screen.x, screen.y);
  assert.ok(Math.abs(before.x - after.x) < 1e-9);
  assert.ok(Math.abs(before.y - after.y) < 1e-9);
});

test('farm adapter does not expose API/database concerns to renderer model', () => {
  const farm = {
    buildings: [
      { id: 'house', buildingId: 'farmhouse_lv1', x: 8, y: 4, footprint: [3, 3] },
      { id: 'pond', buildingId: 'pond_small_lv1', x: 5, y: 14, footprint: [2, 2] },
    ],
    plots: [{ id: 'plot', x: 10, y: 10, cropId: 'rice', stage: 'ready' }],
    chickens: [{ id: 'chicken', x: 16, y: 9, state: 'EAT', direction: 'SW' }],
    coins: 999,
    inventory: { rice: 4 },
  };
  const world = adaptFarmToRenderWorld(farm);
  assert.equal(world.buildings[0].assetId, 'building_farmhouse_lv1');
  assert.equal(world.buildings[1].kind, 'pond');
  assert.equal(world.crops[0].assetId, 'crop_rice_ready');
  assert.equal(world.animals[0].state, 'EAT');
  assert.equal('coins' in world, false);
  assert.equal('inventory' in world, false);
});

test('farm adapter derives ready crop and chicken presentation state from server timestamps', () => {
  const world = adaptFarmToRenderWorld({
    plots: [{ id: 'plot-ready', x: 1, y: 1, cropId: 'rice', stage: 'growing', readyAt: '2000-01-01T00:00:00.000Z' }],
    chickens: [{ id: 'chicken-ready', x: 2, y: 2, state: 'EAT', productReadyAt: '2000-01-01T00:00:00.000Z' }],
  });
  assert.equal(world.crops[0].stage, 'ready');
  assert.equal(world.crops[0].assetId, 'crop_rice_ready');
  assert.equal(world.animals[0].state, 'PRODUCT_READY');
});

test('bootstrap mapper isolates canonical API DTO from renderer model', () => {
  const world = mapBootstrapToWorld({
    farm: { id: 'farm-1' },
    objects: [{ id: 'coop-1', definitionId: 'chicken_coop_lv1', gridX: 4, gridY: 5 }],
    plots: [{ id: 'plot-1', gridX: 8, gridY: 9 }],
    crops: [{ plotId: 'plot-1', cropId: 'rice', readyAt: '2000-01-01T00:00:00.000Z' }],
    animals: [{ id: 'chicken-1', buildingId: 'coop-1', state: 'PRODUCT_READY' }],
  });

  assert.equal(world.width, 24);
  assert.equal(world.buildings[0].assetId, 'building_chicken_coop_lv1');
  assert.equal(world.crops[0].ready, true);
  assert.equal(world.animals[0].gridX, 5);
  assert.equal('coins' in world, false);
});
