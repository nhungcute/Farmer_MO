import fs from 'node:fs';
import crypto from 'node:crypto';

const POLICY = 'MO_FARM_INTERNAL_ASSET_POLICY_V1';
const APPROVAL_REF = 'docs/assets/approvals/WAVE1_PRODUCTION_ART_APPROVAL.md';
const REQUIRED = {
  placeholder: false,
  production_ready: true,
  approved: true,
  technicalReview: 'PASS',
  styleReview: 'PASS',
  contentApproval: 'APPROVED',
  licenseApproval: 'APPROVED',
  license: POLICY,
  approvalRef: APPROVAL_REF,
  source: 'internal-generated',
};
// Wave 2 selective promotion is allowed after Integration Owner review. This
// gate protects the Wave 1 release invariant while requiring an explicit
// allowlist for the current promoted Wave 2 checkpoint.
const PROMOTED_WAVE2 = new Set([
  'building_farmhouse_lv1',
  'building_warehouse_lv1',
  'building_chicken_coop_lv1',
  'crop_ready_glow_00',
  'crop_ready_glow_01',
  'crop_ready_glow_02',
  'crop_ready_glow_03',
]);

function read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fail(message) {
  throw new Error(message);
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function outsideAssetMetadataHash(manifest) {
  return stableHash(Object.fromEntries(Object.entries(manifest.assets ?? {}).filter(([id]) => !wave1.has(id))));
}

const source = read('assets-src/manifests/animation-manifest.json');
const runtime = read('apps/web/public/assets/manifests/animation-manifest.json');
const licenses = read('assets-src/manifests/licenses.json');
const crops = read('assets-src/manifests/crops.json');
const animals = read('assets-src/manifests/animals.json');
const assets = source.assets ?? {};

const chickenIds = new Set();
for (const directions of Object.values(source.animations?.animal_chicken?.animations ?? {})) {
  for (const clip of Object.values(directions ?? {})) {
    for (const frame of clip.frames ?? []) chickenIds.add(typeof frame === 'string' ? frame : frame.id);
  }
}
const cropIds = new Set(Object.keys(assets).filter((id) => /^crop_(rice|carrot|corn|tomato)_(seed|stage_[1-3]|ready)$/.test(id)));
const wave1 = new Set([...chickenIds, ...cropIds]);
if (chickenIds.size !== 92 || cropIds.size !== 20 || wave1.size !== 112) fail(`Wave 1 selection mismatch: chicken=${chickenIds.size}, crops=${cropIds.size}, total=${wave1.size}`);

const outside = Object.keys(assets).filter((id) => !wave1.has(id));
if (outside.length !== 76) fail(`Expected 76 non-Wave1 assets, found ${outside.length}`);

for (const id of wave1) {
  const asset = assets[id];
  if (!asset) fail(`Missing canonical Wave 1 asset: ${id}`);
  for (const [key, expected] of Object.entries(REQUIRED)) {
    if (asset[key] !== expected) fail(`${id}: ${key} expected ${expected}, got ${asset[key]}`);
  }
  const runtimeAsset = runtime.assets?.[id];
  if (JSON.stringify(runtimeAsset) !== JSON.stringify(asset)) fail(`${id}: runtime metadata differs from canonical source`);
  const licenseAsset = licenses.assets?.[id];
  if (!licenseAsset) fail(`${id}: missing license sidecar`);
  for (const key of ['license', 'source', 'tool', 'toolVersion', 'creator', 'placeholder', 'technicalReview', 'styleReview', 'contentApproval', 'licenseApproval', 'approvalRef', 'production_ready', 'approved']) {
    if (licenseAsset[key] !== asset[key]) fail(`${id}: license sidecar ${key} differs from canonical source`);
  }
}

for (const id of outside) {
  const asset = assets[id];
  if (PROMOTED_WAVE2.has(id)) {
    for (const [key, expected] of Object.entries({
      placeholder: false,
      production_ready: true,
      approved: false,
      technicalReview: 'PASS',
      styleReview: 'PASS',
      license: POLICY,
      source: 'internal-generated',
      licenseApproval: 'APPROVED',
      contentApproval: 'PENDING_OWNER_REVIEW',
      approvalRef: null,
    })) {
      if (asset[key] !== expected) fail(`${id}: promoted Wave 2 ${key} expected ${expected}, got ${asset[key]}`);
    }
  } else {
    if (asset.placeholder !== true) fail(`${id}: unpromoted non-Wave1 asset is no longer a placeholder`);
    if (asset.approved === true || asset.production_ready === true) fail(`${id}: unpromoted non-Wave1 asset was approved or promoted`);
    if (asset.license !== 'internal-placeholder') fail(`${id}: unpromoted non-Wave1 license changed`);
    if (asset.approvalRef !== undefined) fail(`${id}: unpromoted non-Wave1 approvalRef was added`);
  }
}

if (JSON.stringify(Object.keys(runtime.assets ?? {})) !== JSON.stringify(Object.keys(source.assets ?? {}))) {
  fail('Runtime manifest asset key order/set differs from canonical source');
}
for (const [id, asset] of Object.entries(source.assets ?? {})) {
  if (JSON.stringify(runtime.assets?.[id]) !== JSON.stringify(asset)) fail(`${id}: runtime metadata differs from canonical source`);
}

// Wave 2 promotion changes are intentionally allowlisted above. Keep a stable
// aggregate for the untouched non-Wave1 PNGs so later promotions cannot alter
// unrelated candidate artwork without an explicit gate update.
const untouchedOutside = outside.filter((id) => !PROMOTED_WAVE2.has(id)).sort();
const sourceHash = crypto.createHash('sha256').update(JSON.stringify(untouchedOutside.map((id) => [
  id,
  crypto.createHash('sha256').update(fs.readFileSync(assets[id].sourceFile)).digest('hex'),
]))).digest('hex');
if (sourceHash !== '332cc3d741f4833784c477884c83e1de3e9e77261c881456389e3f99d4ef0f9a') fail('Unpromoted non-Wave1 source PNG aggregate changed');

if (Object.values(assets).length !== 188) fail(`Expected 188 canonical assets, found ${Object.values(assets).length}`);
if (Object.values(assets).filter((asset) => asset.production_ready === true).length !== 119) fail('production_ready flag count is not 119 (112 Wave 1 + 7 selected Wave 2)');
if (Object.values(assets).filter((asset) => asset.approved === true).length !== 112) fail('approved flag count is not 112');
if (Object.values(assets).filter((asset) => asset.placeholder === true).length !== 69) fail('placeholder count is not 69 after selective promotion');
if (Object.values(assets).some((asset) => asset.approved === true && !wave1.has(asset.id))) fail('Asset outside Wave 1 is approved');
if (Object.keys(crops.assets ?? {}).filter((id) => wave1.has(id)).length !== 20) fail('Focused crops manifest does not contain all 20 Wave 1 crop assets');
if (Object.keys(animals.assets ?? {}).filter((id) => wave1.has(id)).length !== 92) fail('Focused animals manifest does not contain all 92 Chicken assets');

console.log('Wave 1 release invariant PASS: 112 policy-approved Wave 1 assets; 7 allowlisted Wave 2 assets promoted; 69 placeholders remain; runtime/sidecar parity verified.');
