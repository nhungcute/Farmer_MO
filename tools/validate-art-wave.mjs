import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));

const manifest = await readJson('assets-src/manifests/animation-manifest.json');
const chicken = manifest.animations.animal_chicken;
const expected = {
  'ART-01': {
    assetType: 'Chicken',
    workspace: 'work/art-generation/chicken',
    statusFile: 'docs/implementation/tasks/art/ART_01_CHICKEN.md',
    ids: Object.values(chicken.animations)
      .flatMap((directions) => Object.values(directions))
      .flatMap((clip) => clip.frames.map((frame) => frame.id)),
  },
  'ART-02': { assetType: 'Rice', workspace: 'work/art-generation/crops/rice', statusFile: 'docs/implementation/tasks/art/ART_02_RICE.md', ids: Object.keys(manifest.assets).filter((id) => id.startsWith('crop_rice_')) },
  'ART-03': { assetType: 'Carrot', workspace: 'work/art-generation/crops/carrot', statusFile: 'docs/implementation/tasks/art/ART_03_CARROT.md', ids: Object.keys(manifest.assets).filter((id) => id.startsWith('crop_carrot_')) },
  'ART-04': { assetType: 'Corn', workspace: 'work/art-generation/crops/corn', statusFile: 'docs/implementation/tasks/art/ART_04_CORN.md', ids: Object.keys(manifest.assets).filter((id) => id.startsWith('crop_corn_')) },
  'ART-05': { assetType: 'Tomato', workspace: 'work/art-generation/crops/tomato', statusFile: 'docs/implementation/tasks/art/ART_05_TOMATO.md', ids: Object.keys(manifest.assets).filter((id) => id.startsWith('crop_tomato_')) },
};

const failures = [];
for (const [taskId, task] of Object.entries(expected)) {
  const metadataPath = path.join(task.workspace, 'ART_METADATA.template.json');
  const readmePath = path.join(task.workspace, 'README.md');
  let metadata;
  try {
    metadata = await readJson(metadataPath);
  } catch (error) {
    failures.push(`${taskId}: cannot read ${metadataPath}: ${error.message}`);
    continue;
  }
  for (const requiredPath of [readmePath, task.statusFile]) {
    try {
      await readFile(path.join(root, requiredPath), 'utf8');
    } catch (error) {
      failures.push(`${taskId}: missing ${requiredPath}: ${error.message}`);
    }
  }
  if (metadata.taskId !== taskId) failures.push(`${taskId}: metadata taskId mismatch`);
  if (metadata.assetType !== task.assetType) failures.push(`${taskId}: metadata assetType mismatch`);
  if (JSON.stringify(metadata.assetIds) !== JSON.stringify(task.ids)) failures.push(`${taskId}: metadata IDs do not match canonical manifest order`);
  for (const field of ['source', 'creator', 'tool', 'toolVersion', 'license', 'contentVersion', 'styleGuideVersion', 'technicalReview', 'styleReview']) {
    if (!(field in metadata)) failures.push(`${taskId}: missing provenance/review field ${field}`);
  }
  if (metadata.placeholder !== true || metadata.production_ready !== false || metadata.approved !== false) {
    failures.push(`${taskId}: unsafe production flags in kickoff metadata`);
  }
  if (metadata.status !== 'RUNNING' || metadata.generationStatus !== 'QUEUED') {
    failures.push(`${taskId}: kickoff status must be RUNNING/QUEUED`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`ART WAVE 1 VALIDATION PASS: ${Object.keys(expected).length} isolated owners; ${Object.values(expected).reduce((total, task) => total + task.ids.length, 0)} canonical IDs; no production promotion`);
}
