import fs from 'node:fs';
import path from 'node:path';
import { MANIFEST_PATH, ROOT, SOURCE_ROOT, OUTPUT_ROOT, readManifest, readPng, readJson, relativeToRoot } from './lib.mjs';

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const manifest = readManifest();

if (manifest.contentVersion !== 'mvp-1') fail(`contentVersion phải là mvp-1, nhận ${manifest.contentVersion}`);
if (manifest.schemaVersion !== 1) fail(`schemaVersion chưa hỗ trợ: ${manifest.schemaVersion}`);
if (!manifest.atlasGroups || typeof manifest.atlasGroups !== 'object') fail('Thiếu atlasGroups');
if (!manifest.assets || typeof manifest.assets !== 'object') fail('Thiếu assets');
if (!manifest.animations || typeof manifest.animations !== 'object') fail('Thiếu animations');
if (!Number.isInteger(manifest.atlasMaxSize) || manifest.atlasMaxSize <= 0 || manifest.atlasMaxSize > 2048) fail('atlasMaxSize phải là số nguyên trong 1..2048');
if (!Number.isInteger(manifest.atlasPadding) || manifest.atlasPadding < 2 || manifest.atlasPadding > 4) fail('atlasPadding phải là số nguyên trong 2..4');

const assets = manifest.assets ?? {};
const groups = new Set(Object.values(manifest.atlasGroups ?? {}));
const sourcePaths = new Set();
const dimensions = new Map();
const idRegex = /^[a-z0-9][a-z0-9_]*$/;
for (const [id, asset] of Object.entries(assets)) {
  if (id !== asset.id) fail(`Asset id không khớp key: ${id}`);
  if (!idRegex.test(id)) fail(`Asset id sai format: ${id}`);
  if (!groups.has(asset.atlas)) fail(`${id}: atlas group không tồn tại: ${asset.atlas}`);
  if (!asset.sourceFile?.startsWith('assets-src/')) fail(`${id}: sourceFile phải nằm dưới assets-src/`);
  const absolute = path.resolve(ROOT, asset.sourceFile);
  if (!absolute.startsWith(`${SOURCE_ROOT}${path.sep}`)) fail(`${id}: sourceFile thoát khỏi assets-src`);
  if (sourcePaths.has(absolute)) fail(`Trùng sourceFile: ${asset.sourceFile}`);
  sourcePaths.add(absolute);
  if (!fs.existsSync(absolute)) { fail(`${id}: thiếu source ${asset.sourceFile}`); continue; }
  if (path.extname(absolute) !== '.png') fail(`${id}: source intermediate phải là PNG RGBA`);
  let image;
  try { image = readPng(absolute); } catch (error) { fail(`${id}: PNG không đọc được: ${error.message}`); continue; }
  dimensions.set(id, image);
  if (asset.width !== image.width || asset.height !== image.height) fail(`${id}: manifest ${asset.width}x${asset.height}, file ${image.width}x${image.height}`);
  if (!Number.isInteger(asset.width) || asset.width <= 0 || !Number.isInteger(asset.height) || asset.height <= 0) fail(`${id}: kích thước không hợp lệ`);
  if (!Number.isFinite(asset.sourceScale) || asset.sourceScale <= 0) fail(`${id}: sourceScale phải > 0`);
  if (asset.anchor?.x < 0 || asset.anchor?.x > 1 || asset.anchor?.y < 0 || asset.anchor?.y > 1) fail(`${id}: anchor phải trong 0..1`);
  for (const field of ['license', 'source', 'tool', 'toolVersion', 'creator']) {
    if (typeof asset[field] !== 'string' || asset[field].trim() === '') fail(`${id}: thiếu metadata ${field}`);
  }
  if (asset.placeholder !== true) warn(`${id}: asset chưa đánh dấu placeholder; cần license review trước production`);
}

