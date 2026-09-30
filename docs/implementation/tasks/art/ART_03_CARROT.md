# ART-03 — Carrot Production

| Field | Value |
|---|---|
| Owner | Carrot Asset Owner |
| Status | REVIEW ? 5/5 generated; QA PASS; not promoted |
| Owned workspace | `work/art-generation/crops/carrot/**` |
| Production path | `assets-src/crops/carrot/**` — promotion only after Integration Owner review |
| Canonical source | `assets-src/manifests/animation-manifest.json` |
| Style source | `docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md` |
| Asset IDs | `crop_carrot_seed`, `crop_carrot_stage_1`, `crop_carrot_stage_2`, `crop_carrot_stage_3`, `crop_carrot_ready` |
| Canvas | `256x256` RGBA, `sourceScale=2` |
| Anchor / offset | `0.5,0.9` / `0,0` |
| Atlas group | `crops` |
| Current approval | Candidate generation only; `approved=true` and `production_ready=true` are forbidden |

## Scope

This task owns the complete Carrot asset type and no other crop. The five static stages must read as one coherent plant progression:

`seed/soil mark -> first sprout -> small leafy carrot -> mature leafy carrot -> ready carrot with readable orange root`

The ready root must remain identifiable at runtime size while staying within the shared crop footprint. Do not reveal a harvest-ready orange root before the ready stage. Preserve the common 2.5D isometric, cozy and bright farm direction from the style guide: soft outline, top-left light, bottom-right shadow, clear silhouette, restrained interior detail, and no baked ready glow. Do not introduce a new perspective, palette family, logical footprint, or runtime transform.

The stage set is static. There is no Carrot animation entry in the canonical manifest; do not invent an animation ID, frame count, FPS, loop mode, or event contract. The separate canonical `crop_ready_glow` effect is not owned by ART-03 and must not be modified.

## Canonical contract (read from manifest)

| Stage | Canonical ID | Source file | Width | Height | Source scale | Anchor | Render offset |
|---|---|---:|---:|---:|---:|---|---|
| Seed | `crop_carrot_seed` | `assets-src/crops/crop_carrot_seed.png` | 256 | 256 | 2 | `(0.5,0.9)` | `(0,0)` |
| Stage 1 | `crop_carrot_stage_1` | `assets-src/crops/crop_carrot_stage_1.png` | 256 | 256 | 2 | `(0.5,0.9)` | `(0,0)` |
| Stage 2 | `crop_carrot_stage_2` | `assets-src/crops/crop_carrot_stage_2.png` | 256 | 256 | 2 | `(0.5,0.9)` | `(0,0)` |
| Stage 3 | `crop_carrot_stage_3` | `assets-src/crops/crop_carrot_stage_3.png` | 256 | 256 | 2 | `(0.5,0.9)` | `(0,0)` |
| Ready | `crop_carrot_ready` | `assets-src/crops/crop_carrot_ready.png` | 256 | 256 | 2 | `(0.5,0.9)` | `(0,0)` |

All five entries are static assets in atlas group `crops`, with `placeholder=true` in the current manifest. Keep these IDs, paths, canvas values, anchor, offset, and source scale unchanged. The target candidate files belong in the owned workspace until a separate promotion review.

## Required output

- One candidate PNG for each of the five canonical IDs, stored only under `work/art-generation/crops/carrot/**` during this task.
- Each candidate is exactly `256x256`, RGBA, with a transparent background, no checkerboard, no baked tile or soil background, and stable transparent margins.
- Keep the contact/base area aligned to the shared crop baseline implied by anchor `0.5,0.9`; do not solve alignment with per-stage render offsets or runtime transforms.
- Show readable seed, leaf growth, mature volume, and ready-root progression without changing the logical crop footprint or obscuring neighboring farm objects.
- Keep one Carrot identity across all five stages: consistent leaf language, outline treatment, palette family, light direction, shadow direction, and scale relationship.
- Record provenance beside the candidate set: `source`, `creator`, `tool`, `toolVersion`, `license`, `contentVersion`, `styleGuideVersion`, technical review, style review, and approval reference. Unknown license remains `PENDING_OWNER_REVIEW`; do not fabricate a license or approval reference.
- Before review, provide evidence for dimensions, RGBA/alpha, transparent margins, anchor/baseline stability, stage progression, mobile readability at `932x430`, `915x412`, `844x390`, and `740x360`, and cross-asset scale/lighting/perspective consistency.

## Forbidden changes

Do not edit `assets-src/**`, manifests, atlas output, asset IDs, animation IDs, renderer architecture, animation runtime, backend, API, PostgreSQL, economy, gameplay, Tutorial, Cloudflare, or RC01. Do not modify Rice, Corn, Tomato, Chicken, `crop_ready_glow`, or any other asset workspace. Do not promote candidate files, set `placeholder=false`, set `production_ready=true`, set `approved=true`, or claim owner/style/release approval from technical checks alone.

## Acceptance gate

- [ ] All five canonical Carrot IDs have candidates in the owned workspace.
- [ ] Seed → stage 1 → stage 2 → stage 3 → ready progression is visually clear and keeps a coherent identity.
- [ ] Ready root and foliage remain readable at runtime/mobile review sizes.
- [ ] Every candidate passes `256x256`, RGBA, alpha, transparent-margin, anchor and footprint checks.
- [ ] Lighting is consistent with the style guide: top-left light and bottom-right soft contact shadow.
- [ ] Mobile checks cover `932x430`, `915x412`, `844x390`, and `740x360` without relying on micro-detail.
- [ ] Provenance and review metadata are complete; license and owner approval remain pending where not supplied.
- [ ] Integration Owner reviews cross-crop scale, lighting, perspective, and atlas/promotion readiness.

Until every gate passes, status remains `RUNNING` or `REVIEW`; ART-03 does not promote files to production and does not close B02.

## Blockers at kickoff

- Candidate generation is complete; Integration Owner visual review, license confirmation and release approval remain pending.
- Candidates must be generated and reviewed before any production promotion can be considered.
- Final approval, license/source evidence, and integration review are pending.
