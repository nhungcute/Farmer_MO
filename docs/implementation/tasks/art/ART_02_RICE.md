# ART-02 — Rice production artwork kickoff

| Field | Value |
|---|---|
| Task | `ART-02` — Rice production |
| Owner | Rice Asset Owner |
| Status | `RUNNING` (kickoff initialized) |
| Generation sub-status | `QUEUED` |
| Review status | `NOT_STARTED` |
| Owned candidate path | `work/art-generation/crops/rice/**` |
| Future promotion area | `assets-src/crops/rice/**` (Integration Owner only) |
| Canonical technical source | `assets-src/manifests/animation-manifest.json` |
| Cross-check manifest | `assets-src/manifests/crops.json` |
| Shared style source | `docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md` and `assets-src/style/style-sheet.md` |
| Manifest content version | `mvp-1` |

This file starts the Rice task only. No production artwork has been generated or promoted in this kickoff. The current repository files are deterministic placeholders (`placeholder=true`) and are not evidence of production approval.

## 1. Canonical Rice contract

The Rice entries in both canonical crop manifests agree on the following five static asset IDs. The technical values below are copied from the manifest; they must not be inferred from a generated image or changed by the art task.

| Growth order | Canonical asset ID | Current canonical `sourceFile` | Atlas | Canvas | `sourceScale` | Anchor | Render offset |
|---:|---|---|---|---:|---:|---|---|
| 0 | `crop_rice_seed` | `assets-src/crops/crop_rice_seed.png` | `crops` | `256 × 256` | 2 | `{ "x": 0.5, "y": 0.9 }` | `{ "x": 0, "y": 0 }` |
| 1 | `crop_rice_stage_1` | `assets-src/crops/crop_rice_stage_1.png` | `crops` | `256 × 256` | 2 | `{ "x": 0.5, "y": 0.9 }` | `{ "x": 0, "y": 0 }` |
| 2 | `crop_rice_stage_2` | `assets-src/crops/crop_rice_stage_2.png` | `crops` | `256 × 256` | 2 | `{ "x": 0.5, "y": 0.9 }` | `{ "x": 0, "y": 0 }` |
| 3 | `crop_rice_stage_3` | `assets-src/crops/crop_rice_stage_3.png` | `crops` | `256 × 256` | 2 | `{ "x": 0.5, "y": 0.9 }` | `{ "x": 0, "y": 0 }` |
| 4 | `crop_rice_ready` | `assets-src/crops/crop_rice_ready.png` | `crops` | `256 × 256` | 2 | `{ "x": 0.5, "y": 0.9 }` | `{ "x": 0, "y": 0 }` |

The five IDs are static crop states. The canonical crop manifests do not define a Rice animation, FPS, loop, hold-last rule, direction set, mirror rule or event for these assets. Do not invent any of those fields. Growth order is the order of the IDs above: `seed → stage_1 → stage_2 → stage_3 → ready`.

`crop_ready_glow_00` through `crop_ready_glow_03` are separate `effects` assets and belong to the existing `crop_ready_glow` effect contract. They are not Rice source frames and must not be baked into `crop_rice_ready`.

The source canvas is `256 × 256` at `sourceScale=2`, or `128 × 128` logical pixels. Every candidate must keep the canvas, anchor, render offset, atlas and canonical ID exactly as listed. Do not auto-crop individual stages, add per-stage render offsets, or change the manifest schema.

## 2. Shared style lock

Rice follows the shared B02.1 style lock:

- 2.5D isometric farm perspective with the same depth/readability as the 128 × 64 logical tile;
- cozy, bright, cute cartoon treatment; no pixel art, realistic rendering or dark/gritty treatment;
- clear silhouette before interior detail, with limited micro-detail so it remains readable on mobile;
- top-left light, soft anti-aliased warm/dark outline and soft bottom-right shadow;
- transparent alpha background; no checkerboard, matte, baked background or alpha fringe;
- source resolution suitable for renderer DPR 2 and camera maximum zoom around 1.30;
- fixed logical footprint and a stable contact point across all five states;
- progression must be visually obvious from seed through ready without changing perspective or scale;
- ready must be immediately distinguishable, while `crop_ready_glow` remains a separate effect;
- visual review must include the shared mobile viewports `932×430`, `915×412`, `844×390` and `740×360` at default and maximum zoom.

Do not copy Chicken-specific motion or baseline numbers into Rice. The only Rice positioning values are the canvas, anchor and render offset in the canonical manifest.

## 3. Candidate workflow and ownership

All work in this task is restricted to `work/art-generation/crops/rice/**`:

1. Create one candidate PNG per canonical ID, preserving the exact ID filename.
2. Keep the five stages in one source-consistent art set: palette, outline, light direction, shadow treatment, footprint and scale must be shared.
3. Add a task metadata record and QA evidence beside the candidates; use the provenance schema in Section 4.
4. Run local image/contract checks before moving the task to `REVIEW`.
5. Stop at `REVIEW` and hand the candidate to the Integration Owner. Only that owner may map/review/promote files into `assets-src`.

