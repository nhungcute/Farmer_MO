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
const OUTSIDE_METADATA_HASH = {
  animationManifest: 'fa8bb508918a1ce063a440c54555aa694d5b7719517c33b5345309cf492ce351',
  licenses: 'e89a9b2a949b850e3bf07b00ad10cdaf59dc195763681dde3e35cfcaad46e255',
  crops: '99b7bb79e84107263b2b6fcd7880e47b8f059f03c416557994306aa525b02081',
};

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
  if (asset.placeholder !== true) fail(`${id}: non-Wave1 asset is no longer a placeholder`);
  if (asset.approved === true || asset.production_ready === true) fail(`${id}: non-Wave1 asset was approved or promoted`);
  if (asset.license !== 'internal-placeholder') fail(`${id}: non-Wave1 license changed`);
  if (asset.approvalRef !== undefined) fail(`${id}: non-Wave1 approvalRef was added`);
}

for (const [label, manifest, expectedHash] of [
  ['animation manifest', source, OUTSIDE_METADATA_HASH.animationManifest],
  ['licenses sidecar', licenses, OUTSIDE_METADATA_HASH.licenses],
  ['crops sidecar', crops, OUTSIDE_METADATA_HASH.crops],
]) {
  const actualHash = outsideAssetMetadataHash(manifest);
  if (actualHash !== expectedHash) fail(`${label}: non-Wave1 metadata changed`);
}

if (JSON.stringify(Object.keys(runtime.assets ?? {})) !== JSON.stringify(Object.keys(source.assets ?? {}))) {
  fail('Runtime manifest asset key order/set differs from canonical source');
}
for (const [id, asset] of Object.entries(source.assets ?? {})) {
  if (JSON.stringify(runtime.assets?.[id]) !== JSON.stringify(asset)) fail(`${id}: runtime metadata differs from canonical source`);
}

const sourceHash = crypto.createHash('sha256').update(JSON.stringify(outside.sort().map((id) => [
  id,
  crypto.createHash('sha256').update(fs.readFileSync(assets[id].sourceFile)).digest('hex'),
]))).digest('hex');
if (sourceHash !== 'cd76a2e6f3084ba66007aad2922d43fcf71ebc56e68ec9e2a752954bf0d3a3c5') fail('Non-Wave1 source PNG aggregate changed');

if (Object.values(assets).length !== 188) fail(`Expected 188 canonical assets, found ${Object.values(assets).length}`);
if (Object.values(assets).filter((asset) => asset.production_ready === true).length !== 112) fail('production_ready flag count is not 112');
if (Object.values(assets).filter((asset) => asset.approved === true).length !== 112) fail('approved flag count is not 112');
if (Object.values(assets).filter((asset) => asset.placeholder === true).length !== 76) fail('placeholder count is not 76');
if (Object.values(assets).some((asset) => asset.approved === true && !wave1.has(asset.id))) fail('Asset outside Wave 1 is approved');
if (Object.keys(crops.assets ?? {}).filter((id) => wave1.has(id)).length !== 20) fail('Focused crops manifest does not contain all 20 Wave 1 crop assets');
if (Object.keys(animals.assets ?? {}).filter((id) => wave1.has(id)).length !== 92) fail('Focused animals manifest does not contain all 92 Chicken assets');

console.log('Wave 1 release invariant PASS: 112 policy-approved assets, 76 untouched placeholders, runtime/sidecar parity verified.');
