import fs from 'node:fs';
import path from 'node:path';
import {
  SOURCE_ROOT,
  MANIFEST_PATH,
  ensureDir,
  writeJson,
  writePng,
} from './lib.mjs';

const palettes = {
  green: [91, 151, 76, 255],
  greenDark: [43, 92, 55, 255],
  cream: [249, 225, 159, 255],
  wood: [157, 99, 54, 255],
  blue: [74, 171, 211, 255],
  blueDark: [38, 108, 155, 255],
  yellow: [244, 194, 64, 255],
  red: [211, 84, 77, 255],
  white: [255, 255, 255, 255],
  transparent: [0, 0, 0, 0],
};

function hashColor(key) {
  let hash = 2166136261;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const hue = Math.abs(hash) % 360;
  const c = 0.65;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const rgb = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((rgb[0] + 0.18) * 255), Math.round((rgb[1] + 0.18) * 255), Math.round((rgb[2] + 0.18) * 255), 255];
}

function rgba(width, height) {
  return Buffer.alloc(width * height * 4);
}

function pixel(buffer, width, x, y, color) {
  if (x < 0 || y < 0 || x >= width) return;
  const offset = (y * width + x) * 4;
  buffer[offset] = color[0]; buffer[offset + 1] = color[1]; buffer[offset + 2] = color[2]; buffer[offset + 3] = color[3];
}

function rect(buffer, width, x, y, w, h, color) {
  for (let yy = Math.max(0, y); yy < y + h; yy += 1) {
    for (let xx = Math.max(0, x); xx < x + w; xx += 1) pixel(buffer, width, xx, yy, color);
  }
}

function outlineRect(buffer, width, x, y, w, h, color, thickness = 4) {
  rect(buffer, width, x, y, w, thickness, color);
  rect(buffer, width, x, y + h - thickness, w, thickness, color);
  rect(buffer, width, x, y, thickness, h, color);
  rect(buffer, width, x + w - thickness, y, thickness, h, color);
}

function ellipse(buffer, width, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      if (((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1) pixel(buffer, width, x, y, color);
    }
  }
}

function diamond(buffer, width, cx, cy, rx, ry, color) {
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    const span = Math.floor(rx * (1 - Math.abs(y - cy) / ry));
    for (let x = cx - span; x <= cx + span; x += 1) pixel(buffer, width, x, y, color);
  }
}

