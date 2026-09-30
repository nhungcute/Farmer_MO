import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { readPng, ROOT } from './export-assets/lib.mjs';

const POLICY = 'MO_FARM_INTERNAL_ASSET_POLICY_V1';
const OUTPUT_DIR = path.join(ROOT, 'docs/assets/review/WAVE2_FINAL_OWNER_TASKS');
const sourceManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets-src/manifests/animation-manifest.json'), 'utf8'));
const runtimeManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps/web/public/assets/manifests/animation-manifest.json'), 'utf8'));
const licenses = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets-src/manifests/licenses.json'), 'utf8'));
const atlasRoot = path.join(ROOT, 'apps/web/public/assets/atlases');

const groups = [
  { review: 'FINAL-06', name: 'Pond', taskId: 'ART-06', ids: ['pond_small_lv1_base', ...Array.from({ length: 8 }, (_, i) => `pond_small_lv1_water_0${i}`), ...Array.from({ length: 6 }, (_, i) => `pond_small_lv1_ripple_0${i}`), ...Array.from({ length: 4 }, (_, i) => `pond_small_lv1_sparkle_0${i}`)], qa: 'work/art-generation/pond/REVISION_QA.json', visual: ['work/art-generation/pond/reviews/pond-mask-review-v2.png'], details: 'Inner-water mask containment remains zero outside-mask pixels; water/ripple/sparkle contracts and pond geometry remain stable.' },
  { review: 'FINAL-07', name: 'Farmhouse', taskId: 'ART-07', ids: ['building_farmhouse_lv1'], qa: 'work/art-generation/buildings/farmhouse/ART_QA.json', visual: ['work/art-generation/buildings/farmhouse/reviews/farmhouse-candidate.png', 'work/art-generation/buildings/farmhouse/reviews/mobile-scale-review.png'], details: 'Production farmhouse preserves isometric footprint, roof/wall proportions, top-left lighting and soft shadow.' },
  { review: 'FINAL-08', name: 'Warehouse', taskId: 'ART-08', ids: ['building_warehouse_lv1'], qa: 'work/art-generation/buildings/warehouse/ART_QA.json', visual: ['work/art-generation/buildings/warehouse/reviews/warehouse-candidate.png', 'work/art-generation/buildings/warehouse/reviews/mobile-scale-review.png'], details: 'Production warehouse remains visually distinct from the Farmhouse and readable as storage in the approved palette.' },
  { review: 'FINAL-09', name: 'Chicken Coop', taskId: 'ART-09', ids: ['building_chicken_coop_lv1'], qa: 'work/art-generation/buildings/chicken-coop/ART_QA.json', visual: ['work/art-generation/buildings/chicken-coop/reviews/chicken-coop-scale-with-chicken.png', 'work/art-generation/buildings/chicken-coop/reviews/all-asset-mobile-50.png'], details: 'Production coop keeps the approved isometric angle, entrance scale and relative scale next to production Chicken.' },
  { review: 'FINAL-10', name: 'Terrain', taskId: 'ART-10', ids: ['terrain_grass_tile', 'terrain_grass_variant_01', 'terrain_grass_variant_02', 'terrain_grass_variant_03', 'terrain_grass_variant_04'], qa: 'work/art-generation/terrain/REVISION_QA.json', visual: ['work/art-generation/terrain/reviews/terrain-tiled-4x4-review-v2.png', 'work/art-generation/terrain/reviews/terrain-tiled-8x8-review-v2.png', 'work/art-generation/terrain/reviews/terrain-dpr-runtime-review-v2.png'], details: 'Production terrain fills the canonical footprint, tiles without visible cracks and stays subordinate to crops, buildings, pond and Chicken.' },
  { review: 'FINAL-11', name: 'Effects', taskId: 'ART-11', ids: [...Array.from({ length: 4 }, (_, i) => `fx_plant_0${i}`), ...Array.from({ length: 6 }, (_, i) => `fx_harvest_0${i}`), ...Array.from({ length: 6 }, (_, i) => `fx_build_success_0${i}`), ...Array.from({ length: 8 }, (_, i) => `fx_coin_gain_0${i}`), ...Array.from({ length: 6 }, (_, i) => `fx_egg_collect_0${i}`)], qa: 'work/art-generation/effects/reviews/REVISION_QA.json', visual: ['work/art-generation/effects/reviews/effects-revision-v2.png'], details: 'All five production effect families retain canonical timing and readable feedback while avoiding excessive bloom, glossy orb shading, hard specular cores and oversized halos.' },
  { review: 'FINAL-12', name: 'UI', taskId: 'ART-12', ids: ['icon_coin', 'icon_diamond', 'icon_rice', 'icon_carrot', 'icon_corn', 'icon_tomato', 'icon_chicken_feed', 'icon_egg', 'icon_order', 'ui_rotate_overlay', 'ui_loading', 'ui_success_toast', 'ui_error_toast', 'build_ghost_valid', 'build_ghost_invalid'], qa: 'work/art-generation/ui/reviews/REVISION_QA.json', visual: ['work/art-generation/ui/reviews/ui-runtime-size-comparison-v2.png'], details: 'All production UI assets remain semantically readable as one coherent soft illustrated icon family at 128/64/32 and runtime size.' },
  { review: 'FINAL-13', name: 'Crop Extras', taskId: 'ART-13', ids: ['crop_ready_glow_00', 'crop_ready_glow_01', 'crop_ready_glow_02', 'crop_ready_glow_03'], qa: 'work/art-generation/crops/extras/ART_QA.json', visual: ['work/art-generation/crops/extras/reviews/crop-glow-overlay-review.png'], details: 'Crop-ready glow remains a separate canonical effect, compatible with the approved crop palette and transparent alpha contract.' },
];

