# ART-03 Carrot — Integration Owner Review

**Review scope:** `work/art-generation/crops/carrot/**` only  
**Review date:** 2026-09-30  
**Review status:** `DONE_TECHNICAL / PROMOTED`  
**Promotion status:** **PROMOTED (5/5)** ? the candidate set is now in `assets-src/crops/**`; release approval remains pending.

## Decision

| Gate | Result | Evidence |
|---|---|---|
| Technical contract | **PASS** | Five canonical PNG candidates, all `256×256` RGBA with real alpha; metadata and QA agree on IDs, anchor, offset, scale, atlas and baseline. |
| Stage continuity | **PASS** | Seed → young leaves → exposed shoulder → developed root → ready carrot is visually coherent. Visible height increases `24, 34, 60, 102, 160`; orange root pixels progress `0, 0, 121, 380, 2008`. |
| Identity and root/leaf logic | **PASS** | One carrot identity is retained across all five stages. The root is absent in seed/stage 1, appears as a small shoulder in stage 2, develops in stage 3 and is fully readable at ready. Leaf mass grows consistently without a disconnected fruit. |
| Scale and placement | **PASS** | Visible width `33, 41, 90, 99, 131`; every frame uses the same `256×256` canvas and baseline edge `Y=230` (last occupied alpha row `229`). Bounding-box horizontal centers stay within `±3.5 px` of canvas center. |
| Alpha and rendering safety | **PASS** | Alpha extrema are `(0,255)` for every frame; all four corners are transparent; no non-black RGB contamination exists in fully transparent pixels; anti-aliased partial alpha is present at edges. |
| Lighting and shadow | **PASS** | Visual inspection of the source strip and five candidates shows consistent top-left highlights, darker lower/right foliage and a soft contact shadow below/right. No baked opaque background or checkerboard is present. |
| Perspective and style | **PASS** | Upright 2.5D/isometric crop read, cozy bright cartoon palette, clear silhouette at source and reduced size, no pixel-art, realistic background or dark/gritty treatment. Leaf and root detail remains subordinate to silhouette. |
| Metadata and provenance | **PASS** | `source=internal-generated`; creator/tool recorded; `contentVersion=mvp-1`, `styleGuideVersion=B02.1`; `license=PENDING_OWNER_REVIEW`, `toolVersion=PENDING_OWNER_REVIEW`; `production_ready=false`, `approved=false`. |

## Canonical files checked

The five files below match the manifest order exactly:

```text
crop_carrot_seed.png
crop_carrot_stage_1.png
crop_carrot_stage_2.png
crop_carrot_stage_3.png
crop_carrot_ready.png
```

Manifest contract verified against `assets-src/manifests/animation-manifest.json`:

```text
canvas:       256 × 256
sourceScale:  2
anchor:       (0.5, 0.9)
renderOffset: (0, 0)
atlas:        crops
background:   transparent
asset type:   static crop stages (no invented animation/FPS/events)
baseline:     Y=230 edge
```

## Evidence

| ID | Alpha bounding box | Visible W×H | Baseline | SHA-256 (candidate) |
|---|---:|---:|---:|---|
| `crop_carrot_seed` | `(114,206)-(147,230)` | `33×24` | `230` | `5fdcad6af1e2f23170ade9b80173a0bf1b480de6f13084e4d47c79e4d90b81ad` |
| `crop_carrot_stage_1` | `(106,196)-(147,230)` | `41×34` | `230` | `eac660a1118ecd86c9633309782827cf12c0656c9c3a7c96cdbfa198f5468443` |
| `crop_carrot_stage_2` | `(84,170)-(174,230)` | `90×60` | `230` | `b8646817afc38da3dff2fc4c4e4440a80ce7cfbea60d6d0abcbb39cd5d70d8db` |
| `crop_carrot_stage_3` | `(81,128)-(180,230)` | `99×102` | `230` | `3d6f93d6baba57eda130007926c3631d9ba70f208cf316e50c851aaffbd3740f` |
| `crop_carrot_ready` | `(62,70)-(193,230)` | `131×160` | `230` | `d24f31fe1f81b7da469b863328c1bd7b4c55454f75deed5bae40fd28074f6b2a` |

`ART_METADATA.json` and `ART_QA.json` are the machine-readable evidence for the same measurements. `carrot-stage-strip.png` is source-generation evidence only and is not a production asset.

## Recommendation

**Technical: PASS. Style: PASS.** The set passed the Integration Owner cross-asset gate and was promoted to `assets-src/crops/**`. Release approval remains pending because `license=PENDING_OWNER_REVIEW`.


## Final Integration Owner decision

- Technical review: **PASS**.
- Style/cross-asset review: **PASS**.
- Promotion: **PROMOTED**; all five canonical PNGs copied to `assets-src/crops/**` and packed into the production crops atlas.
- Runtime metadata: `placeholder=false`, `production_ready=true`, `approved=false`, `approvalRef=null`.
- Provenance remains `source=internal-generated`; `license=PENDING_OWNER_REVIEW` and `toolVersion=PENDING_OWNER_REVIEW` are retained. License/content approval is required before release approval.
- Evidence: `docs/assets/review/WAVE1_INTEGRATION_REVIEW.md` and `docs/assets/review/WAVE1_INTEGRATION_REVIEW.json`.
