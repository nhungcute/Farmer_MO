# REVIEW-06 POND ? Integration review

**Recommendation:** `REVISION_REQUIRED`

## Expected
19/19 exact canonical candidates; each 512?384 RGBA with transparent alpha; base/water/ripple/sparkle layers aligned to one pond footprint; water 12 FPS loop, ripple 10 FPS loop, sparkle 8 FPS loop; no layer leaves pond geometry.

## Found
19/19 IDs and files. All canvases 512?384 RGBA with real alpha and zero fully-transparent RGB matte. All overlays are 100% inside the base outer alpha silhouette. Base painted bbox [18, 19, 494, 347]. Visual review shows a coherent isometric pond, readable at 50% source/mobile scale, fixed top-left light and lower-right shadow. Inner water containment: water frames 93.6?94.5%, ripple frames 72.2?93.1%, sparkle frames 52.4?70.0%; several low-opacity ripple/sparkle pixels reach the shoreline/rim rather than water-only area.

## Gate results

- **TECHNICAL:** `PASS`
- **STYLE:** `PASS`
- **CONTENT:** `PASS`
- **MOBILE:** `PASS`
- **ANIMATION:** `FAIL`

## Issues
- Ripple/sparkle frames remain within the outer pond silhouette, but the transparent overlays are not clipped to the inner water mask. Ripple frames ripple_00 through ripple_05 and sparkle frames sparkle_00 through sparkle_03 include pixels on the shoreline/rim; this can read as a ripple moving onto grass/rock at runtime. Clip/reposition overlays to the water surface before promotion.
- The existing reviews/QA.json is stale for base and water frame file hashes (current ART_METADATA.json and ART_QA.json match the actual files); regenerate review QA after the visual fix.

## Evidence
- `reviews/pond-animation-candidates.png`
- `reviews/pond-composited-frames.png`
- `reviews/pond-water-boundary-review.png`
- `reviews/pond-ripple-boundary-review-zoom.png`
- `reviews/pond-sparkle-boundary-review.png`
- `ART_METADATA.json`
- `ART_QA.json`

This review is read-only against `assets-src/**`, canonical manifests, atlas outputs, production inventory, gameplay and renderer.
