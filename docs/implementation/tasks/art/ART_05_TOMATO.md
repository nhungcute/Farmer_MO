# ART-05 — Tomato Production

| Trường | Giá trị |
|---|---|
| Owner | Tomato Asset Owner |
| Status | RUNNING — kickoff and contract audit |
| Owned workspace | `work/art-generation/crops/tomato/**` |
| Production path | `assets-src/crops/tomato/**` — promotion only after Integration Owner review |
| Canonical source | `assets-src/manifests/animation-manifest.json` |
| Style source | `docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md` |
| Asset IDs | `crop_tomato_seed`, `crop_tomato_stage_1`, `crop_tomato_stage_2`, `crop_tomato_stage_3`, `crop_tomato_ready` |
| Canvas | `256×256` RGBA, `sourceScale=2` |
| Anchor / offset | `0.5,0.9` / `0,0` |
| Current approval | Candidate generation only; `approved=true` is forbidden |

## Scope

This task owns the complete Tomato asset type and no other crop. The progression must show an early green plant, gradually increasing branching, fruit appearing only in late stages, and a ready stage with red tomatoes that remain readable at runtime size. Keep fruit large enough to identify on mobile without changing the logical footprint.

Use the shared 2.5D isometric, cozy, bright, soft-outline, top-left-light and bottom-right-shadow direction. Do not introduce a new perspective, palette family, baked ready glow, or runtime transform.

## Required output

- One candidate PNG per canonical asset ID in the owned workspace only.
- Every candidate must be `256×256`, RGBA, transparent, with stable footprint and anchor baseline.
- Metadata must record `source`, `creator`, `tool`, `toolVersion`, `license`, `contentVersion`, `styleGuideVersion`, technical review, style review and approval reference. Unknown license remains `PENDING_OWNER_REVIEW`.
- Evidence must cover stage progression, dimensions, alpha, scale, mobile readability, and cross-asset consistency before entering `REVIEW`.

## Forbidden changes

Do not edit `assets-src/**`, manifests, asset IDs, animation IDs, backend, API, PostgreSQL, economy, gameplay, renderer architecture, animation runtime, Tutorial, Cloudflare or RC01. Do not change Rice, Carrot or Corn workspaces.

## Acceptance gate

- [ ] All five canonical Tomato IDs exist in the owned workspace.
- [ ] Branching and fruit progression pass visual review.
- [ ] Ready fruit remains readable at runtime size.
- [ ] Dimensions, RGBA, alpha, anchor and transparent margins pass validation.
- [ ] Mobile checks cover `932×430`, `915×412`, `844×390`, `740×360`.
- [ ] Metadata is complete and does not claim production approval.
- [ ] Integration Owner has reviewed cross-asset scale, lighting and perspective.

Until all checks pass, status remains `RUNNING` or `REVIEW`; this task does not promote files to production.
