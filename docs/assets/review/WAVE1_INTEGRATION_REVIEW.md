> Deployment references only: **SUPERSEDED / NON_CANONICAL / NOT_CURRENT_E01_RELEASE_PATH** (2026-10-01), reason `PROJECT_OWNER_SELECTED_TRYCLOUDFLARE_AS_OFFICIAL_PUBLIC_DEPLOYMENT`. Any Named Tunnel mention below records the historical checkpoint. Current deployment: [`PERSISTENT_QUICK_TUNNEL`](../../implementation/tasks/E01_PERSISTENT_QUICK_TUNNEL.md). Artwork findings and approvals below are unchanged.

# Wave 1 Integration Review

**Review date:** 2026-09-30  
**Integration Owner:** `/root`  
**Status:** **REVISION_REQUIRED**  
**Scope:** ART-01 Chicken, ART-02 Rice, ART-03 Carrot, ART-04 Corn and ART-05 Tomato. Candidate generation is complete; no new artwork was generated during this review.

## Decision

Only candidate sets that passed both technical and visual/style review were promoted. Rice and Carrot were promoted as a partial batch (`10/112`). Chicken, Corn and Tomato remain in their isolated workspaces and are blocked for targeted owner revision. Production approval is still false for every asset because the license/content approval field is `PENDING_OWNER_REVIEW`.

| Owner | Candidate set | Technical | Style / identity | Animation / event | Promotion | `production_ready` |
|---|---:|---|---|---|---|---|
| ART-01 Chicken | 92/92 | PASS | **REVISION_REQUIRED / identity PASS** | **REVISION_REQUIRED**; metadata `FEED_CONSUMED@2` is correct, visual contact is not clear | **BLOCKED** | false |
| ART-02 Rice | 5/5 | PASS | PASS | N/A (static crop stages) | **PROMOTED** | true |
| ART-03 Carrot | 5/5 | PASS | PASS | N/A (static crop stages) | **PROMOTED** | true |
| ART-04 Corn | 5/5 | PASS | **REVISION_REQUIRED / identity PASS** | N/A (static crop stages) | **BLOCKED** | false |
| ART-05 Tomato | 5/5 | PASS | **REVISION_REQUIRED / identity PASS** | N/A (static crop stages) | **BLOCKED** | false |

## Review findings

### Chicken

The 92-frame technical contract is complete: canonical IDs, 256?256 RGBA files, transparent alpha, baseline `y=230`, anchor `(0.5, 0.9)`, four real directions and identity features all pass. The visual gate remains blocked for four targeted issues:

- micro-feather detail is still too dense for runtime size;
- high-frequency/specular shading still reads too much like a 3D mascot;
- WALK foot/leg alternation is not readable;
- EAT frame 2 has the correct event metadata but the beak/feed contact pose is not visually clear.

No Chicken production frame or atlas entry was changed. Evidence: `work/art-generation/chicken/REVIEW_REPORT.md` and `work/art-generation/chicken/candidate/reviews/walk-se-proof.png`.

### Rice

All five canonical stages pass technical, identity, growth continuity, scale, lighting, alpha and mobile readability checks. Baseline/contact remains stable, and ready-state glow is not baked into the crop. The five source PNGs were promoted to `assets-src/crops/**`, packed into the crops atlas, and marked `production_ready=true`, `approved=false`.

### Carrot

All five canonical stages pass technical, identity, root/leaf progression, scale, lighting, alpha and mobile readability checks. The five source PNGs were promoted to `assets-src/crops/**`, packed into the crops atlas, and marked `production_ready=true`, `approved=false`.

### Corn

Technical contract and growth progression pass. Stage 2 and stage 3 contain detached small alpha components beside the main silhouette at runtime size. The owner must remove or reconnect those fragments and submit the same five IDs for re-review. No Corn production file was changed.

### Tomato

Technical contract and growth progression pass. Seed and stages 1?3 contain detached small alpha components beside the main silhouette at runtime size. The owner must remove or reconnect those fragments and submit the same five IDs for re-review. No Tomato production file was changed.

## Cross-asset composition

The Integration Owner reviewed both evidence sheets:

- [Desktop composition](./wave1-cross-asset-review.png)
- [Mobile composition](./wave1-cross-asset-mobile.png)

Perspective, common lighting direction, shadow treatment and relative scale pass for the promoted Rice/Carrot set. The overall cross-asset gate is **REVISION_REQUIRED** because the blocked candidates show the findings above. The blocked candidates are excluded from production promotion.

## Provenance and approval boundary

The candidates retain truthful provenance: `source=internal-generated`. No license, creator, tool version or approval value was invented. The license remains `PENDING_OWNER_REVIEW`; this permits technical promotion for this prototype review but prevents `approved=true` and release approval. All promoted Rice/Carrot records have `technicalReview=PASS`, `styleReview=PASS`, `production_ready=true`, `approved=false`, and `approvalRef=null`.

## Promotion and atlas QA

Promoted set: **10/112** candidates:

- Rice: 5/5 (`crop_rice_seed`, `stage_1`, `stage_2`, `stage_3`, `ready`)
- Carrot: 5/5 (`crop_carrot_seed`, `stage_1`, `stage_2`, `stage_3`, `ready`)

The crops atlas JSON contains the canonical IDs at 256?256 slices. Each promoted atlas slice was compared byte-for-byte against its corresponding `assets-src/crops/*.png`; all 10 comparisons passed. Runtime metadata was checked for `placeholder=false`, `production_ready=true`, `approved=false`, and the expected review fields. The Chicken atlas remains placeholder; the full Chicken animated stress pass was therefore **NOT RUN**.

`npm run assets:build` passed. Because the deterministic generator rewrites source metadata, the promotion metadata was restored and the atlas was repacked before final validation; this preserves the intended promotion flags without changing the generator architecture.

## Technical QA

| Check | Result |
|---|---|
| `npm run assets:build` | PASS |
| `npm run assets:validate` | PASS |
| `npm run assets:validate:strict` | PASS (expected license-pending warnings for 10 promoted assets) |
| `npm run renderer:test` | PASS (16/16) |
| `npm run check` | PASS |
| `docker compose config --quiet` | PASS |
| `git diff --check` | PASS |
| Promoted crop atlas slice equality | PASS (10/10) |
| Promoted crop DPR 1/2 and mobile metadata/composition review | PASS |
| Full Chicken IDLE/WALK random-direction DPR/mobile stress | NOT RUN; Chicken is blocked and not promoted |

## Production inventory

The generated inventory contains **188** canonical source assets:

- `production_ready`: **10/188**
- `placeholder`: **178/188**
- `approved`: **0/188**

The 10 production-ready entries are Rice and Carrot only. License/content approval is still pending, so this is not a release approval.

Machine-readable evidence: [WAVE1_INTEGRATION_REVIEW.json](./WAVE1_INTEGRATION_REVIEW.json). Inventory: [PRODUCTION_ASSET_INVENTORY.md](../PRODUCTION_ASSET_INVENTORY.md).

## Status and next action

- B02.2-PROOF: DONE.
- B02.2-FULL: RUNNING with partial promotion (`10/112`); three owners require revision.
- Wave 1: **REVISION_REQUIRED**.
- Wave 2: CLOSED / not opened.
- Cloudflare Named Tunnel: NOT STARTED.
- RC01: NOT STARTED.

Next action is targeted revision and re-review for Chicken, Corn and Tomato only. Do not regenerate or alter the Rice/Carrot production set, and do not open Wave 2, Cloudflare or RC01.
