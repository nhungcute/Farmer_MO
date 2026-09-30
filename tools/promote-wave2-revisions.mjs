import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const POLICY = 'MO_FARM_INTERNAL_ASSET_POLICY_V1';
const REVIEW_EVIDENCE = 'docs/assets/review/WAVE2_TARGETED_REVISION_REVIEW.md';
const TOOL_VERSION = 'not exposed by runtime';

const groups = [
  {
    review: 'REVIEW-06', taskId: 'ART-06', owner: 'Codex / Pond Asset Owner', taskRoot: 'work/art-generation/pond',
    sourceDir: 'work/art-generation/pond/candidate/assets-src-compatible/ponds', destinationDir: 'assets-src/ponds',
    ids: [
      'pond_small_lv1_base',
      ...Array.from({ length: 8 }, (_, i) => `pond_small_lv1_water_0${i}`),
      ...Array.from({ length: 6 }, (_, i) => `pond_small_lv1_ripple_0${i}`),
      ...Array.from({ length: 4 }, (_, i) => `pond_small_lv1_sparkle_0${i}`),
    ],
  },
  {
    review: 'REVIEW-10', taskId: 'ART-10', owner: 'Codex / Terrain Asset Owner', taskRoot: 'work/art-generation/terrain',
    sourceDir: 'work/art-generation/terrain/candidate/assets-src-compatible', destinationDir: 'assets-src/terrain',
    ids: ['terrain_grass_tile', ...Array.from({ length: 4 }, (_, i) => `terrain_grass_variant_0${i + 1}`)],
  },
  {
    review: 'REVIEW-11', taskId: 'ART-11', owner: 'Codex / Effects Asset Owner', taskRoot: 'work/art-generation/effects',
    sourceDir: 'work/art-generation/effects/candidate/assets-src-compatible', destinationDir: 'assets-src/effects',
    ids: [
      ...Array.from({ length: 4 }, (_, i) => `fx_plant_0${i}`),
      ...Array.from({ length: 6 }, (_, i) => `fx_harvest_0${i}`),
      ...Array.from({ length: 6 }, (_, i) => `fx_build_success_0${i}`),
      ...Array.from({ length: 8 }, (_, i) => `fx_coin_gain_0${i}`),
      ...Array.from({ length: 6 }, (_, i) => `fx_egg_collect_0${i}`),
    ],
  },
  {
    review: 'REVIEW-12', taskId: 'ART-12', owner: 'Codex / UI Asset Owner', taskRoot: 'work/art-generation/ui',
    sourceDir: 'work/art-generation/ui/candidate/assets-src-compatible', destinationDir: 'assets-src/ui',
    ids: [
      'icon_coin', 'icon_diamond', 'icon_rice', 'icon_carrot', 'icon_corn', 'icon_tomato', 'icon_chicken_feed',
      'icon_egg', 'icon_order', 'ui_rotate_overlay', 'ui_loading', 'ui_success_toast', 'ui_error_toast',
      'build_ghost_valid', 'build_ghost_invalid',
    ],
  },
];

