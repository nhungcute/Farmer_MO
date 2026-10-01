import { Container, FillGradient, Graphics, Sprite } from 'pixi.js';
import { isoToWorld, mapWorldBounds } from '../../core/iso.js';

const GRASS = [0x94ca59, 0x9ed165, 0x8dc34f, 0xa9d970];
const FLOWERS = [0xfffaf0, 0xffdd5f, 0xffb7cb, 0xbca7ed];

// A stable seed keeps the garden still when a server mutation rebuilds terrain.
function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function line(graphics, points, color, width, alpha = 1) {
  graphics.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
  graphics.stroke({ color, width, alpha, cap: 'round', join: 'round' });
}

function streamLine(graphics, points, color, width, alpha = 1) {
  graphics.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    graphics.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }
  graphics.lineTo(points.at(-1).x, points.at(-1).y).stroke({ color, width, alpha, cap: 'round', join: 'round' });
}

function flower(graphics, x, y, color, size = 3) {
  graphics.ellipse(x, y + size, size * 2, size * 0.8).fill({ color: 0x3c8f42, alpha: 0.65 });
  for (let petal = 0; petal < 5; petal += 1) {
    const angle = petal * Math.PI * 0.4;
    graphics.circle(x + Math.cos(angle) * size, y + Math.sin(angle) * size, size * 0.8).fill(color);
  }
  graphics.circle(x, y, size * 0.7).fill(0xf9c63d);
}

function tree(x, y, scale, seed, leafGradient, texture) {
  const group = new Container();
  group.position.set(x, y);
  group.scale.set(scale);
  if (texture) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.54, 0.93);
    sprite.scale.set(215 / texture.width);
    group.addChild(sprite);
    return group;
  }
  const rng = random(seed);
  const art = new Graphics();
  art.ellipse(9, 2, 69, 23).fill({ color: 0x2c6631, alpha: 0.16 });
  art.poly([-15, 0, -11, -79, 11, -81, 19, 1]).fill(0x8f572b);
  art.poly([-9, -3, -7, -78, 0, -85, 4, -5]).fill(0xc68c49);
  line(art, [{ x: 0, y: -36 }, { x: -33, y: -75 }], 0x9d6533, 13);
  line(art, [{ x: 4, y: -45 }, { x: 30, y: -89 }], 0x9d6533, 12);
  const crowns = [[0, -114, 51], [-37, -91, 40], [38, -92, 39], [-16, -137, 35], [24, -130, 37], [1, -76, 38]];
  for (const [cx, cy, radius] of crowns) {
    art.circle(cx + 4, cy + 5, radius).fill(0x327b3f);
    art.circle(cx, cy - 2, radius - 2).fill(leafGradient);
  }
  for (let i = 0; i < 35; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng()) * 58;
    const lx = Math.cos(angle) * radius;
    const ly = -110 + Math.sin(angle) * radius * 0.8;
    art.ellipse(lx, ly, 3 + rng() * 4, 2 + rng() * 2).fill({ color: i % 3 ? 0xb4df60 : 0x226b36, alpha: 0.55 });
  }
  for (let i = 0; i < 7; i += 1) {
    const fx = (rng() - 0.5) * 88;
    const fy = -126 + rng() * 65;
    art.circle(fx + 1, fy + 2, 6.4).fill(0xb24229);
    art.circle(fx, fy, 6).fill(0xf66c39);
    art.circle(fx - 2, fy - 2, 1.8).fill(0xffbb6b);
    art.ellipse(fx + 3, fy - 7, 4.2, 2).fill(0xc1da59);
  }
  group.addChild(art);
  return group;
}

function rock(graphics, x, y, scale = 1) {
  const points = [-14, 0, -19, -16, -9, -29, 8, -32, 20, -20, 17, -1];
  graphics.ellipse(x + 2, y + 1, 23 * scale, 8 * scale).fill({ color: 0x3c7942, alpha: 0.16 });
  graphics.poly(points.map((value, index) => (index % 2 ? y : x) + value * scale)).fill(0x969c87);
  graphics.poly([-19, -16, -9, -29, 8, -32, 6, -13, -8, -7].map((value, index) => (index % 2 ? y : x) + value * scale)).fill(0xd2d1b4);
  graphics.poly([8, -32, 20, -20, 17, -1, 6, -13].map((value, index) => (index % 2 ? y : x) + value * scale)).fill(0xb8bda5);
}

