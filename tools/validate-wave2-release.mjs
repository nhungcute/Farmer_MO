import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY = 'MO_FARM_INTERNAL_ASSET_POLICY_V1';
const WAVE1_APPROVAL_REF = 'docs/assets/approvals/WAVE1_PRODUCTION_ART_APPROVAL.md';
const WAVE2_APPROVAL_REF = 'docs/assets/approvals/WAVE2_PRODUCTION_ART_APPROVAL.md';
const REVIEWED_COMMIT = 'ba69671599a3d618994c94b1c9537460681315f4';
const WAVE2_APPROVAL_FILE = path.join(ROOT, WAVE2_APPROVAL_REF);
const EXPECTED = { total: 188, productionReady: 188, approved: 188, placeholders: 0, animations: 10, wave1: 112, wave2: 76 };
// Production approval is metadata-only. These aggregate digests pin the
// canonical PNG bytes to the reviewed baseline and catch accidental artwork
// regeneration while approval metadata is being promoted.
const EXPECTED_PNG_AGGREGATE_SHA256 = {
  wave1: '2d026ebf24620a3cc32a553c21f94ad63d734a37abf1b91e544404507cb628f5',
  all: '3ae2797eb19f1c8785b9e7e818b49b53cbd3a9392b4207e488570c62621e307a',
};

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
const sourceManifest = readJson('assets-src/manifests/animation-manifest.json');
const runtimeManifest = readJson('apps/web/public/assets/manifests/animation-manifest.json');
const licenses = readJson('assets-src/manifests/licenses.json');
const inventory = readJson('docs/assets/PRODUCTION_ASSET_INVENTORY.json');
const assets = sourceManifest.assets ?? {};
const runtimeAssets = runtimeManifest.assets ?? {};
const licenseAssets = licenses.assets ?? {};
const issues = [];

function check(condition, message) {
  if (!condition) issues.push(message);
}

function sorted(values) {
  return [...values].sort();
}