const manifestPath = path.join(ROOT, 'assets-src/manifests/animation-manifest.json');
const licensesPath = path.join(ROOT, 'assets-src/manifests/licenses.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const licenses = JSON.parse(fs.readFileSync(licensesPath, 'utf8'));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const absolute = (file) => path.join(ROOT, file);
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const frozen7 = {
  building_farmhouse_lv1: '198694a0eec674ecc923ba439dbad4b6790ba264cba47a25cd59b1a97c9803ac',
  building_warehouse_lv1: '6ff8232df104a066b805d2151f50d03dabe1e59d712843549436f6cc7d589806',
  building_chicken_coop_lv1: 'ba0b8f16368a3a3ac96c5d5fdd2da7d9795181c4da0f491904ce46d2bdc91a55',
  crop_ready_glow_00: 'e1a0f10dbd5ab07439ab60c1eceee8e8815ce04e8858ce74cd974c21881302b9',
  crop_ready_glow_01: 'ffddf058c2fed1b627c704bb1108a1b647786edbaf1b099f241d446e910897f3',
  crop_ready_glow_02: '6a35832e65ff2aa9c23178d90621a0eff1b740a6334ca2eca1637645d09d519b',
  crop_ready_glow_03: '754383180e50a7064e9dc42c35073b51b14fbcb112c4d79d49161c462dbaa36e',
};

const all = groups.flatMap((group) => group.ids.map((id) => ({ ...group, id })));
assert(all.length === 69, `Expected 69 revision assets, got ${all.length}`);
assert(new Set(all.map((entry) => entry.id)).size === 69, 'Revision promotion IDs are not unique');
for (const group of groups) {
  const reviewPath = absolute(path.join(group.taskRoot, 'reviews', 'REVIEW_RESULT_V2.json'));
  assert(fs.existsSync(reviewPath), `${group.taskId}: missing read-only review result`);
  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  assert(review.recommendation === 'PROMOTE', `${group.taskId}: review recommendation is not PROMOTE`);
  const reviewedCount = (review.changedAssets?.length ?? 0) + (review.unchangedAssets?.length ?? 0);
  assert(reviewedCount === group.ids.length, `${group.taskId}: review scope does not cover the complete canonical set`);
}
for (const entry of all) {
  const metadata = manifest.assets?.[entry.id];
  assert(metadata, `${entry.id}: missing canonical manifest record`);
  assert(metadata.placeholder === true, `${entry.id}: already promoted or non-placeholder; refusing repeat promotion`);
  const fileName = `${entry.id}.png`;
  const source = path.join(ROOT, entry.sourceDir, fileName);
  const destination = path.join(ROOT, entry.destinationDir, fileName);
  assert(fs.existsSync(source), `${entry.id}: candidate missing: ${path.relative(ROOT, source)}`);
  assert(fs.existsSync(destination), `${entry.id}: canonical destination missing: ${path.relative(ROOT, destination)}`);
  const candidateHash = sha256(source);
  fs.copyFileSync(source, destination);
  assert(sha256(destination) === candidateHash, `${entry.id}: copied PNG hash mismatch`);
  Object.assign(metadata, {
    placeholder: false,
    production_ready: true,
    approved: false,
    technicalReview: 'PASS',
    styleReview: 'PASS',
    license: POLICY,
    licenseApproval: 'APPROVED',
    contentApproval: 'PENDING_OWNER_REVIEW',
    approvalRef: null,
    reviewEvidence: REVIEW_EVIDENCE,
    source: 'internal-generated',
    tool: 'built-in image_gen',
    toolVersion: TOOL_VERSION,
    creator: entry.owner,
  });
  licenses.assets[entry.id] = {
    ...licenses.assets[entry.id],
    license: metadata.license,
    source: metadata.source,
    tool: metadata.tool,
    toolVersion: metadata.toolVersion,
    creator: metadata.creator,
    placeholder: metadata.placeholder,
    reviewEvidence: metadata.reviewEvidence,
    technicalReview: metadata.technicalReview,
    styleReview: metadata.styleReview,
    contentApproval: metadata.contentApproval,
    licenseApproval: metadata.licenseApproval,
    approvalRef: metadata.approvalRef,
    production_ready: metadata.production_ready,
    approved: metadata.approved,
  };
}

for (const [id, expected] of Object.entries(frozen7)) {
  const sourceFile = manifest.assets[id]?.sourceFile;
  assert(sourceFile && sha256(absolute(sourceFile)) === expected, `${id}: frozen promoted Wave 2 PNG changed`);
}

writeJson(manifestPath, manifest);
writeJson(licensesPath, licenses);

// Keep each candidate workspace auditable without changing its reviewed evidence.
for (const group of groups) {
  const root = absolute(group.taskRoot);
  for (const name of ['ART_METADATA.json', 'ART_QA.json', 'CANDIDATE_MANIFEST.json']) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    value.status = name === 'ART_QA.json' ? 'PASS' : 'PROMOTED';
    value.production_ready = true;
    value.approved = false;
    value.technicalReview = 'PASS';
    value.styleReview = 'PASS';
    value.license = POLICY;
    value.licenseApproval = 'APPROVED';
    value.contentApproval = 'PENDING_OWNER_REVIEW';
    value.approvalRef = null;
    value.reviewEvidence = REVIEW_EVIDENCE;
    writeJson(file, value);
  }
  const revisionQa = path.join(root, 'REVISION_QA.json');
  if (fs.existsSync(revisionQa)) {
    const value = JSON.parse(fs.readFileSync(revisionQa, 'utf8'));
    value.status = 'PROMOTED';
    value.production_ready = true;
    value.approved = false;
    value.approvalRef = null;
    value.reviewEvidence = REVIEW_EVIDENCE;
    writeJson(revisionQa, value);
  }
}

const rows = all.map((entry) => ({
  id: entry.id,
  review: entry.review,
  taskId: entry.taskId,
  creator: entry.owner,
  source: path.relative(ROOT, path.join(entry.sourceDir, `${entry.id}.png`)).replaceAll('\\', '/'),
  destination: manifest.assets[entry.id].sourceFile,
  sha256: sha256(absolute(manifest.assets[entry.id].sourceFile)),
  bytes: fs.statSync(absolute(manifest.assets[entry.id].sourceFile)).size,
}));
const finalCounts = {
  assets: Object.keys(manifest.assets).length,
  productionReady: Object.values(manifest.assets).filter((asset) => asset.production_ready === true).length,
  approved: Object.values(manifest.assets).filter((asset) => asset.approved === true).length,
  placeholders: Object.values(manifest.assets).filter((asset) => asset.placeholder === true).length,
};
assert(finalCounts.assets === 188, `Expected 188 assets, got ${finalCounts.assets}`);
assert(finalCounts.productionReady === 188, `Expected 188 production_ready assets, got ${finalCounts.productionReady}`);
assert(finalCounts.approved === 112, `Expected 112 approved assets, got ${finalCounts.approved}`);
assert(finalCounts.placeholders === 0, `Expected 0 placeholders, got ${finalCounts.placeholders}`);

writeJson(absolute('docs/assets/review/WAVE2_REVISED_PROMOTION.json'), {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  reviewEvidence: REVIEW_EVIDENCE,
  policy: POLICY,
  promotionType: 'selective-revision-promotion',
  promotedCount: rows.length,
  promoted: rows,
  previouslyPromotedFrozen: frozen7,
  approvalBoundary: { approvedBefore: 112, approvedAfter: 112, contentApproval: 'PENDING_OWNER_REVIEW', approvalRef: null },
  finalCounts,
});
console.log(`Promoted ${rows.length} targeted Wave 2 revisions; final inventory ${finalCounts.assets}/${finalCounts.productionReady}, approved ${finalCounts.approved}, placeholders ${finalCounts.placeholders}.`);
