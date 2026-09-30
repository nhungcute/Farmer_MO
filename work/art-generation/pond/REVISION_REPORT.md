# REV-06 Pond Revision 2

Status: **REVIEW**

The ripple and sparkle overlays were hard-clipped to a conservative inner-water mask derived from the unchanged pond base. The mask uses the dominant blue/cyan water component, fills enclosed texture/lily-pad holes, and erodes the shoreline by two pixels.

## Contract preserved

- 19/19 canonical IDs retained.
- Every frame remains 512x384 RGBA with transparent alpha and no hidden matte.
- Base and all eight water frames are byte-for-byte unchanged.
- Ripple remains 6 frames at 10 FPS, looping, `holdLast=false`.
- Sparkle remains 4 frames at 8 FPS, looping, `holdLast=false`.
- Frame order, anchor/pivot, render offsets, geometry, palette, and motion timing are unchanged.

## Changed IDs

* pond_small_lv1_ripple_00
* pond_small_lv1_ripple_01
* pond_small_lv1_ripple_02
* pond_small_lv1_ripple_03
* pond_small_lv1_ripple_04
* pond_small_lv1_ripple_05
* pond_small_lv1_sparkle_00
* pond_small_lv1_sparkle_02
* pond_small_lv1_sparkle_03

## Unchanged IDs

* pond_small_lv1_base
* pond_small_lv1_water_00
* pond_small_lv1_water_01
* pond_small_lv1_water_02
* pond_small_lv1_water_03
* pond_small_lv1_water_04
* pond_small_lv1_water_05
* pond_small_lv1_water_06
* pond_small_lv1_water_07
* pond_small_lv1_sparkle_01

## Containment QA

All changed frames have zero alpha outside the hard inner-water mask. The two-pixel erosion is the documented antialias safety margin; no overlay pixel is allowed on the rim, grass, rocks, or transparent exterior.

Evidence: [pond-mask-review-v2.png](reviews/pond-mask-review-v2.png) and [pond-inner-water-mask-v2.png](reviews/pond-inner-water-mask-v2.png). Machine-readable evidence: [REVISION_QA.json](REVISION_QA.json).

Promotion was not performed. The candidate remains under `work/art-generation/pond/**` pending Integration Owner review.
