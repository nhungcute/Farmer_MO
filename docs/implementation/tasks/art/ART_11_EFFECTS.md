# ART-11 - Effects Wave 2

| Field | Value |
|---|---|
| Task ID | ART-11 |
| Owner | Effects Asset Owner |
| Status | PROMOTED - REV-11 revision PASS |
| Workspace | work/art-generation/effects/** |
| Canonical count | 30 |
| Production path | assets-src/** (Integration Owner only) |

## Exact canonical scope

- fx_plant_00
- fx_plant_01
- fx_plant_02
- fx_plant_03
- fx_harvest_00
- fx_harvest_01
- fx_harvest_02
- fx_harvest_03
- fx_harvest_04
- fx_harvest_05
- fx_build_success_00
- fx_build_success_01
- fx_build_success_02
- fx_build_success_03
- fx_build_success_04
- fx_build_success_05
- fx_coin_gain_00
- fx_coin_gain_01
- fx_coin_gain_02
- fx_coin_gain_03
- fx_coin_gain_04
- fx_coin_gain_05
- fx_coin_gain_06
- fx_coin_gain_07
- fx_egg_collect_00
- fx_egg_collect_01
- fx_egg_collect_02
- fx_egg_collect_03
- fx_egg_collect_04
- fx_egg_collect_05

## Contract

Preserve canonical dimensions, RGBA alpha, anchor, source scale, atlas, FPS/frame order/events and continuity. Use truthful provenance and do not fabricate toolVersion. ART-13 owns the four crop_ready_glow frames as a separate effect; never bake them into crop artwork.

## QA handoff

Set status to REVIEW only when all 30 candidates and evidence exist. production_ready=true and approved=false after Integration Owner promotion; owner content/release approval is still pending.


Revision evidence: `work/art-generation/effects/REVISION_REPORT.md`, `work/art-generation/effects/reviews/REVISION_QA.json`, `docs/assets/review/WAVE2_TARGETED_REVISION_REVIEW.md`. REV-11 bloom/specular/halo reduction, family contracts and mobile readability PASS; all 30 frames were promoted by the Integration Owner.