function drawPlaceholder(id, width, height) {
  const out = rgba(width, height);
  const kind = id.split('_')[0];
  const accent = hashColor(id);
  if (id.startsWith('terrain_grass')) {
    diamond(out, width, Math.floor(width / 2), Math.floor(height / 2), Math.floor(width * 0.48), Math.floor(height * 0.45), palettes.green);
    diamond(out, width, Math.floor(width / 2), Math.floor(height / 2) - 2, Math.floor(width * 0.42), Math.floor(height * 0.37), accent);
    for (let i = 0; i < 7; i += 1) rect(out, width, (i * 37) % width, Math.floor(height * 0.4) + (i % 3) * 5, 3, 9, palettes.greenDark);
  } else if (id.startsWith('building_') || id.startsWith('pond_small_lv1_base')) {
    rect(out, width, 16, 42, width - 32, height - 58, palettes.wood);
    rect(out, width, 28, 57, width - 56, height - 70, palettes.cream);
    diamond(out, width, Math.floor(width / 2), 45, Math.floor(width * 0.41), 35, accent);
    rect(out, width, Math.floor(width / 2) - 20, height - 70, 40, 48, palettes.wood);
    outlineRect(out, width, 16, 42, width - 32, height - 58, palettes.greenDark, 5);
  } else if (id.startsWith('pond_small_lv1_water')) {
    ellipse(out, width, width / 2, height / 2, width * 0.43, height * 0.33, palettes.blue);
    ellipse(out, width, width / 2, height / 2 - 5, width * 0.34, height * 0.2, palettes.blueDark);
    for (let i = 0; i < 3; i += 1) outlineRect(out, width, width * 0.28 + i * 36, height * 0.45 + i * 6, 45, 4, palettes.cream, 2);
  } else if (id.startsWith('pond_small_lv1_ripple')) {
    ellipse(out, width, width / 2, height / 2, width * 0.34, height * 0.15, palettes.white);
    ellipse(out, width, width / 2, height / 2, width * 0.2, height * 0.08, palettes.blueDark);
  } else if (id.startsWith('pond_small_lv1_sparkle') || id.startsWith('fx_')) {
    const cx = width / 2; const cy = height / 2;
    const r = Math.min(width, height) * (0.18 + (Math.abs(id.length) % 4) * 0.04);
    ellipse(out, width, cx, cy, r, r, id.startsWith('fx_') ? accent : palettes.yellow);
    rect(out, width, cx - 3, cy - r * 1.4, 6, r * 2.8, palettes.white);
    rect(out, width, cx - r * 1.4, cy - 3, r * 2.8, 6, palettes.white);
  } else if (id.startsWith('crop_')) {
    const stage = id.includes('seed') ? 0 : id.includes('stage_1') ? 1 : id.includes('stage_2') ? 2 : id.includes('stage_3') ? 3 : 4;
    rect(out, width, width / 2 - 5, height * 0.45, 10, height * 0.36, palettes.greenDark);
    const leaf = 15 + stage * 9;
    ellipse(out, width, width / 2 - leaf / 2, height * 0.44, leaf, 10 + stage * 3, accent);
    ellipse(out, width, width / 2 + leaf / 2, height * 0.52, leaf, 10 + stage * 3, palettes.green);
    if (stage === 0) ellipse(out, width, width / 2, height * 0.8, 11, 7, palettes.wood);
    if (stage === 4) ellipse(out, width, width / 2, height * 0.34, 22, 22, palettes.yellow);
  } else if (id.startsWith('animal_chicken')) {
    const bob = id.includes('_01') || id.includes('_03') ? 5 : 0;
    ellipse(out, width, width * 0.5, height * 0.57 + bob, width * 0.22, height * 0.22, palettes.white);
    ellipse(out, width, width * 0.62, height * 0.37 + bob, width * 0.14, height * 0.14, palettes.cream);
    ellipse(out, width, width * 0.68, height * 0.38 + bob, 5, 5, palettes.greenDark);
    rect(out, width, width * 0.73, height * 0.42 + bob, 14, 7, palettes.red);
    rect(out, width, width * 0.43, height * 0.77, 6, 20, palettes.yellow);
    rect(out, width, width * 0.58, height * 0.77, 6, 20, palettes.yellow);
  } else if (id.startsWith('icon_')) {
    ellipse(out, width, width / 2, height / 2, width * 0.34, height * 0.34, accent);
    outlineRect(out, width, width * 0.16, height * 0.16, width * 0.68, height * 0.68, palettes.white, 4);
  } else {
    rect(out, width, 16, 16, width - 32, height - 32, accent);
    outlineRect(out, width, 16, 16, width - 32, height - 32, palettes.white, 5);
  }
  return out;
}

const groups = {
  farm_common: 'farm_common',
  crops: 'crops',
  chicken: 'chicken',
  effects: 'effects',
};

const manifest = {
  contentVersion: 'mvp-1',
  schemaVersion: 1,
  generatedBy: 'tools/export-assets/generate-placeholders.mjs',
  sourceScale: 2,
  atlasMaxSize: 2048,
  atlasPadding: 2,
  atlasGroups: groups,
  assets: {},
  animations: {},
  contracts: {
    minFrames: {
      pond_water: 8, pond_ripple: 6, pond_sparkle: 4, crop_ready_glow: 4,
      fx_plant: 4, fx_harvest: 6, fx_build_success: 6, fx_coin_gain: 8, fx_egg_collect: 6,
      IDLE: 4, WALK: 6, EAT: 5, HAPPY: 4, SLEEP: 2, PRODUCT_READY: 2,
    },
    chickenDirections: ['NE', 'SE', 'SW', 'NW'],
  },
};

// Preserve promoted metadata when rebuilding deterministic placeholders. The
// existing canonical manifest remains the source of truth for non-placeholder
// artwork, so a later assets:build cannot silently reset production review.
const existingManifest = fs.existsSync(MANIFEST_PATH)
  ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  : null;

function addAsset(id, atlas, sourceFile, width, height, anchor = { x: 0.5, y: 0.86 }) {
  const fullPath = path.join(SOURCE_ROOT, sourceFile);
  ensureDir(path.dirname(fullPath));
  if (!fs.existsSync(fullPath)) writePng(fullPath, width, height, drawPlaceholder(id, width, height));
  manifest.assets[id] = {
    id, atlas, sourceFile: `assets-src/${sourceFile.replaceAll('\\', '/')}`,
    width, height, sourceScale: 2, anchor, renderOffset: { x: 0, y: 0 },
    placeholder: true,
    license: 'internal-placeholder',
    source: 'Generated deterministic placeholder',
    tool: 'tools/export-assets/generate-placeholders.mjs',
    toolVersion: '1.0.0',
    creator: 'MO Farm team',
  };
}

