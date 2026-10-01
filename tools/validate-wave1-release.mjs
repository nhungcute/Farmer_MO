import fs from 'node:fs';
import crypto from 'node:crypto';

const POLICY = 'MO_FARM_INTERNAL_ASSET_POLICY_V1';
const APPROVAL_REF = 'docs/assets/approvals/WAVE1_PRODUCTION_ART_APPROVAL.md';
const WAVE2_APPROVAL_REF = 'docs/assets/approvals/WAVE2_PRODUCTION_ART_APPROVAL.md';
const REVIEW_EVIDENCE = 'docs/assets/review/WAVE2_TARGETED_REVISION_REVIEW.md';
const REQUIRED_WAVE1 = { placeholder: false, production_ready: true, approved: true, technicalReview: 'PASS', styleReview: 'PASS', contentApproval: 'APPROVED', licenseApproval: 'APPROVED', license: POLICY, approvalRef: APPROVAL_REF, source: 'internal-generated' };
const REQUIRED_WAVE2 = { placeholder: false, production_ready: true, approved: true, technicalReview: 'PASS', styleReview: 'PASS', license: POLICY, source: 'internal-generated', contentApproval: 'APPROVED', licenseApproval: 'APPROVED', releaseApproval: 'APPROVED', approvalRef: WAVE2_APPROVAL_REF };
const FROZEN_PROMOTED_WAVE2 = {
  building_farmhouse_lv1: '198694a0eec674ecc923ba439dbad4b6790ba264cba47a25cd59b1a97c9803ac',
  building_warehouse_lv1: '6ff8232df104a066b805d2151f50d03dabe1e59d712843549436f6cc7d589806',
  building_chicken_coop_lv1: 'ba0b8f16368a3a3ac96c5d5fdd2da7d9795181c4da0f491904ce46d2bdc91a55',
  crop_ready_glow_00: 'e1a0f10dbd5ab07439ab60c1eceee8e8815ce04e8858ce74cd974c21881302b9',
  crop_ready_glow_01: 'ffddf058c2fed1b627c704bb1108a1b647786edbaf1b099f241d446e910897f3',
  crop_ready_glow_02: '6a35832e65ff2aa9c23178d90621a0eff1b740a6334ca2eca1637645d09d519b',
  crop_ready_glow_03: '754383180e50a7064e9dc42c35073b51b14fbcb112c4d79d49161c462dbaa36e',
};
const TARGETED_WAVE2 = [
  'terrain_grass_tile', 'terrain_grass_variant_01', 'terrain_grass_variant_02', 'terrain_grass_variant_03', 'terrain_grass_variant_04',
  'building_farmhouse_lv1', 'building_warehouse_lv1', 'building_chicken_coop_lv1',
  'pond_small_lv1_base', ...Array.from({ length: 8 }, (_, i) => `pond_small_lv1_water_0${i}`), ...Array.from({ length: 6 }, (_, i) => `pond_small_lv1_ripple_0${i}`), ...Array.from({ length: 4 }, (_, i) => `pond_small_lv1_sparkle_0${i}`),
  ...Array.from({ length: 4 }, (_, i) => `fx_plant_0${i}`), ...Array.from({ length: 6 }, (_, i) => `fx_harvest_0${i}`), ...Array.from({ length: 6 }, (_, i) => `fx_build_success_0${i}`), ...Array.from({ length: 8 }, (_, i) => `fx_coin_gain_0${i}`), ...Array.from({ length: 6 }, (_, i) => `fx_egg_collect_0${i}`),
  'icon_coin', 'icon_diamond', 'icon_rice', 'icon_carrot', 'icon_corn', 'icon_tomato', 'icon_chicken_feed', 'icon_egg', 'icon_order', 'ui_rotate_overlay', 'ui_loading', 'ui_success_toast', 'ui_error_toast', 'build_ghost_valid', 'build_ghost_invalid',
  'crop_ready_glow_00', 'crop_ready_glow_01', 'crop_ready_glow_02', 'crop_ready_glow_03',
];
const PROMOTED_WAVE2 = new Set(TARGETED_WAVE2);
const FROZEN_WAVE2_REVIEW = 'docs/assets/review/WAVE2_INTEGRATION_REVIEW.md';
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = (message) => { throw new Error(message); };
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const source = read('assets-src/manifests/animation-manifest.json');
const runtime = read('apps/web/public/assets/manifests/animation-manifest.json');
const licenses = read('assets-src/manifests/licenses.json');
const crops = read('assets-src/manifests/crops.json');
const animals = read('assets-src/manifests/animals.json');
const assets = source.assets ?? {};
const chickenIds = new Set();
for (const directions of Object.values(source.animations?.animal_chicken?.animations ?? {})) for (const clip of Object.values(directions ?? {})) for (const frame of clip.frames ?? []) chickenIds.add(typeof frame === 'string' ? frame : frame.id);
const cropIds = new Set(Object.keys(assets).filter((id) => /^crop_(rice|carrot|corn|tomato)_(seed|stage_[1-3]|ready)$/.test(id)));
const wave1 = new Set([...chickenIds, ...cropIds]);
if (chickenIds.size !== 92 || cropIds.size !== 20 || wave1.size !== 112) fail(`Wave 1 selection mismatch: chicken=${chickenIds.size}, crops=${cropIds.size}, total=${wave1.size}`);
if (PROMOTED_WAVE2.size !== 76 || TARGETED_WAVE2.length !== 76) fail('Wave 2 promotion allowlist must contain exactly 76 unique IDs');
if (Object.keys(assets).length !== 188) fail(`Expected 188 canonical assets, found ${Object.keys(assets).length}`);

