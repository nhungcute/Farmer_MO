import assert from 'node:assert/strict';
import test from 'node:test';
import { CameraModel } from '../../apps/web/src/game/core/CameraModel.js';
import { InputController } from '../../apps/web/src/game/pixi/systems/InputController.js';

class TestCanvas extends EventTarget {
  style = {};
  captures = new Set();
  getBoundingClientRect() { return { left: 24, top: 36, width: 800, height: 600 }; }
  setPointerCapture(id) { this.captures.add(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  pointer(type, id, x, y, extras = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: id, clientX: x + 24, clientY: y + 36, button: 0, ...extras });
    this.dispatchEvent(event);
  }
}

function setup(t) {
  const canvas = new TestCanvas();
  const model = new CameraModel({ viewportWidth: 800, viewportHeight: 600, minZoom: 0.25, maxZoom: 2 });
  const camera = {
    model,
    panByScreen: (x, y) => model.panByScreen(x, y),
    zoomAt: (x, y, zoom) => model.zoomAtScreen(x, y, zoom),
  };
  const taps = [];
  const input = new InputController({ canvas, camera, onTap: (x, y) => taps.push({ x, y }) });
  t.after(() => input.destroy());
  return { canvas, model, input, taps };
}

test('a slightly moving tap dispatches once in canvas coordinates without panning', (t) => {
  const { canvas, model, taps } = setup(t);
  canvas.pointer('pointerdown', 1, 300, 200);
  canvas.pointer('pointermove', 1, 303, 203);
  canvas.pointer('pointerup', 1, 303, 203);
  canvas.pointer('pointerup', 1, 303, 203);
  assert.deepEqual(taps, [{ x: 303, y: 203 }]);
  assert.deepEqual({ x: model.x, y: model.y }, { x: 0, y: 0 });
});

test('dragging the map pans the camera and never dispatches a farm tap', (t) => {
  const { canvas, model, taps } = setup(t);
  canvas.pointer('pointerdown', 1, 300, 200);
  canvas.pointer('pointermove', 1, 355, 218);
  canvas.pointer('pointermove', 1, 380, 220);
  canvas.pointer('pointerup', 1, 380, 220);
  assert.deepEqual(taps, []);
  assert.ok(model.x < 0 && model.y < 0, 'the gesture must still move the world');
});

for (const cancelEvent of ['pointercancel', 'lostpointercapture']) {
  test(`${cancelEvent} cannot activate a plot and leaves the next tap usable`, (t) => {
    const { canvas, taps } = setup(t);
    canvas.pointer('pointerdown', 1, 300, 200);
    canvas.pointer(cancelEvent, 1, 300, 200);
    canvas.pointer('pointerup', 1, 300, 200);
    assert.deepEqual(taps, []);
    canvas.pointer('pointerdown', 2, 400, 250);
    canvas.pointer('pointerup', 2, 400, 250);
    assert.deepEqual(taps, [{ x: 400, y: 250 }]);
  });
}

test('lifting fingers after pinch zoom never turns the final finger into a tap', (t) => {
  const { canvas, model, taps } = setup(t);
  canvas.pointer('pointerdown', 1, 200, 200, { pointerType: 'touch' });
  canvas.pointer('pointerdown', 2, 400, 200, { pointerType: 'touch' });
  canvas.pointer('pointermove', 2, 500, 200, { pointerType: 'touch' });
  canvas.pointer('pointerup', 2, 500, 200, { pointerType: 'touch' });
  canvas.pointer('pointerup', 1, 200, 200, { pointerType: 'touch' });
  assert.ok(model.zoom > 1, 'pinch must zoom the camera');
  assert.deepEqual(taps, []);
});

test('two stationary fingers and an unreported long movement cannot activate cells', (t) => {
  const { canvas, taps } = setup(t);
  canvas.pointer('pointerdown', 1, 200, 200);
  canvas.pointer('pointerdown', 2, 400, 200);
  canvas.pointer('pointerup', 1, 200, 200);
  canvas.pointer('pointerup', 2, 400, 200);
  canvas.pointer('pointerdown', 3, 300, 200);
  canvas.pointer('pointerup', 3, 500, 200);
  assert.deepEqual(taps, []);
});

test('releasing outside the canvas and right clicking never dispatch farm taps', (t) => {
  const { canvas, taps } = setup(t);
  canvas.pointer('pointerdown', 1, 799, 200);
  canvas.pointer('pointerup', 1, 802, 200);
  canvas.pointer('pointerdown', 2, 300, 200, { button: 2 });
  canvas.pointer('pointerup', 2, 300, 200, { button: 2 });
  assert.deepEqual(taps, []);
});
