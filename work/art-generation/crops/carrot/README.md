# ART-03 Carrot generation workspace

This directory is the exclusive workspace for the Carrot Asset Owner. It is intentionally outside `assets-src` and is not consumed by the runtime or atlas build.

Canonical static IDs, in manifest order:

```text
crop_carrot_seed
crop_carrot_stage_1
crop_carrot_stage_2
crop_carrot_stage_3
crop_carrot_ready
```

Canonical source: `assets-src/manifests/animation-manifest.json`.

Contract: `256x256` RGBA, `sourceScale=2`, anchor `(0.5,0.9)`, render offset `(0,0)`, atlas group `crops`, transparent background. The manifest defines these as static crop assets; do not add a Carrot animation entry or invent FPS/loop/events. Read the canonical manifest and `docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md` before adding candidates.

Keep one coherent Carrot identity across all five stages. Preserve a stable crop footprint and baseline, with the orange root becoming readable only at the ready stage. Record source/tool/license metadata beside the candidate set. Do not invent a license, set `placeholder=false`, set `production_ready=true`, set `approved=true`, or copy candidates into `assets-src` from this workspace.