function fence(graphics, a, b) {
  const segments = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 58));
  for (const offset of [17, 35]) {
    line(graphics, [{ x: a.x, y: a.y - offset }, { x: b.x, y: b.y - offset }], 0x885126, 10);
    line(graphics, [{ x: a.x, y: a.y - offset - 2 }, { x: b.x, y: b.y - offset - 2 }], 0xd6a45b, 6);
  }
  for (let i = 0; i <= segments; i += 1) {
    const x = a.x + (b.x - a.x) * i / segments;
    const y = a.y + (b.y - a.y) * i / segments;
    graphics.roundRect(x - 6, y - 48, 13, 51, 2).fill(0x94612c);
    graphics.roundRect(x - 6, y - 48, 8, 48, 2).fill(0xd2a05a);
    graphics.poly([x - 7, y - 48, x, y - 53, x + 8, y - 48, x, y - 44]).fill(0xe7bf79);
  }
}

/** Decoration has no input handlers or gameplay records; server cells remain authoritative. */
export function createFarmLandscape(world, tileWidth, tileHeight, { treeTexture = null } = {}) {
  const landscape = new Container();
  const leafGradient = new FillGradient({
    type: 'radial', center: { x: 0.28, y: 0.22 }, outerCenter: { x: 0.5, y: 0.5 }, outerRadius: 0.7,
    colorStops: [{ offset: 0, color: 0xb3db5b }, { offset: 0.42, color: 0x76b83e }, { offset: 0.76, color: 0x489c42 }, { offset: 1, color: 0x2e743b }],
    textureSize: 64,
  });
  landscape.on('destroyed', () => leafGradient.destroy());
  landscape.eventMode = 'none';
  landscape.label = 'Farm garden';
  const point = (x, y) => isoToWorld(x, y, tileWidth, tileHeight);
  const bounds = mapWorldBounds(world.width, world.height, tileWidth, tileHeight);
  const grass = new Graphics();
  grass.rect(bounds.minX - 900, bounds.minY - 900, bounds.maxX - bounds.minX + 1800, bounds.maxY - bounds.minY + 1800).fill(0x96cd61);
  const rng = random(1907);

  for (let i = 0; i < 480; i += 1) {
    const x = bounds.minX - 400 + rng() * (bounds.maxX - bounds.minX + 800);
    const y = bounds.minY - 300 + rng() * (bounds.maxY - bounds.minY + 600);
    grass.ellipse(x, y, 35 + rng() * 95, 14 + rng() * 36).fill({ color: GRASS[i % GRASS.length], alpha: 0.5 });
  }
  for (let i = 0; i < 1600; i += 1) {
    const p = point(-4 + rng() * (world.width + 8), -4 + rng() * (world.height + 8));
    const size = 2 + rng() * 3;
    grass.ellipse(p.x, p.y, size * 2, size * 0.6).fill({ color: i % 2 ? 0xe4e99a : 0x659f45, alpha: 0.45 });
    if (i % 7 === 0) line(grass, [{ x: p.x - 4, y: p.y }, { x: p.x - 2, y: p.y - 5 }, { x: p.x, y: p.y }, { x: p.x + 3, y: p.y - 7 }], 0x74aa40, 1.6);
  }
  landscape.addChild(grass);

  const water = new Graphics();
  const ripples = new Graphics();
  const stream = [{ x: -285, y: -300 }, { x: -355, y: -50 }, { x: -435, y: 200 }, { x: -520, y: 435 }, { x: -610, y: 650 }, { x: -490, y: 905 }, { x: -230, y: 1110 }, { x: 110, y: 1280 }, { x: 540, y: 1460 }, { x: 1400, y: 1850 }];
  streamLine(water, stream, 0x74b453, 137);
  streamLine(water, stream, 0xd3cb93, 116);
  streamLine(water, stream, 0x308dab, 96);
  streamLine(water, stream, 0x51c7d3, 87);
  streamLine(water, stream.map(p => ({ x: p.x - 14, y: p.y })), 0x98e3d7, 30, 0.45);
  for (let i = 1; i < stream.length; i += 1) {
    const a = stream[i - 1]; const b = stream[i];
    for (let step = 0; step < 8; step += 1) {
      const ratio = (step + 0.35) / 8;
      const x = a.x + (b.x - a.x) * ratio;
      const y = a.y + (b.y - a.y) * ratio;
      line(ripples, [{ x: x - 12, y }, { x: x + 4, y: y + 2 }, { x: x + 13, y: y - 1 }], 0xd0f7e8, 2, 0.7);
      if (step % 3 === 0) {
        water.ellipse(x + 23, y + 17, 11, 5).fill(0x78b850);
        water.ellipse(x + 21, y + 15, 9, 4).fill(0xb5d65c);
      }
    }
  }
  landscape.addChild(water, ripples);
  let waterTime = 0;
  landscape.update = deltaMs => {
    waterTime += Math.min(100, Math.max(0, deltaMs)) / 1000;
    ripples.alpha = 0.7 + Math.sin(waterTime * 1.25) * 0.22;
    ripples.position.set(Math.sin(waterTime * 0.55) * 4, Math.sin(waterTime * 0.75) * 3);
  };

  const banks = new Graphics();
  for (let i = 1; i < stream.length - 1; i += 1) {
    const p = stream[i];
    for (let j = 0; j < 4; j += 1) {
      const side = j % 2 ? 1 : -1;
      rock(banks, p.x + side * (52 + rng() * 20), p.y + (j - 2) * 35, 0.75 + rng() * 0.75);
      flower(banks, p.x + side * (83 + rng() * 25), p.y + j * 15, FLOWERS[j], 3 + rng() * 2);
    }
  }
  landscape.addChild(banks);

  const paths = new Graphics();
  const routes = [[point(5, 7.3), point(17.5, 7.3)], [point(7, 6.8), point(7, 16)], [point(7, 15.2), point(18.5, 15.2)]];
  for (const building of world.buildings || []) {
    if (building.kind !== 'pond') routes.push([point(building.gridX, building.gridY + 0.2), point(building.gridX, 7.3)]);
  }
  // Each coat covers the whole network so intersections have no doubled rims.
  for (const [color, width, alpha] of [[0x81b34d, 66, 0.75], [0xd0b878, 56, 1], [0xead098, 46, 1], [0xf3dcaa, 24, 0.65]]) {
    for (const route of routes) line(paths, route, color, width, alpha);
  }
  for (const route of routes) {
    const a = route[0]; const b = route[1];
    for (let step = 0; step < 18; step += 1) {
      const ratio = rng();
      paths.ellipse(a.x + (b.x - a.x) * ratio + (rng() - 0.5) * 21, a.y + (b.y - a.y) * ratio + (rng() - 0.5) * 19, 2 + rng() * 3, 1.5).fill({ color: 0xac955c, alpha: 0.4 });
    }
  }
  landscape.addChild(paths);

  const border = new Graphics();
  for (const [a, b] of [[[3.5, 2], [18, 2]], [[18, 2], [18, 6]], [[18, 9], [18, 17]], [[8, 17], [18, 17]]]) {
    const start = point(...a); const end = point(...b);
    fence(border, start, end);
    const count = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / 21);
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.3) / count;
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t + 6;
      border.ellipse(x, y, 12, 6).fill(i % 2 ? 0x78b940 : 0x579e44);
      flower(border, x + 3, y - 4, FLOWERS[i % FLOWERS.length], 3.2);
    }
  }
  landscape.addChild(border);

  const occupied = [...(world.buildings || []), ...(world.crops || [])];
  const locations = [[2, 3], [4, 2], [6, 1.3], [10, 1.3], [13, 1.3], [16, 1.7], [18.7, 3], [19.4, 6.5], [18.9, 10], [19.5, 13], [18.7, 17.8], [15, 18.7], [11, 18.4], [7.5, 18], [4.8, 15], [3.2, 10], [2.5, 7], [14.8, 10], [16.2, 13.5]];
  const garden = new Container();
  garden.sortableChildren = true;
  locations.forEach(([x, y], index) => {
    if (occupied.some(model => Math.abs(model.gridX - x) < 2.3 && Math.abs(model.gridY - y) < 2.3)) return;
    const p = point(x, y);
    const size = 0.85 + rng() * 0.5;
    const foliage = new Graphics();
    for (let bush = 0; bush < 7; bush += 1) {
      const bx = p.x + (rng() - 0.5) * 125;
      const by = p.y + (rng() - 0.5) * 40;
      foliage.ellipse(bx, by, 16 + rng() * 9, 9 + rng() * 4).fill(bush % 2 ? 0x75b73f : 0x4d9c48);
      flower(foliage, bx, by - 7, FLOWERS[bush % FLOWERS.length], 3 + rng() * 1.8);
    }
    foliage.zIndex = p.y + 1;
    garden.addChild(foliage);
    const decoration = tree(p.x, p.y, size, 103 + index * 19, leafGradient, treeTexture);
    decoration.zIndex = p.y;
    garden.addChild(decoration);
  });
  landscape.addChild(garden);
  return landscape;
}
