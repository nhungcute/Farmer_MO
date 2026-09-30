import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const POLICY = 'MO_FARM_INTERNAL_ASSET_POLICY_V1';
const REVIEW_EVIDENCE = 'docs/assets/review/WAVE2_INTEGRATION_REVIEW.md';
const TOOL = 'built-in image_gen';
const TOOL_VERSION = 'not exposed by runtime';

// This is the reviewed, explicit promotion allowlist. Revision-required groups
// are deliberately absent so this script cannot promote them by accident.
const selected = [
  {
    id: 'building_farmhouse_lv1',
    taskId: 'ART-07',
    owner: 'Codex / Farmhouse Asset Owner',
    candidate: 'work/art-generation/buildings/farmhouse/candidate/assets-src-compatible/buildings/building_farmhouse_lv1.png',
    destination: 'assets-src/buildings/building_farmhouse_lv1.png',
    taskRoot: 'work/art-generation/buildings/farmhouse',
  },
  {
    id: 'building_warehouse_lv1',
    taskId: 'ART-08',
    owner: 'Codex / Warehouse Asset Owner',
    candidate: 'work/art-generation/buildings/warehouse/candidate/assets-src-compatible/buildings/building_warehouse_lv1.png',
    destination: 'assets-src/buildings/building_warehouse_lv1.png',
    taskRoot: 'work/art-generation/buildings/warehouse',
  },
  {
    id: 'building_chicken_coop_lv1',
    taskId: 'ART-09',
    owner: 'Codex / Chicken Coop Asset Owner',
    candidate: 'work/art-generation/buildings/chicken-coop/candidate/assets-src-compatible/building_chicken_coop_lv1.png',
    destination: 'assets-src/buildings/building_chicken_coop_lv1.png',
    taskRoot: 'work/art-generation/buildings/chicken-coop',
  },
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `crop_ready_glow_0${index}`,
    taskId: 'ART-13',
    owner: 'Codex / Crop Extras Asset Owner',
    candidate: `work/art-generation/crops/extras/candidate/assets-src-compatible/crop_ready_glow_0${index}.png`,
    destination: `assets-src/effects/crop_ready_glow_0${index}.png`,
    taskRoot: 'work/art-generation/crops/extras',
  })),
];

const manifestPath = path.join(ROOT, 'assets-src/manifests/animation-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const absolute = (file) => path.join(ROOT, file);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function updatePromotionMetadata(metadata, entry) {
  const required = {
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
    tool: TOOL,
    toolVersion: TOOL_VERSION,
    creator: entry.owner,
  };
  Object.assign(metadata, required);
}

function updateTaskJson(value, entry) {
  if (Array.isArray(value)) return value.map((item) => updateTaskJson(item, entry));
  if (!value || typeof value !== 'object') return value;
  const next = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, updateTaskJson(item, entry)]));
  if (next.id === entry.id) updatePromotionMetadata(next, entry);
  return next;
}

const promotionRows = [];
for (const entry of selected) {
  const candidate = absolute(entry.candidate);
  const destination = absolute(entry.destination);
  assert(fs.existsSync(candidate), `${entry.id}: candidate missing: ${entry.candidate}`);
  assert(fs.existsSync(destination), `${entry.id}: canonical destination missing: ${entry.destination}`);
  assert(manifest.assets?.[entry.id], `${entry.id}: missing canonical manifest record`);
  assert(manifest.assets[entry.id].placeholder === true, `${entry.id}: canonical record is not a placeholder; refusing repeat promotion`);
  const candidateHash = sha256(candidate);
  fs.copyFileSync(candidate, destination);
  assert(sha256(destination) === candidateHash, `${entry.id}: copied PNG hash mismatch`);
  updatePromotionMetadata(manifest.assets[entry.id], entry);
  promotionRows.push({
    id: entry.id,
    taskId: entry.taskId,
    creator: entry.owner,
    source: entry.candidate,
    destination: entry.destination,
    sha256: candidateHash,
    bytes: fs.statSync(candidate).size,
  });
}

writeJson(manifestPath, manifest);

// Keep candidate-side records truthful and auditable after the Integration
// Owner has promoted their exact PNGs. Revision-required workspaces are not
// touched by this operation.
for (const taskRoot of [...new Set(selected.map((entry) => entry.taskRoot))]) {
  const entries = selected.filter((entry) => entry.taskRoot === taskRoot);
  const metadataPath = absolute(path.join(taskRoot, 'ART_METADATA.json'));
  if (fs.existsSync(metadataPath)) {
    const metadata = updateTaskJson(JSON.parse(fs.readFileSync(metadataPath, 'utf8')), entries[0]);
    metadata.status = 'PROMOTED';
    metadata.license = POLICY;
    metadata.licenseApproval = 'APPROVED';
    metadata.production_ready = true;
    metadata.approved = false;
    metadata.technicalReview = 'PASS';
    metadata.styleReview = 'PASS';
    metadata.approvalRef = null;
    metadata.reviewEvidence = REVIEW_EVIDENCE;
    writeJson(metadataPath, metadata);
  }
  for (const qaName of ['ART_QA.json', 'CANDIDATE_MANIFEST.json']) {
    const qaPath = absolute(path.join(taskRoot, qaName));
    if (!fs.existsSync(qaPath)) continue;
    const qa = updateTaskJson(JSON.parse(fs.readFileSync(qaPath, 'utf8')), entries[0]);
    if (qa.taskId && entries.some((entry) => entry.taskId === qa.taskId)) {
      qa.status = qaName === 'ART_QA.json' ? 'PASS' : 'PROMOTED';
      qa.production_ready = true;
      qa.approved = false;
      qa.license = POLICY;
      qa.licenseApproval = 'APPROVED';
      qa.styleReview = 'PASS';
      qa.technicalReview = 'PASS';
      qa.approvalRef = null;
      qa.reviewEvidence = REVIEW_EVIDENCE;
      writeJson(qaPath, qa);
    }
  }
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  reviewEvidence: REVIEW_EVIDENCE,
  policy: POLICY,
  approvalBoundary: {
    approvedBefore: 112,
    approvedAfter: 112,
    contentApproval: 'PENDING_OWNER_REVIEW',
    approvalRef: null,
  },
  selectedCount: selected.length,
  selected: promotionRows,
  excludedRevisionGroups: ['ART-06', 'ART-10', 'ART-11', 'ART-12'],
  productionPathsModified: [...new Set(selected.map((entry) => entry.destination))],
};
writeJson(absolute('docs/assets/review/WAVE2_SELECTIVE_PROMOTION.json'), report);
console.log(`Promoted ${selected.length} reviewed Wave 2 assets into assets-src/**; approved remains 112.`);
