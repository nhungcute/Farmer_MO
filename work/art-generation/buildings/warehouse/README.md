# ART-08 - Warehouse Wave 2

Status: REVIEW

Owner: Warehouse Asset Owner

This is an isolated Wave 2 generation workspace. It contains the exact canonical scope from assets-src/manifests/animation-manifest.json; no worker may write to assets-src/**, public atlases, shared manifests, gameplay, economy, renderer, Tutorial, Cloudflare, or RC01.

Canonical count: 1

Canonical IDs:

- building_warehouse_lv1

Shared style lock: read docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md and use approved Wave 1 Chicken/crop art as reference. Use 2.5D isometric, cozy bright cute cartoon, soft illustrated shading, top-left lighting, bottom-right shadow, transparent alpha, mobile readability, and no glossy 3D/pixel art.

Generation output remains under candidate/assets-src-compatible/** until Integration Owner review. Keep placeholder=false, production_ready=false, approved=false, and approvalRef=null until all task-local QA and later gates pass.

Candidate evidence: `reviews/QA.json` and `reviews/warehouse-candidate.png`. The source is a normalized built-in `image_gen` output; no production path, atlas, or manifest was changed.
