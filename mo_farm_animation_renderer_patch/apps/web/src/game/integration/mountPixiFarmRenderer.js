import { PixiFarmRenderer } from '../pixi/PixiFarmRenderer.js';

/**
 * Conflict-safe integration helper for the current MO Farm web shell.
 * UI/API workstreams own farm state; this helper only mounts the renderer.
 */
export async function mountPixiFarmRenderer({
  host,
  farm,
  assetBase = './public/assets',
  debug = false,
  quality = 'HIGH',
  onCellSelected,
  onObjectSelected,
  onAnimationEvent,
} = {}) {
  const renderer = new PixiFarmRenderer({ host, assetBase, debug, quality });
  await renderer.init();
  if (farm) renderer.loadFarm(farm);

  const unsubscribers = [
    onCellSelected ? renderer.on('cellSelected', onCellSelected) : null,
    onObjectSelected ? renderer.on('objectSelected', onObjectSelected) : null,
    onAnimationEvent ? renderer.on('animationEvent', onAnimationEvent) : null,
  ].filter(Boolean);

  return {
    renderer,
    updateFarm(nextFarm) {
      renderer.loadFarm(nextFarm, { fit: false });
    },
    updateEntity(entity) {
      renderer.updateEntity(entity);
    },
    destroy() {
      for (const unsubscribe of unsubscribers) unsubscribe();
      renderer.destroy();
    },
  };
}
