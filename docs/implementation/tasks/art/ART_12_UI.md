# ART-12 - UI Wave 2

| Field | Value |
|---|---|
| Task ID | ART-12 |
| Owner | UI Asset Owner |
| Status | PROMOTED - REV-12 revision PASS |
| Workspace | work/art-generation/ui/** |
| Canonical count | 15 |
| Production path | assets-src/** (Integration Owner only) |
| Style guide | docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md |

## Exact canonical scope

- icon_coin
- icon_diamond
- icon_rice
- icon_carrot
- icon_corn
- icon_tomato
- icon_chicken_feed
- icon_egg
- icon_order
- ui_rotate_overlay
- ui_loading
- ui_success_toast
- ui_error_toast
- build_ghost_valid
- build_ghost_invalid

## Contract

Read the canonical metadata before generation. Preserve dimensions, RGBA alpha, anchor, source scale, atlas, FPS/frame order/events and animation continuity exactly as defined by the manifest. Do not invent IDs or gameplay. Use truthful provenance; do not fabricate toolVersion.

## QA handoff

Task-local QA must cover ID count, filenames, dimensions, RGBA/alpha, scale, lighting, perspective, style, mobile readability, continuity, and metadata. Set status to REVIEW only when all 15 canonical candidates and evidence exist. production_ready=true and approved=false after Integration Owner promotion; owner content/release approval is still pending.


Revision evidence: `work/art-generation/ui/REVISION_REPORT.md`, `work/art-generation/ui/reviews/REVISION_QA.json`, `docs/assets/review/WAVE2_TARGETED_REVISION_REVIEW.md`. REV-12 style, alpha and 128/64/32 runtime-size QA PASS; all 15 frames were promoted by the Integration Owner.