function addStatic(id, atlas, folder, width = 256, height = 256, anchor = { x: 0.5, y: 0.86 }) {
  addAsset(id, atlas, `${folder}/${id}.png`, width, height, anchor);
}

function addAnimation(id, atlas, folder, states) {
  // Generic one-clip effects expose a stable DEFAULT state and NONE direction.
  const animation = { id, atlas, directions: ['NONE'], defaultDirection: 'NONE', sourceScale: 2, anchor: { x: 0.5, y: 0.86 }, mirrorAllowed: false, animations: { DEFAULT: states } };
  manifest.animations[id] = animation;
}

function clip(frameIds, fps, loop, holdLast = false, events = undefined) {
  const result = { frames: frameIds.map((frame) => ({ id: frame })), fps, loop, holdLast };
  if (events) result.events = events;
  return result;
}

// Static terrain, buildings, pond base and UI icons.
for (const id of ['terrain_grass_tile', 'terrain_grass_variant_01', 'terrain_grass_variant_02', 'terrain_grass_variant_03', 'terrain_grass_variant_04']) addStatic(id, 'farm_common', 'terrain', 256, 128, { x: 0.5, y: 0.5 });
for (const id of ['building_farmhouse_lv1', 'building_warehouse_lv1', 'building_chicken_coop_lv1', 'pond_small_lv1_base']) addStatic(id, 'farm_common', id.startsWith('pond') ? 'ponds' : 'buildings', 512, 384);
for (const id of ['icon_coin', 'icon_diamond', 'icon_rice', 'icon_carrot', 'icon_corn', 'icon_tomato', 'icon_chicken_feed', 'icon_egg', 'icon_order', 'ui_rotate_overlay', 'ui_loading', 'ui_success_toast', 'ui_error_toast', 'build_ghost_valid', 'build_ghost_invalid']) addStatic(id, 'farm_common', 'ui', 128, 128, { x: 0.5, y: 0.5 });

// Pond loops.
for (const [name, count, fps] of [['water', 8, 12], ['ripple', 6, 10], ['sparkle', 4, 8]]) {
  const frames = [];
  for (let i = 0; i < count; i += 1) { const id = `pond_small_lv1_${name}_${String(i).padStart(2, '0')}`; addAsset(id, 'farm_common', `ponds/${id}.png`, 512, 384); frames.push(id); }
  addAnimation(`pond_${name}`, 'farm_common', 'ponds', { NONE: clip(frames, fps, true) });
}

// Crop stage textures are static; the server timer selects one of these IDs.
for (const crop of ['rice', 'carrot', 'corn', 'tomato']) {
  for (const stage of ['seed', 'stage_1', 'stage_2', 'stage_3', 'ready']) addStatic(`crop_${crop}_${stage}`, 'crops', 'crops', 256, 256, { x: 0.5, y: 0.9 });
}

function effectAnimation(id, count, fps) {
  const frames = [];
  for (let i = 0; i < count; i += 1) { const frame = `${id}_${String(i).padStart(2, '0')}`; addAsset(frame, 'effects', `effects/${frame}.png`, 256, 256, { x: 0.5, y: 0.5 }); frames.push(frame); }
  addAnimation(id, 'effects', 'effects', { NONE: clip(frames, fps, false, false) });
}
effectAnimation('crop_ready_glow', 4, 8);
effectAnimation('fx_plant', 4, 12);
effectAnimation('fx_harvest', 6, 12);
effectAnimation('fx_build_success', 6, 12);
effectAnimation('fx_coin_gain', 8, 12);
effectAnimation('fx_egg_collect', 6, 12);

