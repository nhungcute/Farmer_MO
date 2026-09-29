import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { readPng, readJson, SOURCE_ROOT, ROOT } from './export-assets/lib.mjs';

const manifestPath = path.join(SOURCE_ROOT, 'manifests', 'animation-manifest.json');
const outputDirectory = path.join(ROOT, 'docs', 'assets');
const jsonOutput = path.join(outputDirectory, 'PRODUCTION_ASSET_INVENTORY.json');
const markdownOutput = path.join(outputDirectory, 'PRODUCTION_ASSET_INVENTORY.md');
const manifest = readJson(manifestPath);

const CATEGORY_ORDER = ['terrain', 'buildings', 'crops', 'animals', 'chicken', 'pond', 'effects', 'ui'];
const STATUS_ORDER = ['placeholder', 'production_ready', 'approved'];

function classifyAsset(id) {
  if (id.startsWith('terrain_')) return 'terrain';
  if (id.startsWith('building_')) return 'buildings';
  if (id.startsWith('crop_')) return 'crops';
  if (id.startsWith('animal_chicken_')) return 'chicken';
  if (id.startsWith('animal_')) return 'animals';
  if (id.startsWith('pond_')) return 'pond';
  if (id.startsWith('fx_')) return 'effects';
  if (id.startsWith('icon_') || id.startsWith('ui_') || id.startsWith('build_ghost_')) return 'ui';
  return null;
}

function classifyAnimation(id) {
  if (id === 'animal_chicken') return 'animals';
  if (id.startsWith('pond_')) return 'pond';
  if (id === 'crop_ready_glow') return 'crops';
  if (id.startsWith('fx_')) return 'effects';
  return null;
}

function statusFor(metadata) {
  if (metadata?.placeholder === true) return 'placeholder';
  if (metadata?.approved === true) return 'approved';
  return 'production_ready';
}

