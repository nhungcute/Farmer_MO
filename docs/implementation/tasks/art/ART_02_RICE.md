# ART-02 — Rice production artwork kickoff

| Field | Value |
|---|---|
| Task | `ART-02` — Rice production |
| Owner | Rice Asset Owner |
| Status | `DONE` — 5/5 promoted; technical/style PASS; `production_ready=true`; release approval pending |
| Generation sub-status | `COMPLETE` |
| Review status | `DONE` — Integration Owner cross-asset review PASS; `approved=false`; license pending |
| Owned candidate path | `work/art-generation/crops/rice/**` |
| Production promotion | `assets-src/crops/*.png` (10 Wave 1 crop files promoted by Integration Owner) |
| Canonical technical source | `assets-src/manifests/animation-manifest.json` |
| Cross-check manifest | `assets-src/manifests/crops.json` |
| Shared style source | `docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md` and `assets-src/style/style-sheet.md` |
| Manifest content version | `mvp-1` |

Five real Rice candidates completed isolated task QA and passed Integration Owner cross-asset review. The five canonical PNGs are promoted to `assets-src/crops/`; `production_ready=true`, `approved=false`, and `license=PENDING_OWNER_REVIEW`.

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

The original task instruction named `assets-src/crops/rice/**` as a future promotion area, while canonical `sourceFile` values are flat files under `assets-src/crops/`. Integration Owner review confirmed the flat mapping and preserved all canonical IDs and manifest fields; ART-02 did not silently change the mapping.

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
| `placeholder` | `false` for the five promoted Rice entries; the candidate workspace remains retained for evidence |
| `production_ready` | `true` after atlas build and strict validation; only Integration Owner can set it |
| `approved` | `false`; no release approval has been granted |
| `technicalReview` | `PASS`; dimensions, alpha, scale, atlas and progression evidence are recorded |
| `styleReview` | `PASS`; Integration Owner cross-asset review accepted Rice |
| `approvalRef` | `null`; no release approval reference exists yet |

The existing manifest provenance (`Generated deterministic placeholder`, `internal-placeholder`, placeholder generator) describes the current placeholder files. It must not be copied as the provenance of a future production candidate unless that source is genuinely used and the owner confirms it.

## 5. Acceptance checklist

The generation gate moved ART-02 to `REVIEW` after all five IDs were evidenced; the Integration Owner promotion gate is now complete:

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
- [x] Candidate source and QA evidence remain under `work/art-generation/crops/rice/**`; the Integration Owner promotion changed only the five canonical Rice files and generated atlas output.

Technical, visual and release checks remain independent: Rice has technical/style PASS and is production-ready, while `approved=false` and the pending license keep release approval open.

## 6. Current review gates

- Candidate generation and Integration Owner cross-asset review are complete for all five Rice IDs.
- The five canonical Rice files are promoted in the flat `assets-src/crops/` mapping; IDs, filenames, atlas and transforms are unchanged.
- `production_ready=true` is supported by build/pack/strict validation; `approved=false` remains locked until release approval.
- `license=PENDING_OWNER_REVIEW` is the only release provenance blocker for this asset type; no license or approval reference is invented.

## 7. Current integration outcome — 2026-09-30

- **Technical:** PASS for all five canonical IDs (`256x256`, RGBA/alpha, stable contact/baseline, atlas mapping and growth progression).
- **Style/cross-asset:** PASS in the Wave 1 integration sheet.
- **Promotion:** `PROMOTED` to `assets-src/crops/`; no ID, filename, source scale, anchor or render offset changed.
- **Runtime metadata:** `placeholder=false`, `production_ready=true`, `approved=false`, `license=PENDING_OWNER_REVIEW`.
- **Release gate:** remains open until owner confirms provenance/license and release approval. Chicken, Corn and Tomato remain on targeted revision and are not changed by ART-02.

## 8. Status transition

```text
QUEUED  ->  RUNNING (this kickoff)  ->  REVIEW  ->  DONE
                                      \-> BLOCKED
```

`DONE` here means the Rice technical/style promotion gate is complete. Release approval remains false until provenance/license review is complete. ART-02 does not open another artwork wave automatically.
