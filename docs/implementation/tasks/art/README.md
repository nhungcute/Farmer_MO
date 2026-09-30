# B02 Production Artwork — Parallel Art Wave 1

Wave 1 starts five independent asset-owner tasks. Each task owns one complete asset type, including every state, stage or direction required by the canonical manifest. No task may split one asset type across workers.

| Task | Asset owner | Exclusive workspace | Canonical production family | Status |
|---|---|---|---|---|
| ART-01 | Chicken Asset Owner | `work/art-generation/chicken/**` | `animal_chicken` | RUNNING — 92/92; visual/style + EAT/WALK revision required |
| ART-02 | Rice Asset Owner | `work/art-generation/crops/rice/**` | Rice crop IDs from manifest | DONE — 5/5 promoted; technical/style PASS; license pending |
| ART-03 | Carrot Asset Owner | `work/art-generation/crops/carrot/**` | Carrot crop IDs from manifest | DONE — 5/5 promoted; technical/style PASS; license pending |
| ART-04 | Corn Asset Owner | `work/art-generation/crops/corn/**` | Corn crop IDs from manifest | RUNNING — 5/5; detached alpha fragments require revision |
| ART-05 | Tomato Asset Owner | `work/art-generation/crops/tomato/**` | Tomato crop IDs from manifest | RUNNING — 5/5; detached alpha fragments require revision |

All five tasks read [`MO_FARM_PRODUCTION_STYLE_GUIDE.md`](../../../assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md) and the canonical [`animation-manifest.json`](../../../../assets-src/manifests/animation-manifest.json). The manifest is authoritative for IDs, frame counts, canvas, source scale, anchor, render offset, direction, FPS, loop, hold-last and events.

## Isolation rules

- A worker writes only its exclusive `work/art-generation/**` path and its own status file in this directory.
- Workers do not edit `assets-src/**`, manifests, atlas output, runtime, renderer, API, database, economy, gameplay, Tutorial, Cloudflare or RC01.
- Production promotion is a separate Integration Owner step after task `REVIEW`; generation workers cannot set `approved=true` or `production_ready=true`. A real generated candidate may record `placeholder=false`; the canonical production source is changed only by the Integration Owner after review (Rice/Carrot are now promoted).
- Unknown license/source information remains `PENDING_OWNER_REVIEW`; no metadata is invented.
- Integration Owner cross-asset review is complete for the passing Rice/Carrot candidates. Failed asset types remain isolated for targeted revision; no passing asset is regenerated.

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

## Wave 1 integration outcome — 2026-09-30

- Promoted: Rice `5/5` + Carrot `5/5` = **10/112** canonical candidates.
- Promotion metadata: `placeholder=false`, `production_ready=true`, `approved=false`, `license=PENDING_OWNER_REVIEW`.
- Revision required: Chicken (gloss/micro-detail and WALK/EAT visual motion proof), Corn (detached alpha fragments), Tomato (detached alpha fragments).
- No production files for Chicken, Corn or Tomato were changed. No new artwork is generated in this review stage.

Wave 1 promotion is partial: Rice and Carrot are promoted (`10/112` candidates), while Chicken, Corn and Tomato remain in revision. Wave 2 assets such as Pond, Farmhouse, Warehouse, Chicken Coop, Effects, Terrain and UI are not started. Cloudflare and RC01 remain closed.

Kickoff integrity can be checked with:

```text
node tools/validate-art-wave.mjs
```

The validator compares each task metadata template with the canonical manifest, checks the five isolated workspaces and rejects unsafe production flags.
