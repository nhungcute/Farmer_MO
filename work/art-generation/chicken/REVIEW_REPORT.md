# ART-01 Chicken — independent candidate review

**Review date:** 2026-09-30  
**Reviewer:** REVIEW-01 (Integration Owner review stream)  
**Scope:** `work/art-generation/chicken/**` only. No production source, manifest, atlas, renderer, runtime, or gameplay files were changed.

## Decision

| Gate | Result | Evidence |
|---|---|---|
| Canonical inventory | **PASS** | 92 PNGs, exact manifest IDs, no missing or extra ID |
| File format and alpha | **PASS** | 92/92 readable RGBA PNG, `256x256`, non-empty alpha with transparent margins |
| Baseline and scale | **PASS** | alpha bottom `y=230` for every frame; width deviation `1.04%`, height deviation `0.39%` |
| Four real directions | **PASS** | NE/SE/SW/NW are distinct authored renders; no mirrored duplicate detected |
| Identity consistency | **PASS** | eye, comb, beak, wattle, body palette, wing/tail motif and leg color remain one Chicken across sheets |
| Lighting and edge treatment | **PASS** | top-left highlight and warm bottom/right volume remain consistent; transparent background; soft non-black edge |
| Micro-detail reduction | **REVISION_REQUIRED** | feather ridges and high-frequency highlights remain dense at runtime size |
| Shading direction | **REVISION_REQUIRED** | current master reads glossy/3D-rendered; reduce specular/high-frequency chest and wing shading for the locked soft illustrated target |
| IDLE loop | **PASS** | 4 frames/direction, all distinct, small closure deltas (`0.534–1.783px`) |
| WALK loop and foot cycle | **REVISION_REQUIRED** | six frame files exist and loop metadata is correct, but the visible feet do not perform a readable step cycle; frames are principally a small bob/rotation of one master |
| EAT motion | **REVISION_REQUIRED** | 5 frames/direction and event metadata are correct, but frame 2 is not a clear head/beak-to-feed contact pose; the visible change is mostly a vertical body bob |
| EAT event metadata | **PASS** | `FEED_CONSUMED` is present at zero-based frame 2 in all four directions |
| HAPPY | **PASS_WITH_MINOR_NOTE** | subtle bounce is coherent but expression/motion is low amplitude |
| SLEEP | **PASS** | restrained two-frame breathing loop |
| PRODUCT_READY | **PASS_WITH_MINOR_NOTE** | restrained two-frame pulse; owner should confirm that the state reads clearly beside IDLE |

**Technical result:** `PASS`  
**Style result:** `REVISION_REQUIRED`  
**Identity result:** `PASS`  
**Animation result:** `REVISION_REQUIRED` (WALK and EAT)  
**Promotion recommendation:** **BLOCKED — do not promote this batch to `assets-src/**` until the listed visual revisions are reviewed.**

This is a candidate review result. It does not change the generation provenance, owner approval, license state, or `production_ready=false` / `approved=false` flags.

## Contract checks

The canonical manifest was read from `assets-src/manifests/animation-manifest.json`; the expected 92 IDs were compared with the candidate filenames. The candidate contains:

```text
IDLE           4 frames x 4 directions = 16
WALK           6 frames x 4 directions = 24
EAT            5 frames x 4 directions = 20
HAPPY          4 frames x 4 directions = 16
SLEEP          2 frames x 4 directions =  8
PRODUCT_READY  2 frames x 4 directions =  8
                                      --------
                                      92
```

The manifest contract remains unchanged: Chicken `sourceScale=2`, anchor `{ x: 0.5, y: 0.9 }`, `mirrorAllowed=false`, and the existing FPS/loop/hold-last values. No runtime transform was introduced by this review.

## Independent technical evidence

The workspace QA was rerun with:

```text
python work/art-generation/chicken/run_qa.py
ART-01 QA PASS: 92/92 frames, 92/92 unique hashes, width deviation 1.04%, height deviation 0.39%
```

Additional checks performed during this review:

- Every PNG decoded successfully as RGBA and has an alpha bounding box fully inside the 256x256 canvas.
- Every alpha bounding box ends at exclusive `y=230`; no frame has a baseline failure.
- The 92 SHA-256 hashes are unique.
- Opposite-direction comparisons against a horizontal flip produce non-zero, high visual differences (approximately 25–53 mean RGB difference across tested clips), so the batch is not a mirror-only direction set.
- `candidate/reviews/state-direction-sheet.png`, `candidate/reviews/walk-se-proof.png`, `candidate/reviews/eat-se-proof.png`, and `candidate/reviews/runtime-size-sheet.png` were inspected at full resolution.

The generated `ART_QA.json` remains the technical QA source of truth. This report adds the independent visual/style gate; it does not overwrite technical `PASS` with a misleading aggregate result.

## Required revision before promotion

1. Keep all 92 IDs, canvas, baseline, anchor, direction, palette, facial identity, comb/beak topology, wing/tail motifs, and provenance fields unchanged.
2. Reduce small feather ridges and glossy/high-frequency chest/wing highlights by approximately the locked 15–25% visual target while keeping the large wing, tail, and chest groups readable.
3. Author a real six-frame WALK cycle per direction with visible alternating foot/leg phases and stable contact points; do not solve the issue with a runtime stretch or a one-master rotation.
4. Author a real five-frame EAT cycle per direction: frame 0→1 descends, frame 2 visibly places the head/beak at feed contact for `FEED_CONSUMED`, frame 3→4 returns smoothly, with stable torso width, feet, and shadow.
5. Re-run the workspace QA and regenerate the contact sheets after the revision. Keep the candidate isolated until Integration Owner and art owner approve the visual result.

No PNGs were regenerated by this review, and no files under `assets-src/**` were modified.

