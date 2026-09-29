import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUTPUT_ROOT, readManifest, readPng, writeJson, writePng, ensureDir, fillRect, relativeToRoot } from './lib.mjs';

const manifest = readManifest();
const maxSize = manifest.atlasMaxSize ?? 2048;
const padding = manifest.atlasPadding ?? 2;
const atlasDir = path.join(OUTPUT_ROOT, 'atlases');
const manifestDir = path.join(OUTPUT_ROOT, 'manifests');
fs.rmSync(atlasDir, { recursive: true, force: true });
fs.rmSync(manifestDir, { recursive: true, force: true });
ensureDir(atlasDir);
ensureDir(manifestDir);

const pagesByGroup = {};

// Copy the source border into the atlas padding so linear filtering cannot
// sample transparent pixels or a neighbouring frame at the edge.
function fillRectWithExtrude(target, targetWidth, x, y, image, paddingSize) {
  fillRect(target, targetWidth, x, y, image);
  for (let distance = 1; distance <= paddingSize; distance += 1) {
    for (let sourceX = 0; sourceX < image.width; sourceX += 1) {
      const top = sourceX * 4;
      const bottom = ((image.height - 1) * image.width + sourceX) * 4;
      const targetTop = ((y - distance) * targetWidth + x + sourceX) * 4;
      const targetBottom = ((y + image.height - 1 + distance) * targetWidth + x + sourceX) * 4;
      image.rgba.copy(target, targetTop, top, top + 4);
      image.rgba.copy(target, targetBottom, bottom, bottom + 4);
    }
    for (let sourceY = 0; sourceY < image.height; sourceY += 1) {
      const left = (sourceY * image.width) * 4;
      const right = (sourceY * image.width + image.width - 1) * 4;
      const targetLeft = ((y + sourceY) * targetWidth + x - distance) * 4;
      const targetRight = ((y + sourceY) * targetWidth + x + image.width - 1 + distance) * 4;
      image.rgba.copy(target, targetLeft, left, left + 4);
      image.rgba.copy(target, targetRight, right, right + 4);
    }
    // Fill the four corner cells from the nearest source corner.
    const corners = [
      [0, 0, x - distance, y - distance],
      [image.width - 1, 0, x + image.width - 1 + distance, y - distance],
      [0, image.height - 1, x - distance, y + image.height - 1 + distance],
      [image.width - 1, image.height - 1, x + image.width - 1 + distance, y + image.height - 1 + distance],
    ];
    for (const [sourceX, sourceY, targetX, targetY] of corners) {
      const sourceOffset = (sourceY * image.width + sourceX) * 4;
      const targetOffset = (targetY * targetWidth + targetX) * 4;
      image.rgba.copy(target, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }
}

for (const [groupKey, group] of Object.entries(manifest.atlasGroups)) {
  const entries = Object.values(manifest.assets)
    .filter((asset) => asset.atlas === group)
    .sort((a, b) => a.height - b.height || a.width - b.width || a.id.localeCompare(b.id));
  if (!entries.length) throw new Error(`Atlas ${groupKey} không có frame`);
  const pages = [];
  let page = null;
  const makePage = () => ({ width: 0, height: 0, x: padding, y: padding, rowHeight: 0, frames: [], pixels: Buffer.alloc(maxSize * maxSize * 4) });
  const place = (asset, image) => {
    if (image.width + padding * 2 > maxSize || image.height + padding * 2 > maxSize) throw new Error(`${asset.id} vượt giới hạn atlas ${maxSize}`);
    if (!page) { page = makePage(); pages.push(page); }
    if (page.x + image.width + padding > maxSize) { page.x = padding; page.y += page.rowHeight + padding; page.rowHeight = 0; }
    if (page.y + image.height + padding > maxSize) { page = makePage(); pages.push(page); }
    const x = page.x; const y = page.y;
    fillRectWithExtrude(page.pixels, maxSize, x, y, image, padding);
    page.frames.push({ asset, x, y, width: image.width, height: image.height });
    page.x += image.width + padding;
    page.rowHeight = Math.max(page.rowHeight, image.height);
    page.width = Math.max(page.width, x + image.width + padding);
    page.height = Math.max(page.height, y + image.height + padding);
  };
  for (const asset of entries) {
    const image = readPng(path.resolve(ROOT, asset.sourceFile));
    place(asset, image);
  }
  pagesByGroup[groupKey] = [];
  for (let index = 0; index < pages.length; index += 1) {
    const current = pages[index];
    const width = Math.max(1, current.width);
    const height = Math.max(1, current.height);
    const compact = Buffer.alloc(width * height * 4);
    for (const entry of current.frames) {
      const image = readPng(path.resolve(ROOT, entry.asset.sourceFile));
      fillRectWithExtrude(compact, width, entry.x, entry.y, image, padding);
    }
    const stem = pages.length === 1 ? groupKey : `${groupKey}-${index}`;
    const imageName = `${stem}.png`;
    const jsonName = `${stem}.json`;
    writePng(path.join(atlasDir, imageName), width, height, compact);
    const pageJson = {
      frames: Object.fromEntries(current.frames.map(({ asset, x, y, width: frameWidth, height: frameHeight }) => [asset.id, {
        frame: { x, y, w: frameWidth, h: frameHeight }, rotated: false, trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: frameWidth, h: frameHeight }, sourceSize: { w: frameWidth, h: frameHeight }, pivot: asset.anchor,
      }])),
      meta: { app: 'MO Farm deterministic asset pipeline', version: '1.0', image: imageName, format: 'RGBA8888', size: { w: width, h: height }, scale: '1', padding },
    };
    writeJson(path.join(atlasDir, jsonName), pageJson);
    pagesByGroup[groupKey].push({ image: imageName, json: jsonName, width, height, frameIds: current.frames.map(({ asset }) => asset.id) });
  }
  if (pages.length > 1) writeJson(path.join(atlasDir, `${groupKey}.json`), { atlas: groupKey, pages: pagesByGroup[groupKey] });
}

const runtimeManifest = structuredClone(manifest);
runtimeManifest.generated = {
  generatedBy: 'tools/export-assets/pack.mjs',
  atlasDirectory: 'assets/atlases',
  pages: pagesByGroup,
};
writeJson(path.join(manifestDir, 'animation-manifest.json'), runtimeManifest);
console.log(`Đã pack ${Object.values(pagesByGroup).flat().length} atlas page vào ${relativeToRoot(atlasDir)}.`);