function sameSet(actual, expected) {
  return actual.length === expected.length && sorted(actual).every((value, index) => value === sorted(expected)[index]);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function aggregatePngHash(ids) {
  const rows = [];
  for (const id of sorted(ids)) {
    const sourceFile = assets[id]?.sourceFile;
    const absoluteFile = sourceFile ? path.join(ROOT, sourceFile) : null;
    check(Boolean(absoluteFile && fs.existsSync(absoluteFile)), `${id}: missing canonical PNG while computing artwork immutability hash`);
    if (absoluteFile && fs.existsSync(absoluteFile)) rows.push(`${id} ${sha256(absoluteFile)}`);
  }
  return crypto.createHash('sha256').update(rows.join('\n'), 'utf8').digest('hex');
}

function animationFrameIds(animation) {
  const ids = [];
  for (const directions of Object.values(animation?.animations ?? {})) {
    for (const clip of Object.values(directions ?? {})) {
      for (const frame of clip?.frames ?? []) ids.push(typeof frame === 'string' ? frame : frame?.id);
    }
  }
  return ids.filter(Boolean);
}

function buildWave2Ids() {
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
  return { groups, ids: Object.values(groups).flat() };
}

function loadApprovalRecord() {
  check(fs.existsSync(WAVE2_APPROVAL_FILE), `Missing approval record: ${WAVE2_APPROVAL_REF}`);
  if (!fs.existsSync(WAVE2_APPROVAL_FILE)) return;
  const record = fs.readFileSync(WAVE2_APPROVAL_FILE, 'utf8');
  const required = [
    ['assetCount', /assetCount\s*[:=|]\s*\**76\**/i],
    ['commitReviewed', new RegExp(`commitReviewed\\s*[:=|]\\s*\\**${REVIEWED_COMMIT}\\**`, 'i')],
    ['technicalReview', /technicalReview\s*[:=|]\s*\**PASS\**/i],
    ['styleReview', /styleReview\s*[:=|]\s*\**PASS\**/i],
    ['contentApproval', /contentApproval\s*[:=|]\s*\**APPROVED\**/i],
    ['owner', /owner\s*[:=|]\s*\**Project Owner\**/i],
    ['provenance', /provenance\s*[:=|]\s*\**VERIFIED\**/i],
    ['license', new RegExp(`license\\s*[:=|]\\s*\\**${POLICY}\\**`, 'i')],
    ['licenseApproval', /licenseApproval\s*[:=|]\s*\**APPROVED\**/i],
    ['releaseApproval', /releaseApproval\s*[:=|]\s*\**APPROVED\**/i],
    ['approvalRef', new RegExp(`approvalRef\\s*[:=|]\\s*\\**${WAVE2_APPROVAL_REF.replaceAll('/', '\\/')}\\**`, 'i')],
  ];
  for (const [field, pattern] of required) check(pattern.test(record), `Wave 2 approval record missing or invalid ${field}`);
  for (const [group, count] of Object.entries({ Pond: 19, Farmhouse: 1, Warehouse: 1, 'Chicken Coop': 1, Terrain: 5, Effects: 30, UI: 15, 'Crop Extras': 4 })) {
    check(new RegExp(`${group.replaceAll(' ', '\\s+')}[\\s|:-]+${count}\\b`, 'i').test(record), `Wave 2 approval record missing or invalid ${group} scope count`);
  }
}

const { groups: wave2Groups, ids: wave2List } = buildWave2Ids();
const wave2 = new Set(wave2List);
const chicken = new Set(animationFrameIds(sourceManifest.animations?.animal_chicken));
const crop = new Set(Object.keys(assets).filter((id) => /^crop_(rice|carrot|corn|tomato)_(seed|stage_[1-3]|ready)$/.test(id)));
const wave1 = new Set([...chicken, ...crop]);
const allIds = Object.keys(assets);

check(chicken.size === 92, `Wave 1 Chicken scope must contain 92 frames, found ${chicken.size}`);
check(crop.size === 20, `Wave 1 crop scope must contain 20 frames, found ${crop.size}`);
check(wave1.size === EXPECTED.wave1, `Wave 1 scope must contain ${EXPECTED.wave1} unique assets, found ${wave1.size}`);
check(wave2List.length === EXPECTED.wave2 && wave2.size === EXPECTED.wave2, `Wave 2 allowlist must contain ${EXPECTED.wave2} unique assets, found ${wave2.size}`);
check(wave1.size + wave2.size === EXPECTED.total, `Wave 1 + Wave 2 scope must cover ${EXPECTED.total} assets`);
check([...wave1].every((id) => !wave2.has(id)), 'Wave 1 and Wave 2 scopes overlap');
check(sameSet(allIds, [...wave1, ...wave2]), 'Canonical manifest contains IDs outside the frozen Wave 1 + Wave 2 scopes');

const wave2ScopeCounts = Object.fromEntries(Object.entries(wave2Groups).map(([group, ids]) => [group, ids.length]));
check(Object.values(wave2ScopeCounts).reduce((sum, count) => sum + count, 0) === EXPECTED.wave2, `Wave 2 group counts must total ${EXPECTED.wave2}`);

const requiredMetadata = {
  placeholder: false,
  production_ready: true,
  approved: true,
  technicalReview: 'PASS',
  styleReview: 'PASS',
  contentApproval: 'APPROVED',
  licenseApproval: 'APPROVED',
  releaseApproval: 'APPROVED',
  license: POLICY,
  source: 'internal-generated',
  approvalRef: WAVE2_APPROVAL_REF,
};
const wave1Metadata = {
  placeholder: false,
  production_ready: true,
  approved: true,
  technicalReview: 'PASS',
  styleReview: 'PASS',
  contentApproval: 'APPROVED',
  licenseApproval: 'APPROVED',
  license: POLICY,
  source: 'internal-generated',
  approvalRef: WAVE1_APPROVAL_REF,
};

function validateMetadata(id, metadata, expected, label) {
  check(Boolean(metadata), `${id}: missing ${label} metadata`);
  if (!metadata) return;
  for (const [key, value] of Object.entries(expected)) check(metadata[key] === value, `${id}: ${label} ${key} expected ${String(value)}, got ${String(metadata[key])}`);
  // Wave 1 predates the explicit releaseApproval field; when present it must
  // still agree with its already-approved release record.
  if (label === 'Wave 1' && Object.prototype.hasOwnProperty.call(metadata, 'releaseApproval')) check(metadata.releaseApproval === 'APPROVED', `${id}: Wave 1 releaseApproval must remain APPROVED when present`);
  check(typeof metadata.creator === 'string' && metadata.creator.trim().length > 0, `${id}: missing truthful creator provenance`);
  check(typeof metadata.tool === 'string' && metadata.tool.trim().length > 0, `${id}: missing truthful tool provenance`);
  check(typeof metadata.toolVersion === 'string' && metadata.toolVersion.trim().length > 0, `${id}: missing truthful toolVersion provenance`);
}

for (const id of wave1) validateMetadata(id, assets[id], wave1Metadata, 'Wave 1');
for (const id of wave2) validateMetadata(id, assets[id], requiredMetadata, 'Wave 2');
check(aggregatePngHash(wave1) === EXPECTED_PNG_AGGREGATE_SHA256.wave1, 'Wave 1 canonical PNG aggregate hash changed from reviewed baseline');
check(aggregatePngHash(allIds) === EXPECTED_PNG_AGGREGATE_SHA256.all, 'Canonical 188-asset PNG aggregate hash changed from reviewed baseline');

check(JSON.stringify(Object.keys(runtimeAssets)) === JSON.stringify(allIds), 'Runtime manifest asset key order/set differs from canonical source');
const sidecarKeys = ['license', 'source', 'tool', 'toolVersion', 'creator', 'placeholder', 'technicalReview', 'styleReview', 'contentApproval', 'licenseApproval', 'releaseApproval', 'approvalRef', 'production_ready', 'approved'];
for (const id of allIds) {
  const source = assets[id];
  const runtime = runtimeAssets[id];
  const sidecar = licenseAssets[id];
  check(JSON.stringify(runtime) === JSON.stringify(source), `${id}: runtime metadata differs from canonical source`);
  check(Boolean(sidecar), `${id}: missing license sidecar`);
  if (sidecar) for (const key of sidecarKeys) check(sidecar[key] === source[key], `${id}: license sidecar ${key} differs from canonical source`);
}
for (const focusedName of ['terrain', 'buildings', 'crops', 'animals', 'ponds', 'effects', 'ui']) {
  const focused = readJson(`assets-src/manifests/${focusedName}.json`);
  for (const [id, focusedMetadata] of Object.entries(focused.assets ?? {})) {
    check(Boolean(assets[id]), `${focusedName}.json references unknown canonical asset ${id}`);
    if (assets[id]) check(JSON.stringify(focusedMetadata) === JSON.stringify(assets[id]), `${focusedName}.json metadata differs from canonical source for ${id}`);
  }
}

const sourceManifestFile = path.join(ROOT, 'assets-src/manifests/animation-manifest.json');
check(Object.keys(sourceManifest.animations ?? {}).length === EXPECTED.animations, `Expected ${EXPECTED.animations} animation contracts, found ${Object.keys(sourceManifest.animations ?? {}).length}`);
check(Object.keys(runtimeManifest.animations ?? {}).length === EXPECTED.animations, `Runtime manifest must contain ${EXPECTED.animations} animation contracts`);
check(inventory.counts?.assets === EXPECTED.total, `Inventory asset count must be ${EXPECTED.total}`);
check(inventory.counts?.animations === EXPECTED.animations, `Inventory animation count must be ${EXPECTED.animations}`);
check(inventory.counts?.metadataCounts?.production_ready === EXPECTED.productionReady, `Inventory production_ready count must be ${EXPECTED.productionReady}`);
check(inventory.counts?.metadataCounts?.approved === EXPECTED.approved, `Inventory approved count must be ${EXPECTED.approved}`);
check(inventory.counts?.metadataCounts?.placeholder === EXPECTED.placeholders, `Inventory placeholder count must be ${EXPECTED.placeholders}`);
check(inventory.counts?.statusCounts?.placeholder === EXPECTED.placeholders, `Inventory placeholder status count must be ${EXPECTED.placeholders}`);
check(inventory.counts?.statusCounts?.approved === EXPECTED.approved, `Inventory approved status count must be ${EXPECTED.approved}`);
check(inventory.manifestSha256 === sha256(sourceManifestFile), 'Inventory manifestSha256 does not match canonical source manifest');

const counts = {
  total: allIds.length,
  productionReady: allIds.filter((id) => assets[id]?.production_ready === true).length,
  approved: allIds.filter((id) => assets[id]?.approved === true).length,
  placeholders: allIds.filter((id) => assets[id]?.placeholder === true).length,
  wave1ProductionReady: [...wave1].filter((id) => assets[id]?.production_ready === true).length,
  wave1Approved: [...wave1].filter((id) => assets[id]?.approved === true).length,
  wave2ProductionReady: [...wave2].filter((id) => assets[id]?.production_ready === true).length,
  wave2Approved: [...wave2].filter((id) => assets[id]?.approved === true).length,
};
for (const [key, expected] of Object.entries({ total: EXPECTED.total, productionReady: EXPECTED.productionReady, approved: EXPECTED.approved, placeholders: EXPECTED.placeholders, wave1ProductionReady: EXPECTED.wave1, wave1Approved: EXPECTED.wave1, wave2ProductionReady: EXPECTED.wave2, wave2Approved: EXPECTED.wave2 })) check(counts[key] === expected, `${key} count expected ${expected}, found ${counts[key]}`);
check([...wave1].every((id) => assets[id]?.approvalRef === WAVE1_APPROVAL_REF), 'Wave 1 approvalRef crossover or missing reference detected');
check([...wave2].every((id) => assets[id]?.approvalRef === WAVE2_APPROVAL_REF), 'Wave 2 approvalRef crossover or missing reference detected');
check([...wave1].every((id) => assets[id]?.approvalRef !== WAVE2_APPROVAL_REF), 'Wave 1 uses Wave 2 approvalRef');
check([...wave2].every((id) => assets[id]?.approvalRef !== WAVE1_APPROVAL_REF), 'Wave 2 uses Wave 1 approvalRef');

function atlasPages() {
  const pages = [];
  const seen = new Set();
  for (const group of ['farm_common', 'crops', 'effects', 'chicken']) {
    const aggregatePath = path.join(ROOT, 'apps/web/public/assets/atlases', `${group}.json`);
    check(fs.existsSync(aggregatePath), `Missing canonical atlas aggregate ${group}.json`);
    if (!fs.existsSync(aggregatePath)) continue;
    const aggregate = JSON.parse(fs.readFileSync(aggregatePath, 'utf8'));
    const entries = aggregate.pages ?? [{ json: `${group}.json`, image: aggregate.meta?.image, data: aggregate }];
    for (const entry of entries) {
      const jsonName = entry.json ?? `${group}.json`;
      if (seen.has(jsonName)) continue;
      seen.add(jsonName);
      const jsonPath = path.join(ROOT, 'apps/web/public/assets/atlases', jsonName);
      const imageName = entry.image ?? entry.data?.meta?.image;
      check(fs.existsSync(jsonPath), `Missing atlas page JSON ${jsonName}`);
      check(typeof imageName === 'string' && fs.existsSync(path.join(ROOT, 'apps/web/public/assets/atlases', imageName)), `Missing atlas page image for ${jsonName}`);
      pages.push(jsonName);
    }
  }
  return pages;
}
const pages = atlasPages();
check(pages.length > 0, 'No canonical atlas pages found');
const atlasFrameIds = new Set();
const atlasFrameCounts = new Map();
for (const pageName of pages) {
  const pagePath = path.join(ROOT, 'apps/web/public/assets/atlases', pageName);
  if (!fs.existsSync(pagePath)) continue;
  const page = JSON.parse(fs.readFileSync(pagePath, 'utf8'));
  for (const id of Object.keys(page.frames ?? {})) {
    atlasFrameIds.add(id);
    atlasFrameCounts.set(id, (atlasFrameCounts.get(id) ?? 0) + 1);
  }
}
check(sameSet([...atlasFrameIds], allIds), `Canonical atlas frame coverage differs from source assets (atlas=${atlasFrameIds.size}, source=${allIds.length})`);
check(atlasFrameCounts.size === allIds.length && [...atlasFrameCounts.values()].every((count) => count === 1), 'Canonical atlas must contain each source asset frame exactly once');

loadApprovalRecord();

if (issues.length > 0) {
  console.error(`Wave 2 release invariant FAIL: ${issues.length} issue(s)`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Wave 2 release invariant PASS: ${counts.wave2Approved}/${EXPECTED.wave2} Wave 2 approved (${counts.wave2ProductionReady}/${EXPECTED.wave2} production_ready); ${counts.wave1Approved}/${EXPECTED.wave1} Wave 1 approved (${counts.wave1ProductionReady}/${EXPECTED.wave1} production_ready); ${counts.total}/${EXPECTED.total} total, ${counts.productionReady}/${EXPECTED.productionReady} production_ready, ${counts.approved}/${EXPECTED.approved} approved, ${counts.placeholders} placeholders, ${Object.keys(sourceManifest.animations).length} animations, ${pages.length} atlas pages; approval references and runtime/sidecar parity verified.`);
}