for (const id of wave1) {
  const asset = assets[id];
  if (!asset) fail(`Missing canonical Wave 1 asset: ${id}`);
  for (const [key, expected] of Object.entries(REQUIRED_WAVE1)) if (asset[key] !== expected) fail(`${id}: ${key} expected ${expected}, got ${asset[key]}`);
}
const outside = Object.keys(assets).filter((id) => !wave1.has(id));
if (outside.length !== 76 || outside.some((id) => !PROMOTED_WAVE2.has(id)) || [...PROMOTED_WAVE2].some((id) => !outside.includes(id))) fail('Non-Wave1 assets do not exactly match the 76 fully promoted Wave 2 IDs');
for (const id of outside) for (const [key, expected] of Object.entries(REQUIRED_WAVE2)) if (assets[id][key] !== expected) fail(`${id}: ${key} expected ${expected}, got ${assets[id][key]}`);
for (const id of outside) {
  if (assets[id].licenseApproval !== 'APPROVED') fail(`${id}: licenseApproval expected APPROVED, got ${assets[id].licenseApproval}`);
  const expectedEvidence = Object.prototype.hasOwnProperty.call(FROZEN_PROMOTED_WAVE2, id) ? FROZEN_WAVE2_REVIEW : REVIEW_EVIDENCE;
  if (assets[id].reviewEvidence !== expectedEvidence) fail(`${id}: reviewEvidence expected ${expectedEvidence}, got ${assets[id].reviewEvidence}`);
}

if (JSON.stringify(Object.keys(runtime.assets ?? {})) !== JSON.stringify(Object.keys(assets))) fail('Runtime manifest asset key order/set differs from canonical source');
for (const [id, asset] of Object.entries(assets)) {
  if (JSON.stringify(runtime.assets?.[id]) !== JSON.stringify(asset)) fail(`${id}: runtime metadata differs from canonical source`);
  const licenseAsset = licenses.assets?.[id];
  if (!licenseAsset) fail(`${id}: missing license sidecar`);
  for (const key of ['license', 'source', 'tool', 'toolVersion', 'creator', 'placeholder', 'technicalReview', 'styleReview', 'contentApproval', 'licenseApproval', 'releaseApproval', 'approvalRef', 'production_ready', 'approved']) if (licenseAsset[key] !== asset[key]) fail(`${id}: license sidecar ${key} differs from canonical source`);
}
for (const [id, expected] of Object.entries(FROZEN_PROMOTED_WAVE2)) {
  const file = assets[id]?.sourceFile;
  if (!file || sha256(file) !== expected) fail(`${id}: frozen promoted PNG changed`);
}
const counts = { productionReady: Object.values(assets).filter((asset) => asset.production_ready === true).length, approved: Object.values(assets).filter((asset) => asset.approved === true).length, placeholders: Object.values(assets).filter((asset) => asset.placeholder === true).length };
if (counts.productionReady !== 188 || counts.approved !== 188 || counts.placeholders !== 0) fail(`Final counts mismatch: ${JSON.stringify(counts)}`);
if (Object.keys(crops.assets ?? {}).filter((id) => wave1.has(id)).length !== 20) fail('Focused crops manifest does not contain all 20 Wave 1 crop assets');
if (Object.keys(animals.assets ?? {}).filter((id) => wave1.has(id)).length !== 92) fail('Focused animals manifest does not contain all 92 Chicken assets');
console.log(`Wave 1 release invariant PASS: 112 approved Wave 1 assets; Wave 2 scope remains 76 assets; final ${counts.productionReady} production_ready, ${counts.approved} approved, ${counts.placeholders} placeholders; runtime/sidecar/frozen-asset parity verified.`);
