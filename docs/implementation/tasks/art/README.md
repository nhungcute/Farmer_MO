# B02 Production Artwork — Parallel Art Wave 1

Wave 1 starts five independent asset-owner tasks. Each task owns one complete asset type, including every state, stage or direction required by the canonical manifest. No task may split one asset type across workers.

| Task | Asset owner | Exclusive workspace | Canonical production family | Status |
|---|---|---|---|---|
| ART-01 | Chicken Asset Owner | `work/art-generation/chicken/**` | `animal_chicken` | REVIEW ? 92/92 generated; QA PASS |
| ART-02 | Rice Asset Owner | `work/art-generation/crops/rice/**` | Rice crop IDs from manifest | REVIEW ? 5/5 generated; QA PASS |
| ART-03 | Carrot Asset Owner | `work/art-generation/crops/carrot/**` | Carrot crop IDs from manifest | REVIEW ? 5/5 generated; QA PASS |
| ART-04 | Corn Asset Owner | `work/art-generation/crops/corn/**` | Corn crop IDs from manifest | REVIEW ? 5/5 generated; QA PASS |
| ART-05 | Tomato Asset Owner | `work/art-generation/crops/tomato/**` | Tomato crop IDs from manifest | REVIEW ? 5/5 generated; QA PASS |

All five tasks read [`MO_FARM_PRODUCTION_STYLE_GUIDE.md`](../../../assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md) and the canonical [`animation-manifest.json`](../../../../assets-src/manifests/animation-manifest.json). The manifest is authoritative for IDs, frame counts, canvas, source scale, anchor, render offset, direction, FPS, loop, hold-last and events.

## Isolation rules

- A worker writes only its exclusive `work/art-generation/**` path and its own status file in this directory.
- Workers do not edit `assets-src/**`, manifests, atlas output, runtime, renderer, API, database, economy, gameplay, Tutorial, Cloudflare or RC01.
- Production promotion is a separate Integration Owner step after task `REVIEW`; generation workers cannot set `approved=true` or `production_ready=true`. A real generated candidate may record `placeholder=false`, while the canonical production source remains unchanged.
- Unknown license/source information remains `PENDING_OWNER_REVIEW`; no metadata is invented.
- Cross-asset review happens only after all five task candidates reach `REVIEW`.

## Gate sequence

```text
canonical manifest audit
        ↓
owner generation in isolated workspace
        ↓
local dimensions / alpha / scale / style / continuity QA
        ↓
task REVIEW
        ↓
Integration Owner cross-asset review
        ↓
candidate promotion decision (separate change)
```

Wave 1 stops after the five task reports. Wave 2 assets such as Pond, Farmhouse, Warehouse, Chicken Coop, Effects, Terrain and UI are not started automatically.

Kickoff integrity can be checked with:

```text
node tools/validate-art-wave.mjs
```

The validator compares each task metadata template with the canonical manifest, checks the five isolated workspaces and rejects unsafe production flags.
