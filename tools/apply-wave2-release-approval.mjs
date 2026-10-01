import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APPROVAL_REF = 'docs/assets/approvals/WAVE2_PRODUCTION_ART_APPROVAL.md';
const POLICY = 'MO_FARM_INTERNAL_ASSET_POLICY_V1';

const groups = {
  pond: ['pond_small_lv1_base', ...Array.from({ length: 8 }, (_, i) => `pond_small_lv1_water_0${i}`), ...Array.from({ length: 6 }, (_, i) => `pond_small_lv1_ripple_0${i}`), ...Array.from({ length: 4 }, (_, i) => `pond_small_lv1_sparkle_0${i}`)],
  farmhouse: ['building_farmhouse_lv1'],
  warehouse: ['building_warehouse_lv1'],
  chickenCoop: ['building_chicken_coop_lv1'],
  terrain: ['terrain_grass_tile', ...Array.from({ length: 4 }, (_, i) => `terrain_grass_variant_0${i + 1}`)],
  effects: [...Array.from({ length: 4 }, (_, i) => `fx_plant_0${i}`), ...Array.from({ length: 6 }, (_, i) => `fx_harvest_0${i}`), ...Array.from({ length: 6 }, (_, i) => `fx_build_success_0${i}`), ...Array.from({ length: 8 }, (_, i) => `fx_coin_gain_0${i}`), ...Array.from({ length: 6 }, (_, i) => `fx_egg_collect_0${i}`)],
  ui: ['icon_coin', 'icon_diamond', 'icon_rice', 'icon_carrot', 'icon_corn', 'icon_tomato', 'icon_chicken_feed', 'icon_egg', 'icon_order', 'ui_rotate_overlay', 'ui_loading', 'ui_success_toast', 'ui_error_toast', 'build_ghost_valid', 'build_ghost_invalid'],
  cropExtras: Array.from({ length: 4 }, (_, i) => `crop_ready_glow_0${i}`),
};
const wave2 = new Set(Object.values(groups).flat());
if (wave2.size !== 76) throw new Error(`Wave 2 scope must contain 76 unique IDs; found ${wave2.size}`);

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const sourcePath = path.join(ROOT, 'assets-src/manifests/animation-manifest.json');
const source = readJson(sourcePath);
const assets = source.assets ?? {};
for (const id of wave2) {
  const asset = assets[id];
  if (!asset) throw new Error(`Missing Wave 2 canonical asset: ${id}`);
  for (const [key, expected] of Object.entries({ placeholder: false, production_ready: true, technicalReview: 'PASS', styleReview: 'PASS', source: 'internal-generated', license: POLICY })) {
    if (asset[key] !== expected) throw new Error(`${id}: refusing approval because ${key} is ${String(asset[key])}, expected ${String(expected)}`);
  }
  if (!asset.creator || !asset.tool || !asset.toolVersion) throw new Error(`${id}: truthful provenance is incomplete`);
  asset.contentApproval = 'APPROVED';
  asset.licenseApproval = 'APPROVED';
  asset.releaseApproval = 'APPROVED';
  asset.approved = true;
  asset.approvalRef = APPROVAL_REF;
}
writeJson(sourcePath, source);
console.log(`Applied Wave 2 release approval metadata to ${wave2.size} canonical assets.`);
