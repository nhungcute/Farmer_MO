# ART-01 — Chicken production artwork kickoff

| Field | Value |
|---|---|
| Task ID | ART-01 |
| Name | Chicken production artwork (B02.2-FULL) |
| Status | **RUNNING — kickoff only** |
| Owner | Art production workstream |
| Parent gate | B02.2-FULL (queued) |
| Contract source | [`assets-src/manifests/animation-manifest.json`](../../../../assets-src/manifests/animation-manifest.json) |
| Visual contract | [`docs/assets/CHICKEN_PRODUCTION_CONTRACT.md`](../../../assets/CHICKEN_PRODUCTION_CONTRACT.md) |
| Style guide | [`docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md`](../../../assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md) |
| Working area | [`work/art-generation/chicken/`](../../../../work/art-generation/chicken/) |
| Production source | `assets-src/animals/chicken/` (locked until candidate approval) |

This task records the production-artwork intake and generation contract. It does not replace any PNG, alter the canonical manifest, or change runtime behavior. The kickoff is RUNNING only because the work package has been opened; no production candidate has been submitted yet.

## Scope

- Produce the exact 92 unique Chicken source PNGs in the canonical order below.
- Preserve the existing Chicken identity and the B02.1 style direction: cozy, bright, cute 2.5D isometric cartoon, soft top-left light, bottom-right contact shadow, readable mobile silhouette.
- Supply source/license/creator/tool evidence for every frame or a clearly documented shared source group.
- Submit a candidate batch into review only after all technical, visual, provenance, and owner gates are evidenced.

## Explicit non-goals and protected paths

- Do not edit `assets-src/manifests/animation-manifest.json` or any generated/public manifest.
- Do not edit renderer, animation runtime, atlas schema/packer, API, backend, gameplay, economy, Tutorial, or content definitions.
- Do not mirror a frame; the contract has `mirrorAllowed=false`.
- Do not use the 13-frame B02.2-PROOF evidence as the production set. Proof remains outside `assets-src`.
- Do not mark `placeholder=false`, `production_ready=true`, or `approved=true` in this kickoff. Those values require the evidence and approvals defined below.
- Do not copy generated proof PNGs into `assets-src/animals/chicken/`.

## Canonical asset contract

The values below are copied from the canonical animation manifest and must remain unchanged:

| Property | Locked value |
|---|---|
| Animation ID | `animal_chicken` |
| Atlas | `chicken` |
| Directions | `NE`, `SE`, `SW`, `NW` (four real directions) |
| Default direction | `SE` |
| Mirror | `false` (`mirrorAllowed=false`) |
| Canvas | `256 x 256` pixels for every frame |
| Format | RGBA PNG with real transparent alpha |
| Source scale | `2` |
| Anchor | `{ "x": 0.5, "y": 0.9 }` |
| Render offset | `{ "x": 0, "y": 0 }` |
| Source path pattern | `assets-src/animals/chicken/<frame-id>.png` |
| Content version | `mvp-1` (manifest value at kickoff) |

### Exact 92-frame matrix

Every entry below is required exactly once. A missing, duplicated, renamed, or extra Chicken frame fails the contract.

| State | FPS | Loop | Hold last | Event | NE | SE | SW | NW |
|---|---:|:---:|:---:|---|---|---|---|---|
| `IDLE` | 6 | yes | no | — | `animal_chicken_idle_ne_00..03` (4) | `animal_chicken_idle_se_00..03` (4) | `animal_chicken_idle_sw_00..03` (4) | `animal_chicken_idle_nw_00..03` (4) |
| `WALK` | 8 | yes | no | — | `animal_chicken_walk_ne_00..05` (6) | `animal_chicken_walk_se_00..05` (6) | `animal_chicken_walk_sw_00..05` (6) | `animal_chicken_walk_nw_00..05` (6) |
| `EAT` | 10 | no | yes | `FEED_CONSUMED@2` | `animal_chicken_eat_ne_00..04` (5) | `animal_chicken_eat_se_00..04` (5) | `animal_chicken_eat_sw_00..04` (5) | `animal_chicken_eat_nw_00..04` (5) |
| `HAPPY` | 8 | no | yes | — | `animal_chicken_happy_ne_00..03` (4) | `animal_chicken_happy_se_00..03` (4) | `animal_chicken_happy_sw_00..03` (4) | `animal_chicken_happy_nw_00..03` (4) |
| `SLEEP` | 3 | yes | no | — | `animal_chicken_sleep_ne_00..01` (2) | `animal_chicken_sleep_se_00..01` (2) | `animal_chicken_sleep_sw_00..01` (2) | `animal_chicken_sleep_nw_00..01` (2) |
| `PRODUCT_READY` | 2 | yes | no | — | `animal_chicken_product_ready_ne_00..01` (2) | `animal_chicken_product_ready_se_00..01` (2) | `animal_chicken_product_ready_sw_00..01` (2) | `animal_chicken_product_ready_nw_00..01` (2) |
| **Total** | — | — | — | — | **23** | **23** | **23** | **23** |

