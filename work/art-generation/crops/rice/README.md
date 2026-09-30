# ART-02 Rice candidate workspace

**Task status:** `RUNNING` (kickoff initialized)
**Generation status:** `QUEUED`
**Owner:** Rice Asset Owner

This directory is the only workspace owned by ART-02. It is intentionally separate from `assets-src`; files written here are candidates for review and are not production assets.

## Canonical asset set

Read the technical contract from:

- `assets-src/manifests/animation-manifest.json` (canonical source of truth);
- `assets-src/manifests/crops.json` (cross-check);
- `docs/implementation/tasks/art/ART_02_RICE.md` (task contract and acceptance);
- `docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md` and `assets-src/style/style-sheet.md` (shared style lock).

The exact candidate files are:

```text
crop_rice_seed.png
crop_rice_stage_1.png
crop_rice_stage_2.png
crop_rice_stage_3.png
crop_rice_ready.png
```

Their canonical IDs are the filenames without `.png`. Every file must remain `256×256` RGBA PNG, `sourceScale=2`, anchor `{ "x": 0.5, "y": 0.9 }`, render offset `{ "x": 0, "y": 0 }`, and atlas `crops`. Do not add direction/frame/FPS metadata: the canonical Rice entries are static assets, not a Rice animation contract.

The intended visual reading is the manifest order:

```text
seed -> stage_1 -> stage_2 -> stage_3 -> ready
```

This is a growth-state sequence, not permission to invent stage timings or economy values. `crop_ready_glow_00..03` belongs to the separate `crop_ready_glow` effect and must not be merged into the Rice PNGs.

## Suggested workspace layout

Keep candidate source and evidence under this directory. The exact subdirectory names are implementation details, but the production boundary must remain intact:

```text
work/art-generation/crops/rice/
├── README.md
├── candidates/                # five candidate PNGs, exact canonical filenames
├── previews/                  # stage strip and mobile-size review images
├── qa/                        # dimensions/alpha/anchor/footprint evidence
└── metadata.json              # provenance and approval fields
```

Do not place a candidate in `assets-src/crops`, `apps/web/public/assets`, an atlas, or a manifest during generation.

## Art rules

- Use the shared 2.5D isometric, cozy, bright cartoon direction.
- Keep the same perspective, logical footprint, scale, palette family, soft outline, top-left light and bottom-right shadow in all five states.
- Make the silhouette and growth progression readable at runtime size; limit tiny feather/leaf/texture detail.
- Keep the contact point stable. Do not auto-crop stages or compensate with per-file render offsets.
- Keep the background genuinely transparent and avoid checkerboard/matte pixels or alpha fringe.
- Make the ready state clear without baking `crop_ready_glow` into the crop.
- Check the shared viewports `932×430`, `915×412`, `844×390`, and `740×360` at default and maximum zoom.

## Metadata template

Create `metadata.json` only when actual source information is available. Until then, use explicit pending values rather than guesses:

```json
{
  "task": "ART-02",
  "status": "RUNNING",
  "assetIds": [
    "crop_rice_seed",
    "crop_rice_stage_1",
    "crop_rice_stage_2",
    "crop_rice_stage_3",
    "crop_rice_ready"
  ],
  "contentVersion": "mvp-1",
  "styleGuideVersion": "B02.1",
  "canvas": { "width": 256, "height": 256 },
  "sourceScale": 2,
  "anchor": { "x": 0.5, "y": 0.9 },
  "renderOffset": { "x": 0, "y": 0 },
  "source": "PENDING_OWNER_REVIEW",
  "creator": "PENDING_OWNER_REVIEW",
  "tool": "PENDING_OWNER_REVIEW",
  "toolVersion": "PENDING_OWNER_REVIEW",
  "license": "PENDING_OWNER_REVIEW",
  "placeholder": true,
  "production_ready": false,
  "approved": false,
  "technicalReview": "PENDING",
  "styleReview": "PENDING_OWNER_REVIEW",
  "approvalRef": "PENDING_OWNER_REVIEW"
}
```

Replace pending values only with evidence supplied by the actual creator/owner. Do not mark `production_ready` or `approved` in this workspace.

## Local handoff gate

Before changing this task to `REVIEW`, record evidence for every canonical ID:

1. exact file count and filename mapping;
2. `256×256` dimensions, RGBA mode and transparent alpha;
3. canvas/anchor/render-offset match against the canonical manifest;
4. stable footprint and obvious growth progression;
5. style and mobile-size review, including the four shared viewports;
6. complete provenance fields or explicit pending owner fields.

Then stop and hand the candidate to the Integration Owner. Promotion into `assets-src/crops/rice/**` is a separate reviewed action and is not performed by ART-02 generation.

## Scope boundary

ART-02 must not edit Carrot, Corn, Tomato, Chicken, backend, API, PostgreSQL, economy, gameplay, renderer architecture, animation runtime, Tutorial, Cloudflare, RC01, manifests or production atlases. No other wave starts automatically from this workspace.
