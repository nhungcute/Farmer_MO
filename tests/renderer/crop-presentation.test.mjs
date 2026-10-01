import assert from 'node:assert/strict';
import test from 'node:test';
import { cropPresentationAt } from '../../apps/web/src/game/core/cropPresentation.js';
import { adaptFarmToRenderWorld } from '../../apps/web/src/game/core/WorldAdapter.js';
import { mapBootstrapToWorld } from '../../apps/web/src/game/integration/mapBootstrapToWorld.js';
import { CropView } from '../../apps/web/src/game/pixi/entities/CropView.js';
import { Texture } from 'pixi.js';

test('crop art advances at each growth boundary and becomes ready only at the deadline', () => {
  const crop = Object.freeze({ cropId: 'rice', plantedAt: 1000, readyAt: 101000, stage: 'growing' });
  for (const [now, stage] of [[1000, 'seed'], [12999, 'seed'], [13000, 'stage_1'], [40999, 'stage_1'], [41000, 'stage_2'], [70999, 'stage_2'], [71000, 'stage_3'], [100999, 'stage_3'], [101000, 'ready']]) {
    assert.deepEqual(cropPresentationAt(crop, now), { stage, ready: stage === 'ready', assetId: `crop_rice_${stage}` });
  }
  assert.equal(crop.stage, 'growing', 'presentation must not mutate authoritative input');
});

test('date objects and ISO timestamps use the same growth progress as milliseconds', () => {
  const start = Date.parse('2026-10-01T00:00:00Z');
  const end = start + 120000;
  for (const [plantedAt, readyAt] of [[start, end], [new Date(start), new Date(end)], [new Date(start).toISOString(), new Date(end).toISOString()]]) {
    assert.equal(cropPresentationAt({ cropId: 'corn', plantedAt, readyAt }, start + 60000).stage, 'stage_2');
  }
});

test('old saves without planting time keep their known stage until the crop is ready', () => {
  const crop = { cropId: 'carrot', stage: 'stage_2', readyAt: 100000 };
  assert.equal(cropPresentationAt(crop, 20000).assetId, 'crop_carrot_stage_2');
  assert.equal(cropPresentationAt(crop, 100000).ready, true);
  assert.equal(cropPresentationAt({ cropId: 'rice', stage: 'growing', plantedAt: 'invalid', readyAt: 'invalid' }, 20000).stage, 'stage_1');
});

test('empty plots cannot regrow from stale timestamps and future planting times remain seeds', () => {
  assert.deepEqual(cropPresentationAt({ cropId: null, readyAt: 1, plantedAt: 0 }, 100000), { stage: 'empty', ready: false, assetId: null });
  assert.equal(cropPresentationAt({ cropId: 'tomato', plantedAt: 50000, readyAt: 100000 }, 1000).stage, 'seed');
});

test('farm adaptation retains planting time and resumes the correct stage after reload', () => {
  const now = Date.now();
  const farm = { plots: [{ id: 'crop-1', x: 8, y: 10, cropId: 'rice', plantedAt: now - 60000, readyAt: now + 60000, stage: 'growing' }] };
  const world = adaptFarmToRenderWorld(farm);
  assert.equal(world.crops[0].plantedAt, farm.plots[0].plantedAt);
  assert.equal(world.crops[0].assetId, 'crop_rice_stage_2');
  assert.equal(farm.plots[0].stage, 'growing');
});

test('canonical API bootstrap retains the planting timestamp for intermediate crop stages', () => {
  const now = Date.now();
  const plantedAt = new Date(now - 60000).toISOString();
  const world = mapBootstrapToWorld({
    farm: {}, objects: [], animals: [],
    plots: [{ id: 'plot-1', gridX: 8, gridY: 10 }],
    crops: [{ plotId: 'plot-1', cropId: 'rice', plantedAt, readyAt: new Date(now + 60000).toISOString() }],
  });
  assert.equal(world.crops[0].plantedAt, plantedAt);
  assert.equal(world.crops[0].assetId, 'crop_rice_stage_2');
});

test('a running crop view changes growth sprites without waiting for an API synchronization', (t) => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  const requestedAssets = [];
  const source = { id: 'plot-1', kind: 'crop', cropId: 'rice', gridX: 8, gridY: 10, plantedAt: 1000, readyAt: 101000, assetId: 'crop_rice_seed', stage: 'seed', ready: false };
  const crop = new CropView(source, {
    assetRegistry: {
      has: () => true, sourceScale: () => 1, anchor: () => ({ x: 0.5, y: 0.9 }),
      texture: (id) => { requestedAssets.push(id); return Texture.EMPTY; },
    },
    animationRegistry: { resolve: () => null },
  });
  t.after(() => crop.destroy());
  for (const time of [13000, 41000, 71000, 101000]) { now = time; crop.update(16); }
  assert.deepEqual(requestedAssets, ['crop_rice_seed', 'crop_rice_stage_1', 'crop_rice_stage_2', 'crop_rice_stage_3', 'crop_rice_ready']);
  assert.equal(crop.model.ready, true);
  assert.equal(source.stage, 'seed', 'the original farm model stays untouched');
});
