# ART-04 — Corn Production

| Trường | Giá trị |
|---|---|
| Owner | Corn Asset Owner |
| Status | REVIEW ? 5/5 generated; QA PASS; not promoted |
| Owned workspace | `work/art-generation/crops/corn/**` |
| Production path | `assets-src/crops/corn/**` — promotion only after Integration Owner review |
| Canonical source | `assets-src/manifests/animation-manifest.json` |
| Style source | `docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md` |
| Asset IDs | `crop_corn_seed`, `crop_corn_stage_1`, `crop_corn_stage_2`, `crop_corn_stage_3`, `crop_corn_ready` |
| Canvas | `256×256` RGBA, `sourceScale=2` |
| Anchor / offset | `0.5,0.9` / `0,0` |
| Current approval | Candidate generation only; `approved=true` is forbidden |

## Scope

This task owns the complete Corn asset type and no other crop. The generation sequence must read clearly as:

`small shoot → leaves → taller plant → mature → ready`.

Mature Corn must remain readable inside the gameplay cell and must not cover neighboring gameplay objects unnecessarily. Use the shared 2.5D isometric, cozy, bright, soft-outline, top-left-light and bottom-right-shadow direction. Do not introduce a new perspective, palette family, glow baked into the crop, or runtime transform.

## Required output

- One candidate PNG per canonical asset ID in the owned workspace only.
- Every candidate must be `256×256`, RGBA, transparent, with a stable footprint and anchor baseline.
- Metadata must record `source`, `creator`, `tool`, `toolVersion`, `license`, `contentVersion`, `styleGuideVersion`, technical review, style review and approval reference. Unknown license remains `PENDING_OWNER_REVIEW`.
- The task must include dimensions, alpha, scale, stage progression, mobile readability, and cross-asset comparison evidence before entering `REVIEW`.

## Forbidden changes

Do not edit `assets-src/**`, manifests, asset IDs, animation IDs, backend, API, PostgreSQL, economy, gameplay, renderer architecture, animation runtime, Tutorial, Cloudflare or RC01. Do not change Rice, Carrot or Tomato workspaces.

## Acceptance gate

- [ ] All five canonical Corn IDs exist in the owned workspace.
- [ ] Growth progression and final scale pass visual review.
- [ ] Dimensions, RGBA, alpha, anchor and transparent margins pass validation.
- [ ] Mobile checks cover `932×430`, `915×412`, `844×390`, `740×360`.
- [ ] Metadata is complete and does not claim production approval.
- [ ] Integration Owner has reviewed cross-asset scale, lighting and perspective.

Until all checks pass, status remains `RUNNING` or `REVIEW`; this task does not promote files to production.
