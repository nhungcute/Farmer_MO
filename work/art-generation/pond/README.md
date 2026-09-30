# ART-06 - Pond Wave 2

Status: REVIEW

Owner: Pond Asset Owner

This is an isolated Wave 2 generation workspace. It contains the exact canonical scope from assets-src/manifests/animation-manifest.json; no worker may write to assets-src/**, public atlases, shared manifests, gameplay, economy, renderer, Tutorial, Cloudflare, or RC01.

Canonical count: 19

Canonical IDs:

- pond_small_lv1_base
- pond_small_lv1_water_00
- pond_small_lv1_water_01
- pond_small_lv1_water_02
- pond_small_lv1_water_03
- pond_small_lv1_water_04
- pond_small_lv1_water_05
- pond_small_lv1_water_06
- pond_small_lv1_water_07
- pond_small_lv1_ripple_00
- pond_small_lv1_ripple_01
- pond_small_lv1_ripple_02
- pond_small_lv1_ripple_03
- pond_small_lv1_ripple_04
- pond_small_lv1_ripple_05
- pond_small_lv1_sparkle_00
- pond_small_lv1_sparkle_01
- pond_small_lv1_sparkle_02
- pond_small_lv1_sparkle_03

Shared style lock: read docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md and use approved Wave 1 Chicken/crop art as reference. Use 2.5D isometric, cozy bright cute cartoon, soft illustrated shading, top-left lighting, bottom-right shadow, transparent alpha, mobile readability, and no glossy 3D/pixel art.

Generation output remains under candidate/assets-src-compatible/** until Integration Owner review. Keep placeholder=false, production_ready=false, approved=false, and approvalRef=null until all task-local QA and later gates pass.

Candidate evidence: `reviews/QA.json`, `reviews/pond-animation-candidates.png`, and `reviews/pond-composited-frames.png`. The pond base is generated with built-in `image_gen`; water/ripple/sparkle files are transparent animation overlays derived from that generated base. No production path, atlas, or manifest was changed.
