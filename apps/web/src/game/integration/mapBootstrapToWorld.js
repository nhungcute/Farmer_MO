/**
 * Convert an API bootstrap DTO (or the web shell's normalized farm state) to
 * the renderer's deliberately small world model.  Keeping this boundary in
 * the integration layer prevents Pixi views from depending on API DTO names.
 */
import { adaptFarmToRenderWorld } from '../core/WorldAdapter.js';

const BUILDING_SIZES = Object.freeze({
  farmhouse_lv1: [3, 3],
  warehouse_lv1: [2, 2],
  pond_small_lv1: [2, 2],
  pond_small_lv1_base: [2, 2],
  chicken_coop_lv1: [3, 2],
});

function fromApiBootstrap(data) {
  if (!data?.farm || !Array.isArray(data.objects)) return data;

  const buildings = data.objects.map((object) => ({
    id: object.id,
    buildingId: object.definitionId,
    x: object.gridX,
    y: object.gridY,
    footprint: object.footprint || BUILDING_SIZES[object.definitionId] || [1, 1],
    level: object.level || 1,
  }));
  const crops = new Map((data.crops || []).map((crop) => [crop.plotId, crop]));
  const plots = (data.plots || []).map((plot) => {
    const crop = crops.get(plot.id);
    const readyAt = crop?.readyAt ? Date.parse(crop.readyAt) : null;
    return {
      id: plot.id,
      x: plot.gridX,
      y: plot.gridY,
      cropId: crop?.cropId || null,
      readyAt,
      plantedAt: crop?.plantedAt ?? null,
      stage: crop ? (readyAt !== null && readyAt <= Date.now() ? 'ready' : 'growing') : 'empty',
    };
  });
  const chickens = (data.animals || []).map((animal) => {
    const coop = buildings.find((building) => building.id === animal.buildingId);
    return {
      ...animal,
      x: coop ? coop.x + 1 : 1,
      y: coop ? coop.y + 1 : 1,
      direction: animal.direction || 'SE',
    };
  });

  return {
    buildings,
    plots,
    chickens,
  };
}

export function mapBootstrapToWorld(data, { width = 24, height = 24 } = {}) {
  // The web shell passes its normalized farm shape; direct callers may pass
  // the canonical API bootstrap shape. Both are accepted at this boundary.
  if (data && data.terrainAssetId && Array.isArray(data.buildings) && Array.isArray(data.crops) && Array.isArray(data.animals)) {
    return data;
  }
  return adaptFarmToRenderWorld(fromApiBootstrap(data), { width, height });
}