The manifest expands to the following **92 exact filenames** (the `.png` suffix is part of each required source filename):

```text
IDLE
  animal_chicken_idle_ne_00.png  animal_chicken_idle_ne_01.png  animal_chicken_idle_ne_02.png  animal_chicken_idle_ne_03.png
  animal_chicken_idle_se_00.png  animal_chicken_idle_se_01.png  animal_chicken_idle_se_02.png  animal_chicken_idle_se_03.png
  animal_chicken_idle_sw_00.png  animal_chicken_idle_sw_01.png  animal_chicken_idle_sw_02.png  animal_chicken_idle_sw_03.png
  animal_chicken_idle_nw_00.png  animal_chicken_idle_nw_01.png  animal_chicken_idle_nw_02.png  animal_chicken_idle_nw_03.png

WALK
  animal_chicken_walk_ne_00.png  animal_chicken_walk_ne_01.png  animal_chicken_walk_ne_02.png  animal_chicken_walk_ne_03.png  animal_chicken_walk_ne_04.png  animal_chicken_walk_ne_05.png
  animal_chicken_walk_se_00.png  animal_chicken_walk_se_01.png  animal_chicken_walk_se_02.png  animal_chicken_walk_se_03.png  animal_chicken_walk_se_04.png  animal_chicken_walk_se_05.png
  animal_chicken_walk_sw_00.png  animal_chicken_walk_sw_01.png  animal_chicken_walk_sw_02.png  animal_chicken_walk_sw_03.png  animal_chicken_walk_sw_04.png  animal_chicken_walk_sw_05.png
  animal_chicken_walk_nw_00.png  animal_chicken_walk_nw_01.png  animal_chicken_walk_nw_02.png  animal_chicken_walk_nw_03.png  animal_chicken_walk_nw_04.png  animal_chicken_walk_nw_05.png

EAT
  animal_chicken_eat_ne_00.png  animal_chicken_eat_ne_01.png  animal_chicken_eat_ne_02.png  animal_chicken_eat_ne_03.png  animal_chicken_eat_ne_04.png
  animal_chicken_eat_se_00.png  animal_chicken_eat_se_01.png  animal_chicken_eat_se_02.png  animal_chicken_eat_se_03.png  animal_chicken_eat_se_04.png
  animal_chicken_eat_sw_00.png  animal_chicken_eat_sw_01.png  animal_chicken_eat_sw_02.png  animal_chicken_eat_sw_03.png  animal_chicken_eat_sw_04.png
  animal_chicken_eat_nw_00.png  animal_chicken_eat_nw_01.png  animal_chicken_eat_nw_02.png  animal_chicken_eat_nw_03.png  animal_chicken_eat_nw_04.png

HAPPY
  animal_chicken_happy_ne_00.png  animal_chicken_happy_ne_01.png  animal_chicken_happy_ne_02.png  animal_chicken_happy_ne_03.png
  animal_chicken_happy_se_00.png  animal_chicken_happy_se_01.png  animal_chicken_happy_se_02.png  animal_chicken_happy_se_03.png
  animal_chicken_happy_sw_00.png  animal_chicken_happy_sw_01.png  animal_chicken_happy_sw_02.png  animal_chicken_happy_sw_03.png
  animal_chicken_happy_nw_00.png  animal_chicken_happy_nw_01.png  animal_chicken_happy_nw_02.png  animal_chicken_happy_nw_03.png

SLEEP
  animal_chicken_sleep_ne_00.png  animal_chicken_sleep_ne_01.png
  animal_chicken_sleep_se_00.png  animal_chicken_sleep_se_01.png
  animal_chicken_sleep_sw_00.png  animal_chicken_sleep_sw_01.png
  animal_chicken_sleep_nw_00.png  animal_chicken_sleep_nw_01.png

PRODUCT_READY
  animal_chicken_product_ready_ne_00.png  animal_chicken_product_ready_ne_01.png
  animal_chicken_product_ready_se_00.png  animal_chicken_product_ready_se_01.png
  animal_chicken_product_ready_sw_00.png  animal_chicken_product_ready_sw_01.png
  animal_chicken_product_ready_nw_00.png  animal_chicken_product_ready_nw_01.png
```

