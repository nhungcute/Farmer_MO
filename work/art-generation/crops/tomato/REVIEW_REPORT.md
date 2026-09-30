# ART-05 Tomato Integration Review

Review scope: `work/art-generation/crops/tomato/**` only. No production file was modified.

## Decision

- Technical contract: **PASS** ? five canonical IDs, 256?256 RGBA PNGs, transparent alpha, sourceScale 2, anchor 0.5/0.9, render offset 0/0, baseline y=230.
- Growth progression: **PASS** ? seed ? stage_1 ? stage_2 ? stage_3 ? ready is visually readable and the ready state is distinct.
- Lighting/perspective: **PASS** ? top-left highlights, soft lower-right shading/contact shadow, coherent isometric crop presentation.
- Style/promotion gate: **REVISION_REQUIRED / BLOCKED**.

## Finding

The normalized stage_2/stage_3 candidates contain detached, very small alpha components beside the main plant silhouette. These appear as floating leaf/edge fragments at runtime size. They are visible in the runtime review sheet and must be removed or corrected by the asset owner before promotion. The crop must be revised without regenerating or changing the passing asset types.

- Evidence sheet: `tomato-runtime-review.png`
- Technical QA: `ART_QA.json`
- Metadata: `ART_METADATA.json`

## Provenance gate

`source=internal-generated` is retained. The tool version and license remain `PENDING_OWNER_REVIEW`; no license or approval value was invented. `production_ready=false` and `approved=false` remain unchanged.

## Promotion

**BLOCKED_PENDING_VISUAL_REVISION**. Do not copy these candidates into `assets-src/**`, regenerate the atlas, or set production approval flags until the detached fragments are corrected and re-reviewed.
