const BUILDING_ASSETS = Object.freeze({
  farmhouse_lv1: 'building_farmhouse_lv1',
  building_farmhouse_lv1: 'building_farmhouse_lv1',
  warehouse_lv1: 'building_warehouse_lv1',
  building_warehouse_lv1: 'building_warehouse_lv1',
  chicken_coop_lv1: 'building_chicken_coop_lv1',
  building_chicken_coop_lv1: 'building_chicken_coop_lv1',
  pond_small: 'pond_small_lv1_base',
  pond_small_lv1: 'pond_small_lv1_base',
  pond_small_lv1_base: 'pond_small_lv1_base',
});

function cropStageAsset(cropId, stage) {
  if (!cropId || stage === 'empty') return null;
  const normalized = String(stage || '').toLowerCase();
  if (normalized === 'ready') return `crop_${cropId}_ready`;
  if (normalized === 'seed' || normalized === 'planted') return `crop_${cropId}_seed`;
  const match = normalized.match(/(?:stage[_-]?)?(\d+)/);
  if (match) return `crop_${cropId}_stage_${Math.max(1, Math.min(3, Number(match[1])))}`;
  return `crop_${cropId}_stage_1`;
}

export function adaptFarmToRenderWorld(farm, { width = 24, height = 24 } = {}) {
  const buildings = (farm?.buildings || []).map((building) => {
    const key = building.buildingId || building.definitionId || building.type;
    const isPond = String(key || '').includes('pond');
    return {
      id: building.id,
      kind: isPond ? 'pond' : 'building',
      assetId: BUILDING_ASSETS[key] || key,
      gridX: Number(building.x ?? building.gridX) || 0,
      gridY: Number(building.y ?? building.gridY) || 0,
      footprint: building.footprint || [1, 1],
      level: building.level || 1,
    };
  });

  const crops = (farm?.plots || []).map((plot) => ({
    id: plot.id,
    kind: 'crop',
    assetId: cropStageAsset(plot.cropId, plot.stage),
    cropId: plot.cropId,
    stage: plot.stage || 'empty',
    gridX: Number(plot.x ?? plot.gridX) || 0,
    gridY: Number(plot.y ?? plot.gridY) || 0,
    ready: String(plot.stage).toLowerCase() === 'ready',
  }));

  const animals = (farm?.chickens || []).map((chicken) => ({
    id: chicken.id,
    kind: 'chicken',
    animationId: 'animal_chicken',
    state: String(chicken.state || 'IDLE').toUpperCase(),
    direction: String(chicken.direction || 'SE').toUpperCase(),
    gridX: Number(chicken.x ?? chicken.gridX) || 0,
    gridY: Number(chicken.y ?? chicken.gridY) || 0,
  }));

  return {
    width,
    height,
    terrainAssetId: 'terrain_grass_tile',
    buildings,
    crops,
    animals,
  };
}

export function createRendererDemoWorld({ width = 24, height = 24, chickenCount = 24 } = {}) {
  const buildings = [
    { id: 'farmhouse-demo', kind: 'building', assetId: 'building_farmhouse_lv1', gridX: 7, gridY: 4, footprint: [3, 3] },
    { id: 'warehouse-demo', kind: 'building', assetId: 'building_warehouse_lv1', gridX: 13, gridY: 5, footprint: [3, 2] },
    { id: 'coop-demo', kind: 'building', assetId: 'building_chicken_coop_lv1', gridX: 17, gridY: 8, footprint: [3, 2] },
    { id: 'pond-demo', kind: 'pond', assetId: 'pond_small_lv1_base', gridX: 5, gridY: 16, footprint: [2, 2] },
  ];

  const crops = [
    ['rice', 'ready', 8, 11], ['rice', 'stage_3', 10, 11], ['corn', 'ready', 12, 11],
    ['carrot', 'stage_2', 8, 14], ['tomato', 'ready', 10, 14], ['corn', 'stage_1', 12, 14],
  ].map(([cropId, stage, gridX, gridY], index) => ({
    id: `crop-demo-${index + 1}`,
    kind: 'crop', cropId, stage, gridX, gridY,
    assetId: cropStageAsset(cropId, stage),
    ready: stage === 'ready',
  }));

  const directions = ['NE', 'SE', 'SW', 'NW'];
  const states = ['IDLE', 'WALK', 'IDLE', 'HAPPY', 'SLEEP', 'PRODUCT_READY'];
  const animals = Array.from({ length: chickenCount }, (_, index) => ({
    id: `chicken-demo-${index + 1}`,
    kind: 'chicken', animationId: 'animal_chicken',
    state: states[index % states.length],
    direction: directions[index % directions.length],
    gridX: 15 + (index % 6) * 0.45,
    gridY: 10 + (Math.floor(index / 6) % 6) * 0.45,
    phase: ((index * 37) % 100) / 100,
  }));

  return { width, height, terrainAssetId: 'terrain_grass_tile', buildings, crops, animals };
}
