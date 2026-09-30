# ART-10 - Terrain Wave 2

Status: REVIEW

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
