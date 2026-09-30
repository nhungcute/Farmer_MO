# Parallel Art Wave 2

Owner decision: Wave 2 OPEN. Eight isolated owner contracts ran in parallel against the canonical manifest and are now at the review checkpoint.

Wave 1 remains frozen at 112 production_ready and 112 approved. No worker writes assets-src/**; Integration Owner alone may promote candidates.

| Task | Expected | Generated | Status | Workspace |
|---|---:|---:|---|---|
| ART-06 POND | 19 | 19 | PROMOTED - targeted revision PASS | work/art-generation/pond |
| ART-07 FARMHOUSE | 1 | 1 | PROMOTED | work/art-generation/buildings/farmhouse |
| ART-08 WAREHOUSE | 1 | 1 | PROMOTED | work/art-generation/buildings/warehouse |
| ART-09 CHICKEN COOP | 1 | 1 | PROMOTED | work/art-generation/buildings/chicken-coop |
| ART-10 TERRAIN | 5 | 5 | PROMOTED - targeted revision PASS | work/art-generation/terrain |
| ART-11 EFFECTS | 30 | 30 | PROMOTED - targeted revision PASS | work/art-generation/effects |
| ART-12 UI | 15 | 15 | PROMOTED - targeted revision PASS | work/art-generation/ui |
| ART-13 CROP EXTRAS | 4 | 4 | PROMOTED | work/art-generation/crops/extras |

Total Wave 2 generation progress: **76/76**. Initial 7/76 promotion was followed by four targeted revision reviews. All 76/76 Wave 2 assets are now promoted for technical/style use.

The pre-review integration QA is recorded in `work/art-generation/WAVE2_CANDIDATE_QA.json`: exact canonical IDs, dimensions, RGBA/true alpha, transparent pixels without hidden RGB matte, truthful provenance, and release flags all pass. Review sheets remain under each task's `reviews/` directory.

Integration review decision and blockers are recorded in `docs/assets/review/WAVE2_INTEGRATION_REVIEW.md`. Read-only reviews REVIEW-06/10/11/12 all recommend PROMOTE; promotion evidence is docs/assets/review/WAVE2_REVISED_PROMOTION.json.

Promoted records have production_ready=true, approved=false, policy license and approvalRef=null. Candidate workspaces remain auditable; canonical production metadata is now production_ready=true and approved=false pending owner content and license approval.

E01 Cloudflare Named Tunnel and RC01 remain CLOSED. Stop after Wave 2 technical/style promotion; do not open Cloudflare or RC01. Owner content approval is still required.
