# ART-06 - Pond Wave 2

| Field | Value |
|---|---|
| Task ID | ART-06 |
| Owner | Pond Asset Owner |
| Status | REVIEW |
| Workspace | work/art-generation/pond/** |
| Canonical count | 19 |
| Production path | assets-src/** (Integration Owner only) |
| Style guide | docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md |

## Exact canonical scope

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

## Contract

Read the canonical metadata before generation. Preserve dimensions, RGBA alpha, anchor, source scale, atlas, FPS/frame order/events and animation continuity exactly as defined by the manifest. Do not invent IDs or gameplay. Use truthful provenance; do not fabricate toolVersion.

## QA handoff

Task-local QA must cover ID count, filenames, dimensions, RGBA/alpha, scale, lighting, perspective, style, mobile readability, continuity, and metadata. Set status to REVIEW only when all 19 canonical candidates and evidence exist. production_ready and approved remain false until Integration Owner and owner release gates pass.

Evidence: `work/art-generation/pond/reviews/QA.json`, `pond-animation-candidates.png`, and `pond-composited-frames.png`. All 19 IDs are present with 512×384 RGBA PNGs, exact manifest order, sourceScale 2, anchor (0.5, 0.86), atlas `farm_common`, and animation timing preserved.