const frameUse = new Set();
const validDirections = new Set(['NONE', 'NE', 'SE', 'SW', 'NW']);
function validateClip(animationId, state, direction, clip, animation) {
  if (!clip || !Array.isArray(clip.frames)) { fail(`${animationId}.${state}.${direction}: thiếu frames`); return; }
  const minimum = manifest.contracts?.minFrames?.[state] ?? manifest.contracts?.minFrames?.[animationId];
  if (minimum !== undefined && clip.frames.length < minimum) fail(`${animationId}.${state}.${direction}: cần ít nhất ${minimum} frame, nhận ${clip.frames.length}`);
  if (!Number.isFinite(clip.fps) || clip.fps <= 0) fail(`${animationId}.${state}.${direction}: fps phải > 0`);
  if (typeof clip.loop !== 'boolean' || typeof clip.holdLast !== 'boolean') fail(`${animationId}.${state}.${direction}: loop/holdLast phải là boolean`);
  const clipDimensions = [];
  clip.frames.forEach((frame, index) => {
    if (!frame?.id || !assets[frame.id]) { fail(`${animationId}.${state}.${direction}: frame ${index} không tồn tại: ${frame?.id}`); return; }
    frameUse.add(frame.id);
    clipDimensions.push(`${dimensions.get(frame.id)?.width}x${dimensions.get(frame.id)?.height}`);
    if (frame.durationMs !== undefined && (!Number.isFinite(frame.durationMs) || frame.durationMs <= 0)) fail(`${animationId}.${state}.${direction}: durationMs frame ${index} phải > 0`);
  });
  if (new Set(clipDimensions).size > 1) fail(`${animationId}.${state}.${direction}: các frame không cùng canvas`);
  if (clip.events !== undefined) {
    if (!Array.isArray(clip.events)) fail(`${animationId}.${state}.${direction}: events phải là mảng`);
    else for (const event of clip.events) {
      if (!Number.isInteger(event.frame) || event.frame < 0 || event.frame >= clip.frames.length) fail(`${animationId}.${state}.${direction}: event frame ngoài phạm vi`);
      if (!event.name || !idRegex.test(event.name.toLowerCase())) fail(`${animationId}.${state}.${direction}: event name không hợp lệ`);
    }
  }
}

for (const [animationId, animation] of Object.entries(manifest.animations ?? {})) {
  if (!groups.has(animation.atlas)) fail(`${animationId}: atlas group không tồn tại`);
  if (!Array.isArray(animation.directions) || animation.directions.length === 0) fail(`${animationId}: thiếu directions`);
  if (!animation.directions?.every((direction) => validDirections.has(direction))) fail(`${animationId}: direction không hợp lệ`);
  if (!animation.directions?.includes(animation.defaultDirection)) fail(`${animationId}: defaultDirection không nằm trong directions`);
  if (animation.anchor?.x < 0 || animation.anchor?.x > 1 || animation.anchor?.y < 0 || animation.anchor?.y > 1) fail(`${animationId}: anchor phải trong 0..1`);
  const states = animation.animations ?? {};
  if (!Object.keys(states).length) fail(`${animationId}: không có state`);
  for (const [state, byDirection] of Object.entries(states)) {
    if (!byDirection || typeof byDirection !== 'object') { fail(`${animationId}.${state}: direction map không hợp lệ`); continue; }
    const resolveDirection = (direction, seen = []) => {
      if (seen.includes(direction)) { fail(`${animationId}.${state}: vòng lặp mirror/fallback tại ${direction}`); return false; }
      const clip = byDirection[direction];
      if (!clip) return Boolean(byDirection.fallback || animation.fallback);
      if (clip.mirrorOf) return resolveDirection(clip.mirrorOf, [...seen, direction]);
      return Array.isArray(clip.frames) && clip.frames.length > 0;
    };
    for (const direction of animation.directions ?? []) {
      const clip = byDirection[direction];
      if (!clip) {
        const fallback = byDirection.fallback ?? animation.fallback;
        if (!fallback) fail(`${animationId}.${state}: thiếu direction ${direction} và fallback`);
        else if (!resolveDirection(typeof fallback === 'string' ? fallback : animation.defaultDirection)) fail(`${animationId}.${state}.${direction}: fallback không resolve được`);
        continue;
      }
      if (clip.mirrorOf) {
        if (!animation.mirrorAllowed) fail(`${animationId}.${state}.${direction}: mirrorAllowed=false`);
        if (!animation.directions.includes(clip.mirrorOf)) fail(`${animationId}.${state}.${direction}: mirrorOf không hợp lệ`);
        else resolveDirection(direction);
      } else validateClip(animationId, state, direction, clip, animation);
    }
  }
}

