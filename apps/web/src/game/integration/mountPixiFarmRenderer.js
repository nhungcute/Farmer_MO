import { PixiFarmRenderer } from '../pixi/PixiFarmRenderer.js';
import { mapBootstrapToWorld } from './mapBootstrapToWorld.js';

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
  try {
    await renderer.init();
    if (farm) renderer.setWorld(mapBootstrapToWorld(farm));
  } catch (error) {
    // An atlas/WebGL/init failure must not leave a live ticker or partially
    // attached canvas behind the shell's Canvas fallback.
    renderer.destroy();
    throw error;
  }

  const unsubscribers = [
    onCellSelected ? renderer.on('cellSelected', onCellSelected) : null,
    onObjectSelected ? renderer.on('objectSelected', onObjectSelected) : null,
    onAnimationEvent ? renderer.on('animationEvent', onAnimationEvent) : null,
  ].filter(Boolean);

  return {
    renderer,
    updateFarm(nextFarm) {
      const world = mapBootstrapToWorld(nextFarm);
      // Reconcile by entity ID after the first bootstrap so animation phases,
      // selection and existing Pixi containers survive gameplay mutations.
      if (renderer.world) renderer.syncWorld(world);
      else renderer.setWorld(world, { fit: false });
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
