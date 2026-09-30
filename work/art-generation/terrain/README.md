# ART-10 - Terrain Wave 2

Status: REVIEW (Revision 2 complete; Integration Owner review pending)

Owner: Terrain Asset Owner

This is an isolated Wave 2 generation workspace. It contains the exact canonical scope from assets-src/manifests/animation-manifest.json; no worker may write to assets-src/**, public atlases, shared manifests, gameplay, economy, renderer, Tutorial, Cloudflare, or RC01.

Canonical count: 5

Canonical IDs:

- terrain_grass_tile
- terrain_grass_variant_01
- terrain_grass_variant_02
- terrain_grass_variant_03
- terrain_grass_variant_04

Shared style lock: read docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md and use approved Wave 1 Chicken/crop art as reference. Use 2.5D isometric, cozy bright cute cartoon, soft illustrated shading, top-left lighting, bottom-right shadow, transparent alpha, mobile readability, and no glossy 3D/pixel art.

Generation output remains under candidate/assets-src-compatible/** until Integration Owner review. Keep placeholder=false, production_ready=false, approved=false, and approvalRef=null until all task-local QA and later gates pass.

Revision 2 evidence is in `REVISION_REPORT.md`, `REVISION_QA.json`, and `reviews/`. The wide source re-render fills the locked footprint and has been checked at 4×4 and 8×8 logical isometric tiling steps (128 px horizontal / 64 px vertical). No production asset, manifest, atlas, or runtime file was changed.