if (sourcePaths.size === 0) fail('Manifest không có source asset');
if (errors.length) {
  console.error(`Asset validation FAILED (${errors.length} lỗi):`);
  for (const message of errors) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log(`Asset validation PASS: ${Object.keys(assets).length} assets, ${Object.keys(manifest.animations).length} animations.`);
}
for (const message of warnings) console.warn(`Cảnh báo: ${message}`);
if (process.argv.includes('--strict-output')) {
  const outputManifest = path.join(OUTPUT_ROOT, 'manifests', 'animation-manifest.json');
  let runtimeManifest;
  if (!fs.existsSync(outputManifest)) {
    console.error(`Thiếu output manifest: ${relativeToRoot(outputManifest)}`);
    process.exitCode = 1;
  } else {
    try {
      runtimeManifest = readJson(outputManifest);
      if (runtimeManifest.contentVersion !== manifest.contentVersion || runtimeManifest.schemaVersion !== manifest.schemaVersion) {
        console.error('Output manifest không cùng content/schema version với source manifest');
        process.exitCode = 1;
      }
      if (Object.keys(runtimeManifest.assets ?? {}).length !== Object.keys(assets).length) {
        console.error('Output manifest không cùng số lượng asset với source manifest');
        process.exitCode = 1;
      }
    } catch (error) {
      console.error(`Output manifest không đọc được: ${error.message}`);
      process.exitCode = 1;
    }
  }
  const generated = manifest.atlasGroups ?? {};
  for (const group of Object.values(generated)) {
    const indexPath = path.join(OUTPUT_ROOT, 'atlases', `${group}.json`);
    if (!fs.existsSync(indexPath)) { console.error(`Thiếu atlas JSON: ${relativeToRoot(indexPath)}`); process.exitCode = 1; continue; }
    const index = readJson(indexPath);
    const pages = Array.isArray(index.pages) ? index.pages : [{ image: `${group}.png`, json: `${group}.json` }];
    const atlasFrameIds = new Set();
    const frameLocations = new Map();
    for (const page of pages) {
      const imagePath = path.join(OUTPUT_ROOT, 'atlases', page.image);
      const jsonPath = path.join(OUTPUT_ROOT, 'atlases', page.json);
      if (!fs.existsSync(imagePath) || !fs.existsSync(jsonPath)) { console.error(`Thiếu atlas page ${page.image}/${page.json}`); process.exitCode = 1; continue; }
      let atlasImage;
      try { atlasImage = readPng(imagePath); } catch (error) { console.error(`Atlas PNG hỏng ${page.image}: ${error.message}`); process.exitCode = 1; }
      let atlas;
      try { atlas = readJson(jsonPath); } catch (error) {
        console.error(`Atlas JSON hỏng ${page.json}: ${error.message}`);
        process.exitCode = 1;
        continue;
      }
      if (atlasImage && atlas.meta?.size && (atlas.meta.size.w !== atlasImage.width || atlas.meta.size.h !== atlasImage.height)) {
        console.error(`Atlas JSON size không khớp PNG: ${page.image}`);
        process.exitCode = 1;
      }
      for (const [id, entry] of Object.entries(atlas.frames ?? {})) {
        if (frameLocations.has(id)) {
          console.error(`Atlas ${group} trùng frame ${id} trong ${frameLocations.get(id)} và ${page.image}`);
          process.exitCode = 1;
        }
        frameLocations.set(id, page.image);
        atlasFrameIds.add(id);
        const frame = entry?.frame;
        if (!frame || !atlasImage || frame.x < 0 || frame.y < 0 || frame.w <= 0 || frame.h <= 0 || frame.x + frame.w > atlasImage.width || frame.y + frame.h > atlasImage.height) {
          console.error(`Frame ${id} vượt bounds atlas ${page.image}`); process.exitCode = 1;
        }
        const source = assets[id];
        if (source && frame && (frame.w !== source.width || frame.h !== source.height)) {
          console.error(`Frame ${id} sai kích thước so với manifest: ${frame.w}x${frame.h} != ${source.width}x${source.height}`);
          process.exitCode = 1;
        }
        const pivot = entry?.pivot;
        if (source && pivot && (pivot.x !== source.anchor.x || pivot.y !== source.anchor.y)) {
          console.error(`Frame ${id} sai pivot so với manifest`);
          process.exitCode = 1;
        }
      }
    }
    const expected = Object.values(assets).filter((asset) => asset.atlas === group).map((asset) => asset.id);
    for (const id of expected) if (!atlasFrameIds.has(id)) { console.error(`Atlas ${group} thiếu frame ${id}`); process.exitCode = 1; }
    for (const id of atlasFrameIds) if (!assets[id]) { console.error(`Atlas ${group} chứa frame không có trong manifest: ${id}`); process.exitCode = 1; }
  }
}
