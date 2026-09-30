# MỠ FARM — Wave 2 Targeted Revision Review

This checkpoint covers only the 69 candidates that remained after the first
Wave 2 integration review. The seven already-promoted Wave 2 assets and all 112
Wave 1 assets remained frozen. Revision owners wrote only to their isolated
workspaces; no production source, manifest or atlas was changed during
revision or read-only review.

## Review result

| Review | Scope | Changed | Technical | Style | Runtime/mobile | Recommendation |
|---|---:|---:|---|---|---|---|
| REVIEW-06 Pond | 19 | 9 | PASS | PASS | PASS | PROMOTE |
| REVIEW-10 Terrain | 5 | 5 | PASS | PASS | PASS | PROMOTE |
| REVIEW-11 Effects | 30 | 30 | PASS | PASS | PASS | PROMOTE |
| REVIEW-12 UI | 15 | 15 | PASS | PASS | PASS | PROMOTE |

All four groups passed the targeted revision review. The Integration Owner may
promote all 69 candidates selectively in the separate production mutation.

## REV-06 Pond

The unchanged base supplies an explicit inner-water mask. Ripple and sparkle
alpha were clipped against a two-pixel eroded water region, rather than a
bounding box. All ten overlay frames report zero outside-mask alpha/pixels.
The 19 IDs, 512×384 RGBA contract, geometry, anchors and water/ripple/sparkle
timelines remain unchanged.

Evidence: `work/art-generation/pond/REVISION_QA.json`,
`work/art-generation/pond/reviews/pond-mask-review-v2.png`.

## REV-10 Terrain

All five 256×128 source tiles were reframed from the underfilled 60.94% width
to the locked footprint. Alpha occupancy reaches the full contract bounds and
the 4×4 and 8×8 isometric scenes show no visible gap or diagonal crack. DPR,
zoom and mobile readability evidence passes.

Evidence: `work/art-generation/terrain/REVISION_QA.json`,
`work/art-generation/terrain/reviews/terrain-tiled-4x4-review-v2.png`,
`work/art-generation/terrain/reviews/terrain-tiled-8x8-review-v2.png`.

## REV-11 Effects

All five canonical families retain their exact IDs and timing contracts:
Plant 4@12, Harvest 6@12, Build Success 6@12, Coin Gain 8@12 and Egg Collect
6@12; all remain non-looping with `holdLast=false`. Specular peaks, bloom/halo
alpha and near-black outline intensity were reduced across all 30 frames. The
crop-ready glow remains a separate ART-13 overlay.

Evidence: `work/art-generation/effects/reviews/REVISION_QA.json`,
`work/art-generation/effects/reviews/effects-revision-v2.png`.

## REV-12 UI

The exact 4×4 source-sheet order and 15 semantic IDs were regenerated as one
coherent set. Specular/bevel treatment, heavy shadow and dark outline were
reduced. All icons pass 128×128, 64×64 and 32×32 readability, alpha and
common padding/center-of-mass checks. The unused final source-sheet cell stays
transparent.

Evidence: `work/art-generation/ui/reviews/REVISION_QA.json`,
`work/art-generation/ui/reviews/ui-runtime-size-comparison-v2.png`.

## Promotion boundary

The 69 revision candidates passed the read-only review and were promoted into `assets-src/**` by the Integration Owner.
Their candidate workspaces remain auditable; canonical production metadata is `production_ready=true`, `approved=false` and `approvalRef=null`. Promotion, atlas rebuild and production runtime QA have completed. Wave 1 and the existing seven promoted Wave 2 assets remain byte-stable.


## Final promotion result

All 69 targeted revision candidates were promoted. Together with the frozen initial seven, Wave 2 is 76/76 technical/style promoted; no Wave 2 asset is content-approved or license-approved.