function relative(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function readSourceMetadata(id, metadata) {
  const sourceFile = path.resolve(ROOT, metadata.sourceFile);
  if (!fs.existsSync(sourceFile)) throw new Error(`Missing source file for ${id}: ${metadata.sourceFile}`);
  const png = readPng(sourceFile);
  const expected = { width: Number(metadata.width), height: Number(metadata.height) };
  if (png.width !== expected.width || png.height !== expected.height) {
    throw new Error(`Source dimensions differ for ${id}: manifest ${expected.width}x${expected.height}, PNG ${png.width}x${png.height}`);
  }
  return {
    sourceFile: metadata.sourceFile,
    canvas: expected,
    sourceScale: Number(metadata.sourceScale),
    anchor: { ...metadata.anchor },
    renderOffset: { ...metadata.renderOffset },
    license: metadata.license,
    source: metadata.source,
    placeholder: metadata.placeholder === true,
    tool: metadata.tool,
    toolVersion: metadata.toolVersion,
    creator: metadata.creator,
  };
}

function statusCounts(rows) {
  return Object.fromEntries(STATUS_ORDER.map((status) => [status, rows.filter((row) => row.status === status).length]));
}

const assets = Object.entries(manifest.assets || {}).map(([id, metadata]) => {
  const category = classifyAsset(id);
  if (!category) throw new Error(`Asset has no inventory category: ${id}`);
  const source = readSourceMetadata(id, metadata);
  return {
    id,
    category,
    status: statusFor(metadata),
    ...source,
    replacementInvariants: {
      id,
      frameCount: 1,
      frameIds: [id],
      directions: null,
      canvas: source.canvas,
      anchor: source.anchor,
      pivot: source.anchor,
      sourceScale: source.sourceScale,
      fps: null,
      loop: null,
      events: [],
      rgbaPng: true,
    },
  };
});

const assetById = new Map(assets.map((asset) => [asset.id, asset]));
const animations = Object.entries(manifest.animations || {}).map(([id, animation]) => {
  const category = classifyAnimation(id);
  if (!category) throw new Error(`Animation has no inventory category: ${id}`);
  const states = [];
  for (const [state, directions] of Object.entries(animation.animations || {})) {
    for (const [direction, clip] of Object.entries(directions || {})) {
      const frames = (clip.frames || []).map((frame) => typeof frame === 'string' ? frame : frame.id);
      for (const frameId of frames) {
        if (!assetById.has(frameId)) throw new Error(`Animation ${id} references missing asset ${frameId}`);
      }
      states.push({
        state,
        direction,
        frameCount: frames.length,
        frameIds: frames,
        fps: Number(clip.fps),
        loop: clip.loop !== false,
        holdLast: clip.holdLast === true,
        events: Array.isArray(clip.events) ? clip.events.map((event) => ({ ...event })) : [],
      });
    }
  }
  const frameAssets = [...new Set(states.flatMap((state) => state.frameIds))].map((frameId) => assetById.get(frameId));
  const canvasSizes = [...new Set(frameAssets.map((asset) => `${asset.canvas.width}x${asset.canvas.height}`))];
  const anchors = [...new Set(frameAssets.map((asset) => `${asset.anchor.x},${asset.anchor.y}`))];
  return {
    id,
    category,
    status: frameAssets.every((asset) => asset.status === 'approved') ? 'approved' : frameAssets.every((asset) => asset.status !== 'placeholder') ? 'production_ready' : 'placeholder',
    atlas: animation.atlas,
    directions: [...animation.directions],
    defaultDirection: animation.defaultDirection,
    sourceScale: Number(animation.sourceScale),
    anchor: { ...animation.anchor },
    pivot: { ...animation.anchor },
    mirrorAllowed: animation.mirrorAllowed === true,
    canvasSizes,
    frameAnchors: anchors,
    states,
    replacementInvariants: {
      id,
      atlas: animation.atlas,
      directions: [...animation.directions],
      defaultDirection: animation.defaultDirection,
      sourceScale: Number(animation.sourceScale),
      anchor: { ...animation.anchor },
      pivot: { ...animation.anchor },
      stateContracts: states.map(({ state, direction, frameCount, fps, loop, holdLast, events }) => ({ state, direction, frameCount, fps, loop, holdLast, events })),
    },
  };
});

const categories = Object.fromEntries(CATEGORY_ORDER.map((category) => {
  const categoryAssets = assets.filter((asset) => asset.category === category);
  const categoryAnimations = animations.filter((animation) => animation.category === category);
  const statuses = [...categoryAssets, ...categoryAnimations];
  return [category, {
    status: statuses.length && statuses.every((row) => row.status === 'approved')
      ? 'approved'
      : statuses.length && statuses.every((row) => row.status !== 'placeholder')
        ? 'production_ready'
        : 'placeholder',
    assetCount: categoryAssets.length,
    animationCount: categoryAnimations.length,
    assetIds: categoryAssets.map((asset) => asset.id),
    animationIds: categoryAnimations.map((animation) => animation.id),
    statusCounts: statusCounts(statuses),
  }];
}));

const replacementContract = {
  statusDefinitions: {
    placeholder: 'Generated/internal art. Not eligible for production release.',
    production_ready: 'Replacement art supplied with license, style, technical validation, and source evidence; explicit content approval is still pending.',
    approved: 'Production-ready replacement explicitly approved for the target release.',
  },
  invariants: [
    'Keep every asset ID and animation ID exactly unchanged.',
    'Keep atlas group, state names, direction names, default direction, and frame ordering unchanged.',
    'Keep every static source canvas width and height unchanged; use RGBA PNG with no accidental crop or trim.',
    'Keep sourceScale, anchor, pivot, renderOffset, and logical footprint unchanged unless renderer review explicitly approves the change.',
    'Keep every animation frame count, FPS, loop flag, holdLast flag, and event name/frame unchanged.',
    'Keep FEED_CONSUMED on the canonical EAT frame and preserve all one-shot effect timing.',
    'Replace source PNGs only; regenerate atlas JSON/PNG and preview through the existing deterministic pipeline.',
    'Record license, source URL or internal source reference, creator, tool/version, and review evidence before status changes.',
    'Do not mark an asset approved merely because it passes technical validation; art/style/license review is separate.',
  ],
  requiredEvidence: ['sourceFile', 'license', 'creator', 'styleReview', 'technicalReview', 'approvalRef'],
};

const inventory = {
  inventoryVersion: 1,
  generatedBy: 'tools/asset-inventory.mjs',
  contentVersion: manifest.contentVersion,
  schemaVersion: manifest.schemaVersion,
  manifestPath: relative(manifestPath),
  manifestSha256: createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex'),
  counts: {
    assets: assets.length,
    animations: animations.length,
    categories: CATEGORY_ORDER.length,
    statusCounts: statusCounts(assets),
    allCurrentAssetsPlaceholder: assets.every((asset) => asset.status === 'placeholder'),
  },
  categories,
  assets,
  animations,
  replacementContract,
  validationCommands: [
    'node tools/asset-inventory.mjs',
    'node tools/export-assets/index.mjs validate',
    'node tools/export-assets/index.mjs pack',
    'node tools/export-assets/validate.mjs --strict-output',
    'node tools/check-renderer-syntax.mjs',
    'npm run check',
  ],
};

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.value(row)).replaceAll('|', '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

const categoryDescriptions = {
  terrain: 'Isometric ground tile and variants.',
  buildings: 'Farmhouse, warehouse, and chicken coop static views.',
  crops: 'Crop stages plus the ready-crop glow animation.',
  animals: 'Runtime animal animation contracts; the current MVP species is chicken.',
  chicken: 'Chicken frame PNG sources for all six states and four directions.',
  pond: 'Pond base and water/ripple/sparkle layers.',
  effects: 'Plant, harvest, build, coin, and egg one-shot effects.',
  ui: 'HUD icons, loading/toast graphics, and build ghost states.',
};

const markdown = [
  '# B01 Production Asset Inventory',
  '',
  `Canonical source: \`${inventory.manifestPath}\` (SHA-256 \`${inventory.manifestSha256}\`).`,
  '',
  'This inventory is generated from the current canonical manifest. Every current source asset is an internal deterministic placeholder and remains ineligible for production approval until replaced and reviewed.',
  '',
  '## Status',
  '',
  markdownTable([
    { status: 'placeholder', count: inventory.counts.statusCounts.placeholder, meaning: inventory.replacementContract.statusDefinitions.placeholder },
    { status: 'production_ready', count: inventory.counts.statusCounts.production_ready, meaning: inventory.replacementContract.statusDefinitions.production_ready },
    { status: 'approved', count: inventory.counts.statusCounts.approved, meaning: inventory.replacementContract.statusDefinitions.approved },
  ], [{ label: 'Status', value: (row) => `\`${row.status}\`` }, { label: 'Current count', value: (row) => row.count }, { label: 'Meaning', value: (row) => row.meaning }]),
  '',
  `Current totals: **${assets.length} source assets**, **${animations.length} animation contracts**, **${CATEGORY_ORDER.length} categories**.`,
  '',
  '## Category summary',
  '',
  markdownTable(CATEGORY_ORDER.map((category) => ({ category, ...categories[category] })), [
    { label: 'Category', value: (row) => `\`${row.category}\`` },
    { label: 'Status', value: (row) => `\`${row.status}\`` },
    { label: 'Assets', value: (row) => row.assetCount },
    { label: 'Animations', value: (row) => row.animationCount },
    { label: 'Scope', value: (row) => categoryDescriptions[row.category] },
  ]),
  '',
  'The `animals` row records the runtime contract (`animal_chicken`); the `chicken` row records its concrete frame sources. This separation leaves room for future animal species without changing the current chicken IDs.',
  '',
  '## Complete asset inventory',
  '',
  markdownTable(assets, [
    { label: 'ID', value: (row) => `\`${row.id}\`` },
    { label: 'Category', value: (row) => row.category },
    { label: 'Status', value: (row) => `\`${row.status}\`` },
    { label: 'Canvas', value: (row) => `${row.canvas.width}×${row.canvas.height}` },
    { label: 'Anchor/Pivot', value: (row) => `${row.anchor.x},${row.anchor.y}` },
    { label: 'Source', value: (row) => `\`${row.sourceFile}\`` },
  ]),
  '',
  '## Animation contracts',
  '',
  markdownTable(animations, [
    { label: 'Animation', value: (row) => `\`${row.id}\`` },
    { label: 'Category', value: (row) => row.category },
    { label: 'Status', value: (row) => `\`${row.status}\`` },
    { label: 'Atlas', value: (row) => row.atlas },
    { label: 'Directions', value: (row) => row.directions.join(', ') },
    { label: 'Canvas sizes', value: (row) => row.canvasSizes.join(', ') },
    { label: 'Anchor/Pivot', value: (row) => `${row.anchor.x},${row.anchor.y}` },
  ]),
  '',
  ...animations.flatMap((animation) => [
    `### \`${animation.id}\``,
    '',
    markdownTable(animation.states, [
      { label: 'State', value: (row) => row.state },
      { label: 'Direction', value: (row) => row.direction },
      { label: 'Frames', value: (row) => row.frameCount },
      { label: 'FPS', value: (row) => row.fps },
      { label: 'Loop', value: (row) => row.loop },
      { label: 'Hold last', value: (row) => row.holdLast },
      { label: 'Events', value: (row) => row.events.length ? row.events.map((event) => `${event.name}@${event.frame}`).join(', ') : '—' },
    ]),
    '',
  ]),
  '## Replacement invariants',
  '',
  ...inventory.replacementContract.invariants.map((invariant) => `- ${invariant}`),
  '',
  'Required evidence for `production_ready` or `approved`:',
  '',
  ...inventory.replacementContract.requiredEvidence.map((evidence) => `- \`${evidence}\``),
  '',
  '## Production replacement order',
  '',
  '1. Lock the art direction and palette against `assets-src/style/style-sheet.md`.',
  '2. Replace terrain first, then buildings and pond layers so the world silhouette and depth anchors are stable.',
  '3. Replace crop stage art, preserving the seed → stage 1 → stage 2 → stage 3 → ready sequence.',
  '4. Replace all chicken states and directions as one review batch; do not mix placeholder and production frames within a state/direction contract.',
  '5. Replace one-shot effects and UI icons after world scale is approved.',
  '6. Attach license/style/technical evidence, update status metadata, regenerate atlases, and run the full validation sequence.',
  '',
  '## Validation commands',
  '',
  'Run from the repository root after every replacement batch:',
  '',
  '```powershell',
  ...inventory.validationCommands,
  '```',
  '',
  'A technically valid atlas is not approval evidence. Production release also requires explicit art/style/license review for every non-placeholder asset.',
  '',
].join('\n');

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(jsonOutput, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
fs.writeFileSync(markdownOutput, markdown, 'utf8');

console.log(`Asset inventory PASS: ${assets.length} assets, ${animations.length} animations, ${CATEGORY_ORDER.length} categories.`);
console.log(`Current statuses: ${JSON.stringify(inventory.counts.statusCounts)}`);
console.log(`Wrote ${relative(jsonOutput)} and ${relative(markdownOutput)}.`);

// Make direct execution and accidental imports behave consistently.
if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) process.exitCode = 0;
