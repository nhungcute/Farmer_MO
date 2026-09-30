# ART-04 Corn generation workspace

This directory is the exclusive workspace for the Corn Asset Owner. It is intentionally outside `assets-src` and is not consumed by the runtime or atlas build.

Canonical IDs, in order:

```text
crop_corn_seed
crop_corn_stage_1
crop_corn_stage_2
crop_corn_stage_3
crop_corn_ready
```

Contract: `256×256` RGBA, `sourceScale=2`, anchor `(0.5,0.9)`, render offset `(0,0)`, transparent background. Read the canonical manifest before adding any candidate. Keep one coherent Corn identity across all five stages. Record source/tool/license metadata beside the candidate set; do not invent a license or set an approval flag.
