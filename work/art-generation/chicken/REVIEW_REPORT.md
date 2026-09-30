# ART-01 Chicken Revision 2 Review

**Scope:** `work/art-generation/chicken/**` only. No `assets-src/**`, manifest, atlas, renderer or runtime file was changed.

## Decision

- Technical contract: **PASS** ? 92/92 canonical IDs, 256?256 RGBA, transparent alpha, baseline `y=230`, anchor `(0.5,0.9)`, four real directions, no mirror-only substitutions.
- Identity: **PASS** ? eye, comb, beak, wattle, wing/tail motifs, leg color, palette and silhouette remain one Chicken identity.
- Micro-detail: **PASS_PENDING_INTEGRATION_REVIEW** ? a deterministic low-pass/contrast reduction was applied consistently to all 92 frames; large feather groups remain readable at 100%, 75%, 50% and runtime farm scale.
- Shading: **PASS_PENDING_INTEGRATION_REVIEW** ? specular/high-frequency contrast is reduced while top-left lighting and bottom-right soft volume remain.
- WALK: **PASS_PENDING_INTEGRATION_REVIEW** ? six-frame contact/passing alternation is visible in NE/SE/SW/NW; frame count/FPS/loop contract is unchanged.
- EAT: **PASS_PENDING_INTEGRATION_REVIEW** ? frame 2 visibly reaches feed contact in all directions and keeps `FEED_CONSUMED@2`; 5 frames, 10 FPS, `loop=false`, `holdLast=true` remain unchanged.

## Revision scope

All 92 files received the same deterministic style correction because shading/detail consistency is a cross-state requirement. Motion geometry was changed only in the failing clips: 24 WALK frames and 20 EAT frames. IDLE, HAPPY, SLEEP and PRODUCT_READY motion poses were preserved; their pixels receive the shared style treatment. No new image-generation master was introduced and no canonical ID was changed.

## QA

- File count: 92/92.
- Dimensions/mode: 92/92 `256?256` RGBA.
- Alpha margins: 92/92 transparent margins; no baked background.
- Baseline: 92/92 at logical `y=230`.
- Direction scale proxy: max width deviation `1.23%`; max height deviation `0.67%`.
- EAT event: `FEED_CONSUMED@2` retained for NE/SE/SW/NW.
- Evidence: `candidate/reviews/state-direction-sheet-v2.png`, `walk-proof-v2.png`, `eat-proof-v2.png`, `runtime-size-sheet-v2.png`.

## Promotion

`REVIEW` / **HOLD_PENDING_INTEGRATION_REVIEW**. `production_ready=false` and `approved=false` remain unchanged. The Integration Owner must complete cross-asset V2 review before promotion.
