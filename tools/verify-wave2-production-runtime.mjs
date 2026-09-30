import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { readPng, ROOT } from './export-assets/lib.mjs';

const selectedIds = [
  'building_farmhouse_lv1',
  'building_warehouse_lv1',
  'building_chicken_coop_lv1',
  'crop_ready_glow_00',
  'crop_ready_glow_01',
  'crop_ready_glow_02',
  'crop_ready_glow_03',
];
const sourceManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets-src/manifests/animation-manifest.json'), 'utf8'));
const runtimeManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps/web/public/assets/manifests/animation-manifest.json'), 'utf8'));
const licenses = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets-src/manifests/licenses.json'), 'utf8'));
const atlasRoot = path.join(ROOT, 'apps/web/public/assets/atlases');

function hash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function fail(message) {
  throw new Error(message);
}

const atlasPages = [];
for (const aggregateName of ['farm_common.json', 'effects.json']) {
  const aggregate = JSON.parse(fs.readFileSync(path.join(atlasRoot, aggregateName), 'utf8'));
  if (aggregate.pages) {
    for (const page of aggregate.pages) {
      const pageJson = JSON.parse(fs.readFileSync(path.join(atlasRoot, page.json), 'utf8'));
      atlasPages.push({ json: page.json, image: page.image, data: pageJson });
    }
  } else if (aggregate.frames) {
    atlasPages.push({ json: aggregateName, image: aggregate.meta.image, data: aggregate });
  }
}

function locateFrame(id) {
  for (const page of atlasPages) {
    if (page.data.frames?.[id]) return { page, frame: page.data.frames[id] };
  }
  return null;
}

const rows = selectedIds.map((id) => {
  const metadata = sourceManifest.assets?.[id];
  if (!metadata) fail(`${id}: missing source manifest record`);
  if (JSON.stringify(runtimeManifest.assets?.[id]) !== JSON.stringify(metadata)) fail(`${id}: runtime metadata mismatch`);
  if (metadata.placeholder !== false || metadata.production_ready !== true || metadata.approved !== false) {
    fail(`${id}: release boundary flags are invalid`);
  }
  if (metadata.technicalReview !== 'PASS' || metadata.styleReview !== 'PASS') fail(`${id}: review flags are not PASS`);
  if (licenses.assets?.[id]?.license !== metadata.license) fail(`${id}: license sidecar mismatch`);
  const sourcePath = path.join(ROOT, metadata.sourceFile);
  const source = readPng(sourcePath);
  if (source.width !== metadata.width || source.height !== metadata.height) fail(`${id}: source dimensions mismatch`);
  const located = locateFrame(id);
  if (!located) fail(`${id}: missing runtime atlas frame`);
  const { page, frame } = located;
  const atlasPath = path.join(atlasRoot, page.image);
  const atlas = readPng(atlasPath);
  const { x, y, w, h } = frame.frame;
  if (w !== source.width || h !== source.height || frame.trimmed || frame.rotated) fail(`${id}: atlas frame contract mismatch`);
  const extracted = Buffer.alloc(w * h * 4);
  for (let yy = 0; yy < h; yy += 1) {
    atlas.rgba.copy(extracted, yy * w * 4, ((y + yy) * atlas.width + x) * 4, ((y + yy) * atlas.width + x + w) * 4);
  }
  if (!extracted.equals(source.rgba)) fail(`${id}: atlas pixels differ from production source`);
  return {
    id,
    source: metadata.sourceFile,
    sourceSha256: hash(source.rgba),
    atlas: page.image,
    atlasFrame: frame.frame,
    dimensions: [source.width, source.height],
    rgba: true,
    exactSourceToAtlas: true,
  };
});

const animation = sourceManifest.animations?.crop_ready_glow;
if (JSON.stringify(animation) !== JSON.stringify(runtimeManifest.animations?.crop_ready_glow)) fail('crop_ready_glow runtime contract mismatch');
const clip = animation?.animations?.DEFAULT?.NONE;
if (clip?.fps !== 8 || clip?.loop !== false || clip?.holdLast !== false || clip?.frames?.length !== 4) {
  fail('crop_ready_glow animation contract changed');
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: selectedIds,
  selectedCount: selectedIds.length,
  rows,
  animationContract: { id: 'crop_ready_glow', frameCount: 4, fps: 8, loop: false, holdLast: false },
  result: 'PASS',
};
fs.writeFileSync(path.join(ROOT, 'docs/assets/review/WAVE2_PRODUCTION_RUNTIME_QA.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wave 2 production runtime QA PASS: ${rows.length}/${selectedIds.length} source-to-atlas frames exact; crop_ready_glow contract unchanged.`);