The compact ranges above expand to these exact per-direction counts:

```text
IDLE           4 frames x 4 directions = 16
WALK           6 frames x 4 directions = 24
EAT            5 frames x 4 directions = 20
HAPPY          4 frames x 4 directions = 16
SLEEP          2 frames x 4 directions =  8
PRODUCT_READY  2 frames x 4 directions =  8
                                      --------
                                      92 frames
```

`EAT` is zero-based: frame index `2` is the only `FEED_CONSUMED` event for each direction. It must not be moved to accommodate artwork timing.

## Identity lock

All 92 frames must read as one Chicken character. Preserve the approved concept and the following locked features across states and directions:

- eye design and placement;
- comb topology and red accent;
- beak shape and warm yellow accent;
- feather palette and warm body shadow;
- large wing feather motif;
- large tail motif;
- leg color and foot scale;
- overall body/head/torso proportion;
- top-left lighting direction and bottom-right soft shadow;
- baseline/contact treatment and `0.5,0.9` anchor behavior.

Minor production notes from B02.2-PROOF Revision 2 remain applicable: maintain direction scale consistency, reduce distracting micro-feather detail, keep shading soft rather than glossy/3D, and make the full five-frame EAT motion readable. These notes do not authorize a redesign or a new character variant.

## Technical acceptance gate

Before a batch can be submitted for review, record evidence for all of the following:

- [ ] Exactly 92 PNG files exist under the canonical Chicken source path and match the frame matrix above.
- [ ] Every file is readable RGBA PNG, exactly `256 x 256`, with genuine transparent margins and no baked checkerboard/background.
- [ ] Manifest values are unchanged: IDs, ordering, FPS, loop, holdLast, event, directions, atlas, source scale, anchor, offset, and mirror flag.
- [ ] All four directions are authored; no mirrored substitute is used.
- [ ] Body perceived height/width, head diameter, torso volume, feet scale, tail volume, baseline, and anchor remain consistent across directions and states. Use comparison evidence rather than alpha baseline alone.
- [ ] `EAT` has five frames per direction, is `10 FPS`, `loop=false`, `holdLast=true`, and fires `FEED_CONSUMED` at zero-based frame `2`.
- [ ] IDLE and WALK loops are closed; HAPPY is readable and non-flashy; SLEEP is subtle; PRODUCT_READY is distinct and restrained.
- [ ] No crop, feet, body, shadow, or highlight pop appears in adjacent frames; no texture bleeding or alpha fringe is present.
- [ ] Required commands pass on the candidate batch: `node tools/asset-inventory.mjs`, `npm run assets:validate`, `npm run assets:validate:strict`, renderer syntax/tests, and `npm run check`.
- [ ] Desktop, mobile, and stress evidence covers viewports `932x430`, `915x412`, `844x390`, `740x360` and Chicken counts `1`, `25`, `50`, `100`.

Technical validation is necessary but does not grant style or release approval.

## Provenance and approval record

Every frame, or a source group that unambiguously covers a frame set, must provide this mapping. Empty or `PENDING` values are blockers; they must not be invented to make a candidate appear complete.

```json
{
  "source": "<original source URI/path or authored source record>",
  "creator": "<person/team/studio>",
  "tool": "<authoring or render tool>",
  "toolVersion": "<exact version>",
  "license": "<license and permitted use>",
  "contentVersion": "mvp-1",
  "placeholder": false,
  "production_ready": false,
  "technicalReview": "PENDING",
  "styleReview": "PENDING",
  "approvalRef": null
}
```

`production_ready` can become `true` only after technical validation plus complete source/license evidence. `approved` is intentionally absent from this kickoff record; the owner/art/release approver must provide a real `approvalRef` before it can be set. Agent-generated text is not approval evidence.

## Current blockers and handoff

- Production artwork has not been supplied or authored in this work package.
- Source, creator, tool version, license, technical evidence, style evidence, and owner/release approval are therefore pending.
- Existing placeholder PNGs remain the current production source until a complete candidate batch is reviewed; do not partially replace them.
- B02.2-FULL remains **QUEUED** and B02 production remains blocked. ART-01 may move to `REVIEW` only after the 92-frame candidate and every acceptance/provenance item above is complete.

The next handoff is to create or receive the complete candidate in `work/art-generation/chicken/`, validate it against this document, then submit an evidence-only review. No production copy is authorized by this kickoff document.