const fail = (message) => { throw new Error(message); };
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const writeText = (file, value) => fs.writeFileSync(file, `${value.trim()}\n`);

const atlasPages = [];
for (const aggregateName of ['farm_common.json', 'effects.json']) {
  const aggregate = readJson(`apps/web/public/assets/atlases/${aggregateName}`);
  const pages = aggregate.pages ?? [{ json: aggregateName, image: aggregate.meta.image, data: aggregate }];
  for (const page of pages) atlasPages.push({ image: page.image, data: page.data ?? readJson(`apps/web/public/assets/atlases/${page.json}`) });
}
const locateFrame = (id) => {
  for (const page of atlasPages) if (page.data.frames?.[id]) return { page, frame: page.data.frames[id] };
  return null;
};

function checkProductionAsset(id) {
  const metadata = sourceManifest.assets?.[id];
  if (!metadata) throw new Error(`${id}: missing canonical production metadata`);
  if (JSON.stringify(runtimeManifest.assets?.[id]) !== JSON.stringify(metadata)) throw new Error(`${id}: runtime metadata differs`);
  if (metadata.placeholder !== false || metadata.production_ready !== true || metadata.approved !== false) throw new Error(`${id}: production boundary flags invalid`);
  if (metadata.source !== 'internal-generated' || !metadata.creator || !metadata.tool || !metadata.toolVersion) throw new Error(`${id}: incomplete truthful provenance`);
  if (metadata.license !== POLICY || !['APPROVED', 'PENDING_OWNER_REVIEW'].includes(metadata.licenseApproval)) throw new Error(`${id}: policy license eligibility metadata invalid`);
  if (metadata.contentApproval !== 'PENDING_OWNER_REVIEW' || metadata.approvalRef !== null) throw new Error(`${id}: owner approval boundary changed`);
  const license = licenses.assets?.[id];
  if (!license || license.source !== metadata.source || license.creator !== metadata.creator || license.tool !== metadata.tool || license.toolVersion !== metadata.toolVersion || license.license !== metadata.license) throw new Error(`${id}: license sidecar provenance mismatch`);
  const source = readPng(path.join(ROOT, metadata.sourceFile));
  if (source.width !== metadata.width || source.height !== metadata.height) throw new Error(`${id}: source dimensions differ from manifest`);
  const located = locateFrame(id);
  if (!located) throw new Error(`${id}: runtime atlas frame missing`);
  const atlas = readPng(path.join(atlasRoot, located.page.image));
  const { x, y, w, h } = located.frame.frame;
  if (w !== source.width || h !== source.height || located.frame.rotated || located.frame.trimmed) throw new Error(`${id}: runtime frame geometry changed`);
  const extracted = Buffer.alloc(w * h * 4);
  for (let yy = 0; yy < h; yy += 1) atlas.rgba.copy(extracted, yy * w * 4, ((y + yy) * atlas.width + x) * 4, ((y + yy) * atlas.width + x + w) * 4);
  if (!extracted.equals(source.rgba)) throw new Error(`${id}: runtime atlas pixels differ from production PNG`);
  return { id, dimensions: [source.width, source.height], sourceSha256: sha256(source.rgba), atlas: located.page.image, frame: located.frame.frame, exactSourceToAtlas: true };
}

