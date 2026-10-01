function timestamp(value) {
  if (value === null || value === undefined || value === '') return NaN;
  return value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
}

/** Pure presentation only: harvest, rewards and inventory remain server-owned. */
export function cropPresentationAt(crop, now = Date.now()) {
  const cropId = crop?.cropId;
  if (!cropId) return { stage: 'empty', ready: false, assetId: null };
  const readyAt = timestamp(crop.readyAt);
  const plantedAt = timestamp(crop.plantedAt);
  const current = String(crop.stage || '').toLowerCase();
  let stage;
  if ((Number.isFinite(readyAt) && readyAt <= now) || current === 'ready') stage = 'ready';
  else if (Number.isFinite(plantedAt) && Number.isFinite(readyAt) && readyAt > plantedAt) {
    const progress = Math.max(0, (now - plantedAt) / (readyAt - plantedAt));
    stage = progress < 0.12 ? 'seed' : progress < 0.4 ? 'stage_1' : progress < 0.7 ? 'stage_2' : 'stage_3';
  } else if (current === 'empty') stage = 'empty';
  else if (current === 'seed' || current === 'planted') stage = 'seed';
  else {
    const number = current.match(/(?:stage[_-]?)?(\d)/)?.[1];
    stage = `stage_${number ? Math.max(1, Math.min(3, Number(number))) : 1}`;
  }
  return { stage, ready: stage === 'ready', assetId: stage === 'empty' ? null : `crop_${cropId}_${stage}` };
}
