# ART-02 Rice — Integration Review Report

**Review date:** 2026-09-30  
**Reviewer:** REVIEW-02 + Integration Owner  
**Scope:** `work/art-generation/crops/rice/**` only  
**Production boundary:** candidate review was isolated; the Integration Owner subsequently promoted the passing set and repacked the crops atlas.

## Decision

| Gate | Result |
|---|---|
| Technical contract | **PASS** |
| Style / visual review | **PASS** (final cross-asset owner review still required) |
| Promotion recommendation | **HOLD — Integration Owner review and owner/license approval required** |

The five Rice candidates satisfy the isolated candidate contract. They were reviewed as candidates and subsequently promoted by the Integration Owner after the cross-asset gate passed.

## Canonical set and file count

The candidate directory contains exactly these five PNGs, in manifest growth order:

```text
crop_rice_seed.png
crop_rice_stage_1.png
crop_rice_stage_2.png
crop_rice_stage_3.png
crop_rice_ready.png
```

Independent filename/manifest comparison: **PASS**. No extra Rice candidate ID was found.

## Independent technical evidence

All five files were re-opened from disk with Pillow during this review.

| ID | Canvas / mode | Alpha bbox (threshold 1) | Painted W × H | Contact Y |
|---|---|---:|---:|---:|
| `crop_rice_seed` | 256 × 256 / RGBA | `[106,184,149,230]` | 43 × 46 | 229 |
| `crop_rice_stage_1` | 256 × 256 / RGBA | `[85,138,170,230]` | 85 × 92 | 229 |
| `crop_rice_stage_2` | 256 × 256 / RGBA | `[63,94,192,230]` | 129 × 136 | 229 |
| `crop_rice_stage_3` | 256 × 256 / RGBA | `[44,56,211,230]` | 167 × 174 | 229 |
| `crop_rice_ready` | 256 × 256 / RGBA | `[42,48,214,230]` | 172 × 182 | 229 |

Checks:

- Every PNG is `256×256`, `RGBA`, with alpha extrema `(0,255)`.
- Every file has transparent margins; no non-transparent pixel touches any canvas edge.
- Fully transparent pixels have RGB `(0,0,0)`; no baked beige, checkerboard or matte background was detected.
- Contact point is stable at `y=229` for all five candidates (`0 px` jitter); no per-stage render offset is needed.
- Metadata and candidate files agree on `sourceScale=2`, anchor `{x:0.5,y:0.9}`, render offset `{x:0,y:0}`, and atlas `crops`.
- Candidates are outside production paths; metadata records `manifestChanged=false` and `atlasChanged=false`.

## Growth, scale and visual review

The progression is readable and ordered: seed → single sprout → expanding clump → mature panicle → ready golden panicles. Painted heights are strictly increasing (`46, 92, 136, 174, 182 px`) and widths increase without a perspective reset (`43, 85, 129, 167, 172 px`). The baseline remains stable while the plant grows upward, so no stage appears to jump because of canvas cropping or a hidden offset.

Visual evidence reviewed:

- `previews/rice-growth-strip.png`: coherent five-stage silhouette and consistent camera/perspective.
- `previews/rice-runtime-size-comparison.png`: stage 2 and ready remain identifiable at 100%, 75% and 50%; fine detail does not replace the silhouette.
- `candidates/crop_rice_stage_3.png` and `candidates/crop_rice_ready.png`: mature and ready states have a clear warm golden grain distinction while preserving the same plant identity.

Style findings:

- cozy, bright, illustrated 2.5D crop treatment: **PASS**;
- consistent top-left highlights and softer lower/right shading: **PASS**;
- restrained internal detail with readable silhouette at mobile review sizes: **PASS**;
- ready state distinguishable by mature golden panicles; `crop_ready_glow` is not baked into the crop: **PASS**;
- no obvious perspective, scale, shadow or alpha-fringe blocker found.

## Provenance and approval boundary

The candidate metadata contains the required provenance fields: `source=internal-generated`, creator/tool references, `contentVersion=mvp-1`, style guide version, and explicit `production_ready` / `approved` flags; production metadata is now `production_ready=true` and `approved=false` after promotion. `toolVersion` and `license` remain `PENDING_OWNER_REVIEW`; no value was inferred here. Final creator/tool/license confirmation and `approvalRef` remain outside this review.

## Handoff

`ART-02` is complete for technical/style promotion. The Integration Owner promoted all five files, regenerated the crops atlas, and passed strict validation. Keep `approved=false` until the pending license/content approval is resolved.


## Final Integration Owner decision

- Technical review: **PASS**.
- Style/cross-asset review: **PASS**.
- Promotion: **PROMOTED**; all five canonical PNGs copied to `assets-src/crops/**` and packed into the production crops atlas.
- Runtime metadata: `placeholder=false`, `production_ready=true`, `approved=false`, `approvalRef=null`.
- Provenance remains `source=internal-generated`; `license=PENDING_OWNER_REVIEW` and `toolVersion=PENDING_OWNER_REVIEW` are retained. License/content approval is required before release approval.
- Evidence: `docs/assets/review/WAVE1_INTEGRATION_REVIEW.md` and `docs/assets/review/WAVE1_INTEGRATION_REVIEW.json`.
