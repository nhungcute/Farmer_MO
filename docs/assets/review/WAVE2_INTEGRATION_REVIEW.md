# MỠ FARM — Wave 2 Integration Review

Review checkpoint for the 76 Wave 2 candidate assets. Reviewers were read-only
against `assets-src/**`, canonical manifests, atlases and production inventory.
The first review promoted 7 assets; the targeted revision checkpoint then
re-reviewed the remaining 69 candidates. No Wave 2 candidate is auto-approved
for release.

## Initial review results (before targeted revision)

| Review | Scope | Technical | Style | Content | Mobile | Animation | Recommendation |
|---|---:|---|---|---|---|---|---|
| REVIEW-06 Pond | 19/19 | PASS | PASS | PASS | PASS | FAIL | REVISION_REQUIRED |
| REVIEW-07 Farmhouse | 1/1 | PASS | PASS | PASS | PASS | N/A | PROMOTE |
| REVIEW-08 Warehouse | 1/1 | PASS | PASS | PASS | PASS | N/A | PROMOTE |
| REVIEW-09 Chicken Coop | 1/1 | PASS | PASS | PASS | PASS | N/A | PROMOTE |
| REVIEW-10 Terrain | 5/5 | PASS | PASS | PASS | PASS | N/A | REVISION_REQUIRED |
| REVIEW-11 Effects | 30/30 | PASS | FAIL | PASS | PASS | PASS | REVISION_REQUIRED |
| REVIEW-12 UI | 15/15 | PASS | FAIL | PASS | PASS | N/A | REVISION_REQUIRED |
| REVIEW-13 Crop Extras | 4/4 | PASS | PASS | PASS | PASS | PASS | PROMOTE |

### First-review blockers, now resolved in targeted revision

- **Pond:** ripple and sparkle overlays remain outside the inner water mask in
  several frames. The overlays stay inside the outer pond silhouette, but must
  be clipped/repositioned before promotion.
- **Terrain:** the painted tile occupies only 60.94% of the 256 px source width;
  a 5×4 logical isometric composition visibly underfills and gaps. Reframe the
  same art to the locked 256×128 footprint.
- **Effects:** `fx_build_success`, `fx_coin_gain` and `fx_egg_collect` have
  strong bloom/specular streaks and read as glossy 3D at runtime size. Reduce
  bloom/specular/halo by approximately 20–35% and re-review all five families.
- **UI:** semantics and 128/64/32 readability pass, but the icon sheet is
  glossier and more 3D, with darker outlines, than the approved Wave 1 soft
  illustrated direction. Rework the shading language without changing IDs or
  dimensions.

Farmhouse, Warehouse and Chicken Coop review evidence was corrected without
changing artwork pixels: stale building QA hashes were refreshed, and the Coop
received an explicit static contract and complete QA evidence.

## First selective promotion decision

Promote only the four passing groups:

- Farmhouse: 1
- Warehouse: 1
- Chicken Coop: 1
- Crop Extras: 4

First promotion scope: **7/76** candidates. Pond, Terrain, Effects and UI were
held for targeted revision at that checkpoint.

Promotion sets `placeholder=false`, `production_ready=true`,
`technicalReview=PASS`, `styleReview=PASS`, and the verified internal policy
license for the seven selected assets. `approved` remains false for every
Wave 2 asset and no `approvalRef` is invented.

## Targeted revision decision

The four read-only revision reviews all returned `PROMOTE` for the remaining 69 candidates. Pond (19), Terrain (5), Effects (30) and UI (15) were promoted by the Integration Owner after the production build and runtime gates. The final 188/188 inventory is recorded below.

## Evidence

- Cross-asset candidate scene: `wave2-cross-asset-review.png`
- Mobile candidate scene: `wave2-cross-asset-mobile.png`
- UI size review: `work/art-generation/ui/reviews/ui-runtime-size-comparison.png`
- Crop overlay review: `work/art-generation/crops/extras/reviews/crop-glow-overlay-review.png`
- Per-task review JSON/MD files are inside each task's `reviews/` directory.

## Gate state after targeted-revision promotion

```text
production inventory: 188
production_ready flag: 188 (112 approved Wave 1 + 76 Wave 2 technical/style pass)
status inventory: 188 production_ready, 112 approved, 0 placeholders
approved: 112
placeholders: 0
Wave 2 candidates promoted: 76 (7 initial + 69 targeted revision)
Wave 2 candidates reviewed after revision: 69 (Pond, Terrain, Effects, UI)
Wave 2 candidates awaiting selective promotion: 0
assets:build / strict validation: PASS
assets:validate:wave1: PASS
E01: CLOSED
RC01: CLOSED
```

Promotion evidence: `WAVE2_REVISED_PROMOTION.json`. All 69 targeted source PNGs were copied byte-for-byte from their reviewed workspaces, manifests/licenses were rebuilt, and runtime atlas entries were regenerated. `approved` remains 112; no Wave 2 content/release approval was invented.

Targeted revision evidence: `WAVE2_TARGETED_REVISION_REVIEW.md` and the four
workspace `REVIEW_RESULT_V2.json` files record PASS for all 69 candidates.

Production runtime evidence from the previous selective promotion:
`WAVE2_PRODUCTION_RUNTIME_QA.json` verifies all
7/7 source-to-atlas pixel slices, runtime/canonical metadata parity, sidecar
license parity, and the unchanged `crop_ready_glow` contract (4 frames, 8 FPS,
non-looping, no hold). Full asset validation, strict validation, renderer/API
check, Docker config/build, and Playwright desktop/mobile/PWA smoke gates pass.

## Final targeted-revision integration result

REV-06 Pond, REV-10 Terrain, REV-11 Effects and REV-12 UI all passed their read-only re-review and were promoted by the Integration Owner. The final canonical inventory is 188 assets with 188 `production_ready=true`, 112 `approved=true`, and 0 placeholders. `approved=true` remains limited to Wave 1; Wave 2 content, license and release approval are still pending.

Evidence: `docs/assets/review/WAVE2_TARGETED_REVISION_REVIEW.md`, `docs/assets/review/WAVE2_REVISED_PROMOTION.json`, `docs/assets/review/WAVE2_FINAL_PRODUCTION_RUNTIME_QA.json`, and `docs/assets/review/WAVE2_FINAL_RUNTIME_CAPTURE.json`.