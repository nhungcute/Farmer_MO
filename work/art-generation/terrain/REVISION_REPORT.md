# REV-10 Terrain Revision 2

Status: REVIEW

## Scope

Re-rendered the same isometric grass tile with a wide source footprint. All five canonical IDs remain present and share the same geometry, palette, lighting direction, soil edge, flowers and grass motif. The source is normalized proportionally from an internal 2:1 render to the locked 256×128 RGBA contract; no runtime or CSS scaling is used.

## Results

- Canonical IDs: PASS (5/5; no additions or omissions).
- Dimensions and RGBA: PASS (5/5 at 256×128).
- Alpha occupancy: PASS; painted bounds fill at least 88% of both axes for every variant.
- Scale footprint: PASS; the prior 60.94% painted-width underfill is removed.
- Isometric 4×4 tiling: PASS at 128 px horizontal / 64 px vertical logical placement.
- Isometric 8×8 tiling: PASS at reduced runtime scale; no visible large gaps.
- Style and identity: PASS; same cozy bright 2.5D terrain, top-left lighting, bottom-right shadow, no glossy 3D or pixel treatment.
- Runtime readability: PASS at 100%, 75%, 50% and compact mobile scale.
- Production paths: PASS; `assets-src/**`, manifests and atlases were not modified.

## Evidence

- `reviews/terrain-single-tile-review-v2.png`
- `reviews/terrain-tiled-4x4-review-v2.png`
- `reviews/terrain-tiled-8x8-review-v2.png`
- `reviews/terrain-runtime-size-comparison-v2.png`
- `reviews/REVISION_QA.json`

The candidate remains under review and has not been promoted.
