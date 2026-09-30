# ART-13 - Crop Extras Wave 2

| Field | Value |
|---|---|
| Task ID | ART-13 |
| Owner | Crop Extras Asset Owner |
| Status | REVIEW |
| Workspace | work/art-generation/crops/extras/** |
| Canonical count | 4 |
| Production path | assets-src/** (Integration Owner only) |

## Exact canonical scope

- crop_ready_glow_00
- crop_ready_glow_01
- crop_ready_glow_02
- crop_ready_glow_03

## Contract

Preserve canonical dimensions, RGBA alpha, anchor, source scale, atlas, FPS/frame order/events and continuity. Use truthful provenance and do not fabricate toolVersion. ART-13 owns the four crop_ready_glow frames as a separate effect; never bake them into crop artwork.

## QA handoff

Set status to REVIEW only when all 4 candidates and evidence exist. production_ready and approved remain false until Integration Owner and owner release gates pass.