This task must not edit `assets-src/**`, either crop manifest, atlas files, renderer/runtime code, gameplay, economy, backend, API, Tutorial, Cloudflare or RC01. It also must not modify Carrot, Corn or Tomato paths.

The task instruction names `assets-src/crops/rice/**` as the future promotion area, while the current canonical `sourceFile` values are flat files under `assets-src/crops/`. Any future path mapping requires an Integration Owner review and must preserve the canonical IDs and manifest contract; ART-02 must not silently make that mapping.

## 4. Required provenance and approval fields

The metadata record for the candidate set must contain all of these fields. Values not confirmed by the owner must remain explicit pending values; do not fabricate a license, creator, tool version or approval reference.

| Field | Required value/rule at kickoff |
|---|---|
| `assetIds` | The exact five IDs listed in Section 1, with no additions or omissions |
| `source` | Actual source or generation reference for each candidate; `PENDING_OWNER_REVIEW` until known |
| `creator` | Actual creator/owner; `PENDING_OWNER_REVIEW` until confirmed |
| `tool` | Actual generation/export tool; `PENDING_OWNER_REVIEW` until known |
| `toolVersion` | Exact tool version; never guessed |
| `license` | Confirmed license for the delivered source, otherwise `PENDING_OWNER_REVIEW` |
| `contentVersion` | `mvp-1` from the canonical manifest |
| `styleGuideVersion` | `B02.1` / `APPROVED_WITH_MINOR_REVISIONS`, subject to final owner review |
| `canvas` | `256 × 256` for every ID |
| `sourceScale` | `2` for every ID |
| `anchor` | `{ "x": 0.5, "y": 0.9 }` for every ID |
| `renderOffset` | `{ "x": 0, "y": 0 }` for every ID |
| `placeholder` | Remains `true` until an approved production replacement is promoted |
| `production_ready` | `false` at kickoff; only Integration Owner can set it after technical review |
| `approved` | `false` at kickoff; only the asset/release approver can set it |
| `technicalReview` | `PENDING` until the candidate QA is run and recorded |
| `styleReview` | `PENDING_OWNER_REVIEW` until owner review |
| `approvalRef` | `PENDING_OWNER_REVIEW`; never invent a reference |

The existing manifest provenance (`Generated deterministic placeholder`, `internal-placeholder`, placeholder generator) describes the current placeholder files. It must not be copied as the provenance of a future production candidate unless that source is genuinely used and the owner confirms it.

## 5. Acceptance checklist

ART-02 may move from `RUNNING` to `REVIEW` only when every item below is evidenced for all five IDs:

- [ ] Exactly the five canonical Rice assets exist; no missing or extra Rice IDs.
- [ ] Each file is a `256 × 256` RGBA PNG with real transparent alpha and no baked background/checkerboard.
- [ ] Canvas, anchor, render offset, atlas mapping and filename match the manifest exactly.
- [ ] Seed → stage 1 → stage 2 → stage 3 → ready progression is clear and uses one consistent perspective, footprint and scale.
- [ ] Ready state is readable at runtime size; no glow is baked into the crop.
- [ ] Top-left lighting, bottom-right soft shadow and outline treatment agree across the five states and the shared style guide.
- [ ] Micro-detail is restrained for mobile readability; silhouette remains stronger than texture.
- [ ] Contact point/footprint is stable; no stage appears to jump because of a different crop or offset.
- [ ] Shared mobile viewports and default/max zoom checks have evidence.
- [ ] Provenance and approval fields in Section 4 are complete or explicitly marked pending; no fabricated values.
- [ ] Candidate remains outside production assets and no manifest/atlas/runtime change is required.

Technical and visual checks are independent: passing an image or manifest validator does not imply style approval or release approval. The final state after generation is expected to be `REVIEW`, not `DONE`, until the Integration Owner and asset/release approver sign off.

## 6. Current kickoff blockers

- Production Rice source artwork has not been supplied in the repository.
- The current five Rice files are internal placeholders; they cannot be promoted automatically.
- License/source/creator/tool evidence and `approvalRef` are not confirmed for a production replacement.
- The future `assets-src/crops/rice/**` promotion path differs from the current flat canonical `sourceFile` paths and requires Integration Owner mapping review.

No blocker in this section should be solved by changing the gameplay/content definitions or by altering the canonical manifests.

## 7. Status transition

```text
QUEUED  ->  RUNNING (this kickoff)  ->  REVIEW  ->  DONE
                                      \-> BLOCKED
```

`DONE` requires owner/release approval and a completed promotion review. ART-02 does not open another artwork wave automatically after reaching `REVIEW`.
