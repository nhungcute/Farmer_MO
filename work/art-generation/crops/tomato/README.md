# ART-05 Tomato generation workspace

This directory is the exclusive workspace for the Tomato Asset Owner. It is intentionally outside `assets-src` and is not consumed by the runtime or atlas build.

Canonical IDs, in order:

```text
crop_tomato_seed
crop_tomato_stage_1
crop_tomato_stage_2
crop_tomato_stage_3
crop_tomato_ready
```

Contract: `256×256` RGBA, `sourceScale=2`, anchor `(0.5,0.9)`, render offset `(0,0)`, transparent background. Read the canonical manifest before adding any candidate. Keep one coherent Tomato identity across all five stages. Record source/tool/license metadata beside the candidate set; do not invent a license or set an approval flag.