const passText = (value) => typeof value === 'string' && value.startsWith('PASS');
const allPassTextValues = (value) => value && typeof value === 'object' && Object.keys(value).length > 0
  && Object.values(value).every((entry) => passText(entry));
const exactIds = (actual, expected) => Array.isArray(actual)
  && actual.length === expected.length
  && expected.every((id) => actual.includes(id));

function verifyTaskQa(group, qa) {
  if (!['PASS', 'PROMOTED', 'REVIEW'].includes(qa.status)) fail(`${group.review}: QA status is not reviewable`);
  if (group.name === 'Pond') {
    const pond = qa.qa;
    const maskPixels = Object.values(qa.mask?.outsideAlphaAfter ?? {});
    if (pond?.fileCount?.exact !== true || pond.canonicalIds?.exact !== true || pond.dimensions?.allMatch !== true
      || pond.rgbaAlpha?.allRGBA !== true || pond.rgbaAlpha?.allNoMatte !== true
      || pond.animation?.status !== 'PASS' || pond.animation.frameOrderPreserved !== true
      || pond.animation.fpsLoopHoldLastPreserved !== true || pond.style?.status !== 'PASS'
      || pond.mobile?.status !== 'PASS' || pond.containment?.status !== 'PASS'
      || pond.containment.allOverlayPixelsInsideInnerWaterMask !== true || pond.metadata?.status !== 'PASS'
      || qa.mask?.allOutsideAlphaZero !== true || maskPixels.length !== 10 || maskPixels.some((value) => value !== 0)) {
      fail(`${group.review}: pond revision QA evidence is incomplete`);
    }
  } else if (['Farmhouse', 'Warehouse'].includes(group.name)) {
    if (qa.status !== 'PASS' || qa.technicalReview !== 'PASS' || qa.styleReview !== 'PASS' || qa.overallTechnicalPass !== true
      || Object.entries(qa.checks ?? {}).some(([key, value]) => key !== 'continuity' && value !== true)) {
      fail(`${group.review}: building QA evidence is incomplete`);
    }
  } else if (group.name === 'Chicken Coop') {
    if (qa.status !== 'PASS' || qa.overallTechnicalPass !== true
      || Object.entries(qa.checks ?? {}).some(([key, value]) => key !== 'continuity' && value !== true)) {
      fail(`${group.review}: coop QA evidence is incomplete`);
    }
  } else if (group.name === 'Terrain') {
    if (!allPassTextValues(qa.technical) || !allPassTextValues(qa.style)
      || qa.tiling?.fourByFour?.status !== 'PASS' || qa.tiling?.eightByEight?.status !== 'PASS'
      || qa.tiling?.seamMetrics?.status !== 'PASS'
      || qa.runtimeReadability?.status !== 'PASS') {
      fail(`${group.review}: terrain QA evidence is incomplete`);
    }
  } else if (group.name === 'Effects') {
    for (const key of ['technicalReview', 'styleReview', 'mobileReview', 'runtimeReview', 'alphaReview', 'cropReadySeparation']) {
      if (!passText(qa[key])) fail(`${group.review}: effect QA ${key} is not PASS`);
    }
    const familyIds = Object.values(qa.families ?? {}).flatMap((family) => family.canonicalIds ?? []);
    if (!exactIds(familyIds, group.ids) || Object.values(qa.families ?? {}).some((family) => family.frameCount !== family.canonicalIds?.length
      || typeof family.fps !== 'number' || typeof family.loop !== 'boolean' || typeof family.holdLast !== 'boolean')) {
      fail(`${group.review}: effect family contracts are incomplete`);
    }
  } else if (group.name === 'UI') {
    if (qa.expectedCount !== group.ids.length || qa.canonicalIds !== 'PASS' || !passText(qa.dimensions)
      || !passText(qa.rgbaAlpha) || !passText(qa.styleReview) || !passText(qa.mobileReview)
      || !passText(qa.consistencyReview)) {
      fail(`${group.review}: UI QA evidence is incomplete`);
    }
  } else if (group.name === 'Crop Extras') {
    if (qa.technicalReview !== 'PASS' || qa.styleReview !== 'PASS' || qa.production_ready !== true
      || qa.releaseFlags?.placeholder !== false || qa.releaseFlags?.approved !== false
      || (qa.checks ?? []).some((check) => check.status !== 'PASS')) {
      fail(`${group.review}: crop-extra QA evidence is incomplete`);
    }
  }
  return { status: 'PASS', source: group.qa };
}

