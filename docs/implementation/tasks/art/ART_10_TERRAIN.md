# ART-10 - Terrain Wave 2

| Field | Value |
|---|---|
| Task ID | ART-10 |
| Owner | Terrain Asset Owner |
| Status | REVIEW - REVISION_REQUIRED |
| Workspace | work/art-generation/terrain/** |
| Canonical count | 5 |
| Production path | assets-src/** (Integration Owner only) |
| Style guide | docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md |

## Exact canonical scope

- terrain_grass_tile
- terrain_grass_variant_01
- terrain_grass_variant_02
- terrain_grass_variant_03
- terrain_grass_variant_04

## Contract

Read the canonical metadata before generation. Preserve dimensions, RGBA alpha, anchor, source scale, atlas, FPS/frame order/events and animation continuity exactly as defined by the manifest. Do not invent IDs or gameplay. Use truthful provenance; do not fabricate toolVersion.

## QA handoff

Task-local QA must cover ID count, filenames, dimensions, RGBA/alpha, scale, lighting, perspective, style, mobile readability, continuity, and metadata. Set status to REVIEW only when all 5 canonical candidates and evidence exist. production_ready and approved remain false until Integration Owner and owner release gates pass.
