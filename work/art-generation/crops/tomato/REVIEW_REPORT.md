# ART-05 Tomato Revision 2 Review

Review scope: `work/art-generation/crops/tomato/**` only. No production source, manifest, atlas, renderer or runtime file was modified.

## Decision

- Technical contract: **PASS** ? 5/5 canonical IDs, 256?256 RGBA, transparent alpha, sourceScale 2, anchor `(0.5,0.9)`, render offset `(0,0)`, baseline `y=230`.
- Targeted alpha repair: **PASS** ? detached visible islands removed from seed, stage_1, stage_2 and stage_3; ready was not edited.
- Progression/identity: **PASS_PENDING_INTEGRATION_REVIEW** ? seed ? stage_1 ? stage_2 ? stage_3 ? ready remains coherent, with the same palette, branch/leaf language, fruit identity, perspective and lighting.
- Mobile readability: **PASS** at the reviewed runtime sizes.

## Targeted repair

Only the four failing stages were edited. The repair retained the main silhouette and translated it only as needed to restore the logical contact baseline: seed `+24 px`, stage_1 `+19 px`, stage_2 `+15 px`, stage_3 unchanged. The occupied contact row is `y=229` for all five frames, corresponding to logical baseline `y=230`. Ready was not regenerated or edited.

## Connected-component QA

- Connectivity: 8-neighbor.
- Runtime-visible threshold: alpha `>16`; lower-alpha anti-alias pixels are retained but are not classified as visible islands.
- Unexpected visible islands: `0` in all five stages.
- Dimensions/mode: 5/5 `256?256` RGBA.
- Alpha/background: transparent margins and no baked background.
- Evidence: `tomato-revision-qa-v2.json`, `tomato-runtime-review-v2.png`, `tomato-runtime-mobile-v2.png`.

## Promotion

`REVIEW` / **HOLD_PENDING_INTEGRATION_REVIEW**. `production_ready=false` and `approved=false` remain unchanged. The Integration Owner must complete cross-asset V2 review before promotion.
