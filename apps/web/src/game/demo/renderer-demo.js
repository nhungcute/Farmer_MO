import { PixiFarmRenderer } from '../pixi/PixiFarmRenderer.js';
import { createRendererDemoWorld } from '../core/WorldAdapter.js';

const host = document.querySelector('#renderer-host');
const countSelect = document.querySelector('#chicken-count');
const stateSelect = document.querySelector('#chicken-state');
const debugToggle = document.querySelector('#debug-toggle');
const eventLog = document.querySelector('#event-log');
const statsLabel = document.querySelector('#demo-status');

const renderer = new PixiFarmRenderer({
  host,
  assetBase: './public/assets',
  debug: true,
  quality: 'HIGH',
});

await renderer.init();
let world = createRendererDemoWorld({ chickenCount: Number(countSelect.value) });
renderer.setWorld(world);
renderer.focusGrid(11, 10, 0.9);

renderer.on('cellSelected', (cell) => {
  statsLabel.textContent = `Ô đang chọn: ${cell.x}, ${cell.y}`;
});
renderer.on('objectSelected', (model) => {
  statsLabel.textContent = `Đối tượng: ${model.id} (${model.kind})`;
});
renderer.on('animationEvent', (event) => {
  const row = document.createElement('div');
  row.textContent = `${new Date().toLocaleTimeString('vi-VN')} · ${event.entity?.id || 'entity'} · ${event.name}`;
  eventLog.prepend(row);
  while (eventLog.children.length > 8) eventLog.lastElementChild.remove();
});

function rebuildWorld() {
  world = createRendererDemoWorld({ chickenCount: Number(countSelect.value) });
  const forcedState = stateSelect.value;
  if (forcedState !== 'AUTO') world.animals.forEach((animal) => { animal.state = forcedState; });
  renderer.setWorld(world, { fit: false });
}

countSelect.addEventListener('change', rebuildWorld);
stateSelect.addEventListener('change', rebuildWorld);
debugToggle.addEventListener('change', () => renderer.setDebug(debugToggle.checked));

document.querySelector('#effect-harvest').addEventListener('click', () => renderer.playEffectAtGrid('fx_harvest', 10, 14));
document.querySelector('#effect-build').addEventListener('click', () => renderer.playEffectAtGrid('fx_build_success', 5, 16));
document.querySelector('#focus-farm').addEventListener('click', () => renderer.focusGrid(10, 10, 0.95));
document.querySelector('#feed-event').addEventListener('click', () => {
  const animal = world.animals[0];
  if (!animal) return;
  animal.state = 'EAT';
  renderer.updateEntity({ ...animal, state: 'EAT' });
});

// Demo-only local movement. Renderer receives model updates; it does not own gameplay simulation.
let directionSign = 1;
setInterval(() => {
  const walking = world.animals.filter((animal, index) => index % 5 === 1 || stateSelect.value === 'WALK');
  for (const animal of walking) {
    animal.gridX += 0.08 * directionSign;
    animal.gridY += 0.035 * directionSign;
    animal.state = 'WALK';
    animal.direction = directionSign > 0 ? 'SE' : 'NW';
    renderer.updateEntity(animal);
  }
  const first = walking[0];
  if (first && (first.gridX > 20 || first.gridX < 14)) directionSign *= -1;
}, 180);

globalThis.moFarmRendererDemo = renderer;
