# ART-01 Chicken generation workspace

**Status: RUNNING — kickoff only.** This directory is an isolated intake/generation workspace for the B02.2-FULL Chicken candidate. It is not a production asset directory.

## Contract reference

Read [`docs/implementation/tasks/art/ART_01_CHICKEN.md`](../../../docs/implementation/tasks/art/ART_01_CHICKEN.md) before adding anything here. The canonical source of truth is [`assets-src/manifests/animation-manifest.json`](../../../assets-src/manifests/animation-manifest.json), with the visual rules in [`docs/assets/CHICKEN_PRODUCTION_CONTRACT.md`](../../../docs/assets/CHICKEN_PRODUCTION_CONTRACT.md) and [`docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md`](../../../docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md).

## Workspace rules

- Keep all drafts, source files, scripts, contact sheets, and review exports here until the candidate is complete.
- Do not copy files into `assets-src/animals/chicken/` from this workspace without a separate approved replacement step.
- Do not edit either animation manifest, renderer, animation runtime, atlas output, gameplay, economy, Tutorial, or API.
- Do not use proof PNGs as the B02.2-FULL source. The Revision 2 proof is a separate 13-frame checkpoint outside production.
- Never mirror directions. Generate real `NE`, `SE`, `SW`, and `NW` views.
- Do not declare `production_ready` or `approved` from a draft. Keep provenance fields explicit and pending until evidence exists.

## Required deliverable layout

The eventual candidate must contain exactly 92 frames using the manifest IDs, for example:

```text
candidate/
  assets-src-compatible/
    animal_chicken_idle_ne_00.png ... animal_chicken_product_ready_nw_01.png
  reviews/
    scale-comparison.png
    state-direction-sheet.png
    eat-se-proof.png
    runtime-size-sheet.png
  provenance.json
  generation-notes.md
```

The layout is a workspace convention. The canonical production path remains `assets-src/animals/chicken/<frame-id>.png`; the manifest must not be changed to accommodate a workspace layout.

## Frame and motion checklist

| State | Frames per direction | FPS | Loop | Hold last | Event |
|---|---:|---:|:---:|:---:|---|
| IDLE | 4 | 6 | yes | no | — |
| WALK | 6 | 8 | yes | no | — |
| EAT | 5 | 10 | no | yes | `FEED_CONSUMED` at zero-based frame 2 |
| HAPPY | 4 | 8 | no | yes | — |
| SLEEP | 2 | 3 | yes | no | — |
| PRODUCT_READY | 2 | 2 | yes | no | — |

Required total: `23 frames per direction x 4 directions = 92 unique PNGs`.

## Provenance template

Create `provenance.json` only when the candidate has real evidence. One record must cover each frame or an explicit source group:

```json
{
  "contentVersion": "mvp-1",
  "frames": {
    "<frame-id>": {
      "source": "<original source URI/path>",
      "creator": "<person/team/studio>",
      "tool": "<authoring/render tool>",
      "toolVersion": "<exact version>",
      "license": "<license and permitted use>",
      "placeholder": false,
      "production_ready": false,
      "technicalReview": "PENDING",
      "styleReview": "PENDING",
      "approvalRef": null
    }
  }
}
```

Do not fill unknown values with guesses. `approvalRef` must point to a real owner/art/release approval record; it is not a free-form status string.

## Validation handoff

When all 92 frames exist, run the canonical checks from ART-01 and store command output/review evidence under this workspace. A pass from the asset validator confirms technical shape and manifest compatibility only; it does not replace visual/style/license/owner approval.

Until that evidence exists, this workspace is **RUNNING**, B02.2-FULL is **QUEUED**, and the current placeholder source remains unchanged.
