import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { readPng, ROOT } from './export-assets/lib.mjs';

const sourceManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets-src/manifests/animation-manifest.json'), 'utf8'));
const runtimeManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps/web/public/assets/manifests/animation-manifest.json'), 'utf8'));
const licenses = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets-src/manifests/licenses.json'), 'utf8'));
const atlasRoot = path.join(ROOT, 'apps/web/public/assets/atlases');
const frozen7 = new Set(['building_farmhouse_lv1', 'building_warehouse_lv1', 'building_chicken_coop_lv1', 'crop_ready_glow_00', 'crop_ready_glow_01', 'crop_ready_glow_02', 'crop_ready_glow_03']);
const ids = Object.keys(sourceManifest.assets).filter((id) => !id.startsWith('animal_chicken_') && !/^crop_(rice|carrot|corn|tomato)_/.test(id));
const fail = (message) => { throw new Error(message); };
const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const atlasPages = [];
for (const aggregateName of ['farm_common.json', 'effects.json', 'chicken.json']) {
  const file = path.join(atlasRoot, aggregateName);
  if (!fs.existsSync(file)) continue;
  const aggregate = JSON.parse(fs.readFileSync(file, 'utf8'));
  const pages = aggregate.pages ?? [{ json: aggregateName, image: aggregate.meta.image, data: aggregate }];
  for (const page of pages) {
    const json = page.data ?? JSON.parse(fs.readFileSync(path.join(atlasRoot, page.json), 'utf8'));
    atlasPages.push({ json: page.json, image: page.image, data: json });
  }
}
const locateFrame = (id) => {
  for (const page of atlasPages) if (page.data.frames?.[id]) return { page, frame: page.data.frames[id] };
  return null;
};

const rows = ids.map((id) => {
  const metadata = sourceManifest.assets?.[id];
  if (!metadata) fail(`${id}: missing source metadata`);
  if (JSON.stringify(runtimeManifest.assets?.[id]) !== JSON.stringify(metadata)) fail(`${id}: runtime metadata mismatch`);
  if (metadata.placeholder !== false || metadata.production_ready !== true || metadata.approved !== true) fail(`${id}: production flags invalid`);
  if (metadata.technicalReview !== 'PASS' || metadata.styleReview !== 'PASS' || metadata.contentApproval !== 'APPROVED' || metadata.licenseApproval !== 'APPROVED' || metadata.releaseApproval !== 'APPROVED' || metadata.approvalRef !== 'docs/assets/approvals/WAVE2_PRODUCTION_ART_APPROVAL.md') fail(`${id}: release approval metadata invalid`);
  if (licenses.assets?.[id]?.license !== metadata.license) fail(`${id}: license sidecar mismatch`);
  const source = readPng(path.join(ROOT, metadata.sourceFile));
  if (source.width !== metadata.width || source.height !== metadata.height) fail(`${id}: source dimensions mismatch`);
  const located = locateFrame(id);
  if (!located) fail(`${id}: missing atlas frame`);
  const { page, frame } = located;
  const atlas = readPng(path.join(atlasRoot, page.image));
  const { x, y, w, h } = frame.frame;
  if (w !== source.width || h !== source.height || frame.trimmed || frame.rotated) fail(`${id}: atlas geometry mismatch`);
  const extracted = Buffer.alloc(w * h * 4);
  for (let yy = 0; yy < h; yy += 1) atlas.rgba.copy(extracted, yy * w * 4, ((y + yy) * atlas.width + x) * 4, ((y + yy) * atlas.width + x + w) * 4);
  if (!extracted.equals(source.rgba)) fail(`${id}: atlas pixels differ from source`);
  return { id, source: metadata.sourceFile, sourceSha256: hash(source.rgba), atlas: page.image, frame: frame.frame, dimensions: [source.width, source.height], rgba: true, exactSourceToAtlas: true, frozen: frozen7.has(id) };
});

const expectedContracts = {
  pond_water: [8, 12, true, false], pond_ripple: [6, 10, true, false], pond_sparkle: [4, 8, true, false],
  crop_ready_glow: [4, 8, false, false], fx_plant: [4, 12, false, false], fx_harvest: [6, 12, false, false],
  fx_build_success: [6, 12, false, false], fx_coin_gain: [8, 12, false, false], fx_egg_collect: [6, 12, false, false],
};
for (const [id, [count, fps, loop, holdLast]] of Object.entries(expectedContracts)) {
  const animation = sourceManifest.animations?.[id];
  if (JSON.stringify(animation) !== JSON.stringify(runtimeManifest.animations?.[id])) fail(`${id}: runtime contract mismatch`);
  const clip = animation?.animations?.DEFAULT?.NONE;
  if (!clip || clip.frames.length !== count || clip.fps !== fps || clip.loop !== loop || clip.holdLast !== holdLast) fail(`${id}: animation contract invalid`);
}
if (rows.length !== 76) fail(`Expected 76 Wave 2 runtime rows, found ${rows.length}`);

const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), scope: ids, selectedCount: ids.length, rows, contracts: expectedContracts, frozenPromotedCount: rows.filter((row) => row.frozen).length, result: 'PASS' };
fs.writeFileSync(path.join(ROOT, 'docs/assets/review/WAVE2_FINAL_PRODUCTION_RUNTIME_QA.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wave 2 final production runtime QA PASS: ${rows.length}/76 source-to-atlas frames exact; ${Object.keys(expectedContracts).length} contracts and ${report.frozenPromotedCount} frozen Wave 2 frames verified.`);
