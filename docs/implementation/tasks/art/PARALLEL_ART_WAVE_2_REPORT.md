# Parallel Art Wave 2

Owner decision: Wave 2 OPEN. Eight isolated owner contracts ran in parallel against the canonical manifest and are now at the review checkpoint.

Wave 1 remains frozen at 112 production_ready and 112 approved. No worker writes assets-src/**; Integration Owner alone may promote candidates.

| Task | Expected | Generated | Status | Workspace |
|---|---:|---:|---|---|
| ART-06 POND | 19 | 19 | REVIEW / REVISION_REQUIRED | work/art-generation/pond |
| ART-07 FARMHOUSE | 1 | 1 | REVIEW / PROMOTE_PENDING | work/art-generation/buildings/farmhouse |
| ART-08 WAREHOUSE | 1 | 1 | REVIEW / PROMOTE_PENDING | work/art-generation/buildings/warehouse |
| ART-09 CHICKEN COOP | 1 | 1 | REVIEW / PROMOTE_PENDING | work/art-generation/buildings/chicken-coop |
| ART-10 TERRAIN | 5 | 5 | REVIEW / REVISION_REQUIRED | work/art-generation/terrain |
| ART-11 EFFECTS | 30 | 30 | REVIEW / REVISION_REQUIRED | work/art-generation/effects |
| ART-12 UI | 15 | 15 | REVIEW / REVISION_REQUIRED | work/art-generation/ui |
| ART-13 CROP EXTRAS | 4 | 4 | REVIEW / PROMOTE_PENDING | work/art-generation/crops/extras |

Total Wave 2 generation progress: **76/76**. Integration review is complete: 4 groups are promotion candidates and 4 groups require revision.

The pre-review integration QA is recorded in `work/art-generation/WAVE2_CANDIDATE_QA.json`: exact canonical IDs, dimensions, RGBA/true alpha, transparent pixels without hidden RGB matte, truthful provenance, and release flags all pass. Review sheets remain under each task's `reviews/` directory.

Integration review decision and blockers are recorded in `docs/assets/review/WAVE2_INTEGRATION_REVIEW.md`. Selective promotion is limited to Farmhouse, Warehouse, Chicken Coop and Crop Extras (7/76); Pond, Terrain, Effects and UI remain unpromoted pending revision.

Candidate metadata remains production_ready=false, approved=false, and approvalRef=null until Integration Owner review, owner content review, license approval, and release approval pass.

E01 Cloudflare Named Tunnel and RC01 remain CLOSED. Stop at the next Wave 2 review checkpoint.
