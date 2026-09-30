# ART-04 Corn Revision 2 Review

Review scope: `work/art-generation/crops/corn/**` only. This revision did not modify `assets-src/**`, runtime manifests, atlases, or shared production files.

## Decision

- Technical contract: **PASS** ? five canonical IDs, 256x256 RGBA PNGs, transparent alpha, `sourceScale=2`, anchor `(0.5,0.9)`, render offset `(0,0)`, baseline `y=230`.
- Growth progression: **PASS** ? seed -> stage_1 -> stage_2 -> stage_3 -> ready remains readable and ordered.
- Identity/style continuity: **PASS_PENDING_INTEGRATION_REVIEW** ? no regeneration or redesign; palette, lighting, leaf language, soil, shadow, and mature-corn identity are preserved.
- Runtime readability: **PASS** ? revised stage_2 and stage_3 remain legible at 100%, 75%, and 50% review sizes.

## Targeted repair

The previous review found visible detached green alpha islands to the right of stage_2 and stage_3. Only those two stages were edited. The repair removed the following isolated components while leaving the primary plant/soil/shadow component unchanged:

- `crop_corn_stage_2.png`: two components, 32 pixels (`[185,103,187,121]`) and 5 pixels (`[186,135,187,140]`).
- `crop_corn_stage_3.png`: two components, 27 pixels (`[189,139,191,159]`) and 12 pixels (`[190,96,191,108]`).

No pixels were regenerated, recolored, rescaled, or removed from seed, stage_1, or ready.

## Connected-component QA

- Verification threshold: alpha >= 16.
- Connectivity: 8-neighbor.
- Expected result: exactly one visible connected component per stage.
- Result: **PASS** ? all five stages have one visible component; detached visible component count is `0`.
- Lower-alpha anti-aliasing pixels are retained and are excluded from the runtime-visible island criterion.

## Contract QA

- File count: 5/5.
- Canonical IDs and state order: PASS.
- Dimensions: 256x256 for every frame.
- Color mode/alpha: RGBA with transparent background for every frame.
- Baseline: y=230 for every frame.
- Anchor: `(0.5,0.9)` for every frame.
- Source scale: 2.
- Lighting: top-left highlights and soft lower-right contact shadow preserved.
- Stage continuity/mobile readability: PASS.
- Provenance: `source=internal-generated`; tool and license remain `PENDING_OWNER_REVIEW`.

Evidence: `corn-runtime-review-v2.png`.

## Promotion

**HOLD_PENDING_INTEGRATION_REVIEW**. `production_ready=false` and `approved=false` remain unchanged. Do not copy these candidates into `assets-src/**` or regenerate the production atlas until the Integration Owner accepts this revision.