// Four real direction sets are generated even for placeholders, so runtime never guesses a direction.
const chickenStates = { IDLE: [4, 6, true, false], WALK: [6, 8, true, false], EAT: [5, 10, false, true], HAPPY: [4, 8, false, true], SLEEP: [2, 3, true, false], PRODUCT_READY: [2, 2, true, false] };
const chickenAnimation = { id: 'animal_chicken', atlas: 'chicken', directions: ['NE', 'SE', 'SW', 'NW'], defaultDirection: 'SE', sourceScale: 2, anchor: { x: 0.5, y: 0.9 }, mirrorAllowed: false, animations: {} };
for (const [state, [count, fps, loop, holdLast]] of Object.entries(chickenStates)) {
  chickenAnimation.animations[state] = {};
  for (const direction of chickenAnimation.directions) {
    const frames = [];
    for (let i = 0; i < count; i += 1) { const frame = `animal_chicken_${state.toLowerCase()}_${direction.toLowerCase()}_${String(i).padStart(2, '0')}`; addAsset(frame, 'chicken', `animals/chicken/${frame}.png`, 256, 256, { x: 0.5, y: 0.9 }); frames.push(frame); }
    chickenAnimation.animations[state][direction] = clip(frames, fps, loop, holdLast, state === 'EAT' ? [{ frame: 2, name: 'FEED_CONSUMED' }] : undefined);
  }
}
manifest.animations.animal_chicken = chickenAnimation;

for (const [id, previous] of Object.entries(existingManifest?.assets ?? {})) {
  if (manifest.assets[id] && previous.placeholder === false) {
    manifest.assets[id] = { ...manifest.assets[id], ...previous, id };
  }
}
for (const [id, previous] of Object.entries(existingManifest?.animations ?? {})) {
  if (manifest.animations[id]) manifest.animations[id] = previous;
}

ensureDir(path.dirname(MANIFEST_PATH));
writeJson(MANIFEST_PATH, manifest);
// Keep focused manifests for artists and reviewers; the single manifest remains canonical for tooling.
for (const [name, predicate] of Object.entries({
  terrain: (id) => id.startsWith('terrain_'),
  buildings: (id) => id.startsWith('building_') || id === 'pond_small_lv1_base',
  crops: (id) => id.startsWith('crop_') || id === 'crop_ready_glow',
  animals: (id) => id.startsWith('animal_chicken_'),
  ponds: (id) => id.startsWith('pond_small_lv1_'),
  effects: (id) => id.startsWith('fx_'),
  ui: (id) => id.startsWith('icon_') || id.startsWith('ui_'),
})) {
  const selectedAssets = Object.fromEntries(Object.entries(manifest.assets).filter(([id]) => predicate(id)));
  const selectedAnimations = Object.fromEntries(Object.entries(manifest.animations).filter(([id]) => predicate(id)));
  writeJson(path.join(SOURCE_ROOT, 'manifests', `${name}.json`), { contentVersion: manifest.contentVersion, assets: selectedAssets, animations: selectedAnimations });
}
writeJson(path.join(SOURCE_ROOT, 'manifests', 'licenses.json'), {
  contentVersion: 'mvp-1',
  assets: Object.fromEntries(Object.entries(manifest.assets).map(([id, metadata]) => [id, {
    license: metadata.license,
    source: metadata.source,
    tool: metadata.tool,
    toolVersion: metadata.toolVersion,
    creator: metadata.creator,
    placeholder: metadata.placeholder === true,
    ...Object.fromEntries(['reviewEvidence', 'technicalReview', 'styleReview', 'contentApproval', 'licenseApproval', 'approvalRef', 'production_ready', 'approved']
      .filter((key) => key in metadata)
      .map((key) => [key, metadata[key]])),
  }])),
});
const style = `# MO Farm asset style sheet\n\n- Phối cảnh: isometric 2.5D\n- Tile logic: 128x64 (nguồn raster @2x)\n- Hướng sáng: trên-trái\n- Viền: xanh lá đậm/nâu đồng nhất\n- Bảng màu: kem, gỗ, xanh cỏ, xanh nước, vàng\n- Trạng thái asset được ghi trong manifest; Wave 1 đã có production artwork được duyệt, các nhóm còn lại vẫn là placeholder nội bộ.\n- Không dùng PNG nguồn trực tiếp trong web bundle; chạy pipeline để tạo atlas.\n`;
ensureDir(path.join(SOURCE_ROOT, 'style'));
fs.writeFileSync(path.join(SOURCE_ROOT, 'style', 'style-sheet.md'), style, 'utf8');
const placeholderCount = Object.values(manifest.assets).filter((asset) => asset.placeholder === true).length;
const approvedCount = Object.values(manifest.assets).filter((asset) => asset.approved === true).length;
console.log(`Đã tạo ${Object.keys(manifest.assets).length} frame (${placeholderCount} placeholder, ${approvedCount} approved) và ${Object.keys(manifest.animations).length} animation.`);
