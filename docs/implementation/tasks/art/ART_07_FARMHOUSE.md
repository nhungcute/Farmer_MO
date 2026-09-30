# ART-07 - Farmhouse Wave 2

| Field | Value |
|---|---|
| Task ID | ART-07 |
| Owner | Farmhouse Asset Owner |
| Status | REVIEW - PROMOTE_PENDING |
| Workspace | work/art-generation/buildings/farmhouse/** |
| Canonical count | 1 |
| Production path | assets-src/** (Integration Owner only) |
| Style guide | docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md |

## Exact canonical scope

- building_farmhouse_lv1

## Contract

Read the canonical metadata before generation. Preserve dimensions, RGBA alpha, anchor, source scale, atlas, FPS/frame order/events and animation continuity exactly as defined by the manifest. Do not invent IDs or gameplay. Use truthful provenance; do not fabricate toolVersion.

## QA handoff

Task-local QA must cover ID count, filenames, dimensions, RGBA/alpha, scale, lighting, perspective, style, mobile readability, continuity, and metadata. Set status to REVIEW only when all 1 canonical candidates and evidence exist. production_ready and approved remain false until Integration Owner and owner release gates pass.

Evidence: `work/art-generation/buildings/farmhouse/reviews/QA.json` and `farmhouse-candidate.png`. The candidate is a 512×384 RGBA PNG with sourceScale 2, anchor (0.5, 0.86), and atlas `farm_common`.