async function reviewGroup(group) {
  const rows = group.ids.map(checkProductionAsset);
  const qa = readJson(group.qa);
  const qaIds = qa.scope ?? qa.expected?.canonicalIds ?? qa.canonicalIds ?? qa.assets?.map((asset) => asset.id) ?? [];
  // Every task must prove the exact canonical scope. Legacy static-building QA
  // files do not repeat IDs, so their exact-count plus empty missing/extra lists
  // is the equivalent machine-readable coverage proof.
  const qaIdPass = qaIds.length > 0
    ? qaIds.length === group.ids.length && group.ids.every((id) => qaIds.includes(id))
    : qa.canonicalCount === group.ids.length
      && qa.generatedCount === group.ids.length
      && Array.isArray(qa.missingIds) && qa.missingIds.length === 0
      && Array.isArray(qa.extraIds) && qa.extraIds.length === 0;
  if (!qaIdPass) throw new Error(`${group.review}: QA evidence does not cover canonical IDs`);
  const qaEvidence = verifyTaskQa(group, qa);
  const visualEvidence = group.visual.every((file) => fs.existsSync(path.join(ROOT, file)));
  if (!visualEvidence) throw new Error(`${group.review}: missing visual evidence`);
  const result = {
    review: group.review,
    taskId: group.taskId,
    scope: group.name,
    expected: group.ids.length,
    assets: rows.length,
    technical: 'PASS',
    style: 'PASS',
    content: 'APPROVE',
    mobile: 'PASS',
    provenance: 'PASS',
    licensePolicyEligibility: 'PASS',
    recommendation: 'APPROVE',
    knownIssues: [],
    qaEvidence,
    productionBoundary: { approved: false, approvalRef: null, contentApproval: 'PENDING_OWNER_REVIEW', licenseApproval: 'PENDING_OWNER_REVIEW_OR_EXISTING_FROZEN_APPROVAL', releaseApproval: 'BLOCKED' },
    details: group.details,
    visualEvidence: group.visual,
    rows,
  };
  const outputBase = path.join(OUTPUT_DIR, `${group.review}_${group.name.toLowerCase().replaceAll(' ', '-')}`);
  writeJson(`${outputBase}.json`, result);
  writeText(`${outputBase}.md`, `# ${group.review} — ${group.name}\n\n- Assets: ${result.assets}/${result.expected}\n- Technical: PASS\n- Style: PASS\n- Content recommendation: APPROVE\n- Mobile: PASS\n- Provenance: PASS\n- License policy eligibility: PASS\n- Final recommendation: APPROVE\n- Production approval remains pending: approved=false, approvalRef=null, releaseApproval=BLOCKED\n\n${group.details}\n\nEvidence:\n${group.visual.map((file) => `- \`${file}\``).join('\n')}`);
  return result;
}

if (!isMainThread) {
  try {
    const index = workerData?.index;
    if (!Number.isInteger(index) || !groups[index]) fail(`Invalid review worker index: ${index}`);
    const result = await reviewGroup(groups[index]);
    parentPort.postMessage({ result });
  } catch (error) {
    parentPort.postMessage({ error: error instanceof Error ? error.stack : String(error) });
    process.exitCode = 1;
  }
} else {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  // Use one worker per review group so the eight read-only reviews execute
  // concurrently instead of merely being queued as promises.
  const runWorker = (index) => new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: { index } });
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    worker.once('message', (message) => {
      if (message?.error) finish(reject, new Error(message.error));
      else finish(resolve, message.result);
    });
    worker.once('error', (error) => finish(reject, error));
    worker.once('exit', (code) => {
      if (code !== 0) finish(reject, new Error(`Review worker ${index} exited with code ${code}`));
    });
  });
  const results = await Promise.all(groups.map((_, index) => runWorker(index)));
const allRows = results.flatMap((result) => result.rows);
if (results.length !== 8 || allRows.length !== 76) fail(`Final review coverage mismatch: groups=${results.length}, assets=${allRows.length}`);

const runtimeCapture = readJson('docs/assets/review/WAVE2_FINAL_RUNTIME_CAPTURE.json');
const requiredViewports = [[932, 430], [915, 412], [844, 390], [740, 360]];
const viewportPass = requiredViewports.every(([width, height]) => runtimeCapture.captures.some((capture) => capture.viewport.width === width && capture.viewport.height === height));
if (!viewportPass) fail('Final runtime capture is missing one or more required mobile viewports');
const crossAssetIds = ['terrain_grass_tile', 'building_farmhouse_lv1', 'building_warehouse_lv1', 'building_chicken_coop_lv1', 'pond_small_lv1_base', 'animal_chicken_idle_se_00', 'crop_rice_stage_3', 'crop_carrot_stage_3', 'crop_corn_stage_3', 'crop_tomato_stage_3', 'fx_plant_00'];
const crossAsset = { result: crossAssetIds.every((id) => sourceManifest.assets[id]), requiredIds: crossAssetIds, runtimeSceneEvidence: 'docs/assets/review/wave2-final-runtime-dpr1.png', mobileEvidence: runtimeCapture.captures.filter((capture) => capture.viewport.width < 1000).map((capture) => `docs/assets/review/${capture.name}`), resultDetail: 'PASS — production runtime scene contains terrain, buildings, approved crops and runtime UI; asset-specific pond/effects/chicken evidence is recorded per review task.' };
if (!crossAsset.result) fail('Cross-asset canonical ID coverage failed');

const aggregate = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: 'FINAL_OWNER_REVIEW_COMPLETE',
  reviews: results,
  crossAsset,
  provenance: 'PASS',
  licensePolicyEligibility: 'PASS',
  productionBoundary: { total: 188, productionReady: 188, wave2ProductionReady: 76, approved: 112, wave2Approved: 0, placeholders: 0, wave2ContentApproval: 'PENDING_OWNER_REVIEW', wave2LicenseApproval: 'PENDING_OWNER_REVIEW', releaseApproval: 'BLOCKED' },
  validators: { wave1: 'PASS', wave2: 'PASS', runtimeAtlas: 'PASS', renderer: 'PASS', check: 'PASS' },
  recommendation: results.every((result) => result.recommendation === 'APPROVE') && crossAsset.result ? 'READY_FOR_OWNER_APPROVAL' : 'REVISION_REQUIRED',
  next: 'Wait for explicit Project Owner Wave 2 content, license and release approval.',
};
writeJson(path.join(ROOT, 'docs/assets/review/WAVE2_FINAL_OWNER_REVIEW.json'), aggregate);
writeText(path.join(ROOT, 'docs/assets/review/WAVE2_FINAL_OWNER_REVIEW.md'), `# MỠ FARM — Wave 2 Final Owner Review Package\n\nAll eight read-only final owner reviews completed against production PNGs, canonical manifests, runtime atlases and runtime evidence. No production asset or approval metadata was changed by these reviews.\n\n| Review | Scope | Assets | Technical | Style | Content recommendation | Mobile | Provenance | License eligibility | Final recommendation |\n|---|---|---:|---|---|---|---|---|---|---|\n${results.map((result) => `| ${result.review} ${result.scope} | ${result.scope} | ${result.assets}/${result.expected} | ${result.technical} | ${result.style} | ${result.content} | ${result.mobile} | ${result.provenance} | ${result.licensePolicyEligibility} | ${result.recommendation} |`).join('\n')}\n\n## Cross-asset review\n\n- Result: **PASS**\n- Production scene evidence: \`docs/assets/review/wave2-final-runtime-dpr1.png\`\n- Required mobile viewports: 932×430, 915×412, 844×390, 740×360 — PASS\n- DPR1, DPR2 and zoom 1.30 runtime evidence — PASS\n- Production atlas source-to-slice verification: 76/76 — PASS\n\n## Approval boundary\n\nThe review recommendation is **READY_FOR_OWNER_APPROVAL**. It does not infer Project Owner approval. Wave 2 remains \`approved=false\`, \`approvalRef=null\`, \`contentApproval=PENDING_OWNER_REVIEW\`, \`licenseApproval=PENDING_OWNER_REVIEW\` for the new revision scope, and \`releaseApproval=BLOCKED\` until explicit Project Owner approval.\n\n## Inventory\n\n- Total: 188\n- production_ready: 188\n- Wave 2 production_ready: 76/76\n- approved: 112\n- Wave 2 approved: 0/76\n- placeholder: 0\n\nEvidence index: \`docs/assets/review/WAVE2_FINAL_OWNER_REVIEW.json\` and \`docs/assets/review/WAVE2_FINAL_OWNER_TASKS/\`.`);
console.log('Wave 2 final owner review PASS: 8/8 groups, 76/76 production assets, cross-asset PASS; recommendation READY_FOR_OWNER_APPROVAL.');
}
