# B01 Production Asset Inventory

Canonical source: `assets-src/manifests/animation-manifest.json` (SHA-256 `ab10fa4b48a5a068a4dbe5916df7f8cb5023e799428a1f9b306f736ee1e286e0`).

This inventory is generated from the current canonical manifest. Wave 1 has 112 production candidates (Chicken, Rice, Carrot, Corn and Tomato); 76 assets remain placeholders and all release approval is pending.

## Status

| Status | Current count | Meaning |
| --- | --- | --- |
| `placeholder` | 76 | Generated/internal art. Not eligible for production release. |
| `production_ready` | 112 | Replacement art supplied with license, style, technical validation, and source evidence; explicit content approval is still pending. |
| `approved` | 0 | Production-ready replacement explicitly approved for the target release. |

Current totals: **188 source assets**, **10 animation contracts**, **8 categories**.

## Category summary

| Category | Status | Assets | Animations | Scope |
| --- | --- | --- | --- | --- |
| `terrain` | `placeholder` | 5 | 0 | Isometric ground tile and variants. |
| `buildings` | `placeholder` | 3 | 0 | Farmhouse, warehouse, and chicken coop static views. |
| `crops` | `mixed` | 24 | 1 | Crop stages plus the ready-crop glow animation. |
| `animals` | `production_ready` | 0 | 1 | Runtime animal animation contracts; the current MVP species is chicken. |
| `chicken` | `production_ready` | 92 | 0 | Chicken frame PNG sources for all six states and four directions. |
| `pond` | `placeholder` | 19 | 3 | Pond base and water/ripple/sparkle layers. |
| `effects` | `placeholder` | 30 | 5 | Plant, harvest, build, coin, and egg one-shot effects. |
| `ui` | `placeholder` | 15 | 0 | HUD icons, loading/toast graphics, and build ghost states. |

The `animals` row records the runtime contract (`animal_chicken`); the `chicken` row records its concrete frame sources. This separation leaves room for future animal species without changing the current chicken IDs.

## Complete asset inventory

| ID | Category | Status | Canvas | Anchor/Pivot | Source |
| --- | --- | --- | --- | --- | --- |
| `terrain_grass_tile` | terrain | `placeholder` | 256×128 | 0.5,0.5 | `assets-src/terrain/terrain_grass_tile.png` |
| `terrain_grass_variant_01` | terrain | `placeholder` | 256×128 | 0.5,0.5 | `assets-src/terrain/terrain_grass_variant_01.png` |
| `terrain_grass_variant_02` | terrain | `placeholder` | 256×128 | 0.5,0.5 | `assets-src/terrain/terrain_grass_variant_02.png` |
| `terrain_grass_variant_03` | terrain | `placeholder` | 256×128 | 0.5,0.5 | `assets-src/terrain/terrain_grass_variant_03.png` |
| `terrain_grass_variant_04` | terrain | `placeholder` | 256×128 | 0.5,0.5 | `assets-src/terrain/terrain_grass_variant_04.png` |
| `building_farmhouse_lv1` | buildings | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/buildings/building_farmhouse_lv1.png` |
| `building_warehouse_lv1` | buildings | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/buildings/building_warehouse_lv1.png` |
| `building_chicken_coop_lv1` | buildings | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/buildings/building_chicken_coop_lv1.png` |
| `pond_small_lv1_base` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_base.png` |
| `icon_coin` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/icon_coin.png` |
| `icon_diamond` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/icon_diamond.png` |
| `icon_rice` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/icon_rice.png` |
| `icon_carrot` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/icon_carrot.png` |
| `icon_corn` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/icon_corn.png` |
| `icon_tomato` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/icon_tomato.png` |
| `icon_chicken_feed` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/icon_chicken_feed.png` |
| `icon_egg` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/icon_egg.png` |
| `icon_order` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/icon_order.png` |
| `ui_rotate_overlay` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/ui_rotate_overlay.png` |
| `ui_loading` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/ui_loading.png` |
| `ui_success_toast` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/ui_success_toast.png` |
| `ui_error_toast` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/ui_error_toast.png` |
| `build_ghost_valid` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/build_ghost_valid.png` |
| `build_ghost_invalid` | ui | `placeholder` | 128×128 | 0.5,0.5 | `assets-src/ui/build_ghost_invalid.png` |
| `pond_small_lv1_water_00` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_water_00.png` |
| `pond_small_lv1_water_01` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_water_01.png` |
| `pond_small_lv1_water_02` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_water_02.png` |
| `pond_small_lv1_water_03` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_water_03.png` |
| `pond_small_lv1_water_04` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_water_04.png` |
| `pond_small_lv1_water_05` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_water_05.png` |
| `pond_small_lv1_water_06` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_water_06.png` |
| `pond_small_lv1_water_07` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_water_07.png` |
| `pond_small_lv1_ripple_00` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_ripple_00.png` |
| `pond_small_lv1_ripple_01` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_ripple_01.png` |
| `pond_small_lv1_ripple_02` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_ripple_02.png` |
| `pond_small_lv1_ripple_03` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_ripple_03.png` |
| `pond_small_lv1_ripple_04` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_ripple_04.png` |
| `pond_small_lv1_ripple_05` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_ripple_05.png` |
| `pond_small_lv1_sparkle_00` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_sparkle_00.png` |
| `pond_small_lv1_sparkle_01` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_sparkle_01.png` |
| `pond_small_lv1_sparkle_02` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_sparkle_02.png` |
| `pond_small_lv1_sparkle_03` | pond | `placeholder` | 512×384 | 0.5,0.86 | `assets-src/ponds/pond_small_lv1_sparkle_03.png` |
| `crop_rice_seed` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_rice_seed.png` |
| `crop_rice_stage_1` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_rice_stage_1.png` |
| `crop_rice_stage_2` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_rice_stage_2.png` |
| `crop_rice_stage_3` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_rice_stage_3.png` |
| `crop_rice_ready` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_rice_ready.png` |
| `crop_carrot_seed` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_carrot_seed.png` |
| `crop_carrot_stage_1` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_carrot_stage_1.png` |
| `crop_carrot_stage_2` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_carrot_stage_2.png` |
| `crop_carrot_stage_3` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_carrot_stage_3.png` |
| `crop_carrot_ready` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_carrot_ready.png` |
| `crop_corn_seed` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_corn_seed.png` |
| `crop_corn_stage_1` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_corn_stage_1.png` |
| `crop_corn_stage_2` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_corn_stage_2.png` |
| `crop_corn_stage_3` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_corn_stage_3.png` |
| `crop_corn_ready` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_corn_ready.png` |
| `crop_tomato_seed` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_tomato_seed.png` |
| `crop_tomato_stage_1` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_tomato_stage_1.png` |
| `crop_tomato_stage_2` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_tomato_stage_2.png` |
| `crop_tomato_stage_3` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_tomato_stage_3.png` |
| `crop_tomato_ready` | crops | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/crops/crop_tomato_ready.png` |
| `crop_ready_glow_00` | crops | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/crop_ready_glow_00.png` |
| `crop_ready_glow_01` | crops | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/crop_ready_glow_01.png` |
| `crop_ready_glow_02` | crops | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/crop_ready_glow_02.png` |
| `crop_ready_glow_03` | crops | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/crop_ready_glow_03.png` |
| `fx_plant_00` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_plant_00.png` |
| `fx_plant_01` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_plant_01.png` |
| `fx_plant_02` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_plant_02.png` |
| `fx_plant_03` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_plant_03.png` |
| `fx_harvest_00` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_harvest_00.png` |
| `fx_harvest_01` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_harvest_01.png` |
| `fx_harvest_02` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_harvest_02.png` |
| `fx_harvest_03` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_harvest_03.png` |
| `fx_harvest_04` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_harvest_04.png` |
| `fx_harvest_05` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_harvest_05.png` |
| `fx_build_success_00` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_build_success_00.png` |
| `fx_build_success_01` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_build_success_01.png` |
| `fx_build_success_02` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_build_success_02.png` |
| `fx_build_success_03` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_build_success_03.png` |
| `fx_build_success_04` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_build_success_04.png` |
| `fx_build_success_05` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_build_success_05.png` |
| `fx_coin_gain_00` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_coin_gain_00.png` |
| `fx_coin_gain_01` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_coin_gain_01.png` |
| `fx_coin_gain_02` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_coin_gain_02.png` |
| `fx_coin_gain_03` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_coin_gain_03.png` |
| `fx_coin_gain_04` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_coin_gain_04.png` |
| `fx_coin_gain_05` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_coin_gain_05.png` |
| `fx_coin_gain_06` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_coin_gain_06.png` |
| `fx_coin_gain_07` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_coin_gain_07.png` |
| `fx_egg_collect_00` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_egg_collect_00.png` |
| `fx_egg_collect_01` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_egg_collect_01.png` |
| `fx_egg_collect_02` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_egg_collect_02.png` |
| `fx_egg_collect_03` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_egg_collect_03.png` |
| `fx_egg_collect_04` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_egg_collect_04.png` |
| `fx_egg_collect_05` | effects | `placeholder` | 256×256 | 0.5,0.5 | `assets-src/effects/fx_egg_collect_05.png` |
| `animal_chicken_idle_ne_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_ne_00.png` |
| `animal_chicken_idle_ne_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_ne_01.png` |
| `animal_chicken_idle_ne_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_ne_02.png` |
| `animal_chicken_idle_ne_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_ne_03.png` |
| `animal_chicken_idle_se_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_se_00.png` |
| `animal_chicken_idle_se_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_se_01.png` |
| `animal_chicken_idle_se_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_se_02.png` |
| `animal_chicken_idle_se_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_se_03.png` |
| `animal_chicken_idle_sw_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_sw_00.png` |
| `animal_chicken_idle_sw_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_sw_01.png` |
| `animal_chicken_idle_sw_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_sw_02.png` |
| `animal_chicken_idle_sw_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_sw_03.png` |
| `animal_chicken_idle_nw_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_nw_00.png` |
| `animal_chicken_idle_nw_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_nw_01.png` |
| `animal_chicken_idle_nw_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_nw_02.png` |
| `animal_chicken_idle_nw_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_idle_nw_03.png` |
| `animal_chicken_walk_ne_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_ne_00.png` |
| `animal_chicken_walk_ne_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_ne_01.png` |
| `animal_chicken_walk_ne_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_ne_02.png` |
| `animal_chicken_walk_ne_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_ne_03.png` |
| `animal_chicken_walk_ne_04` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_ne_04.png` |
| `animal_chicken_walk_ne_05` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_ne_05.png` |
| `animal_chicken_walk_se_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_se_00.png` |
| `animal_chicken_walk_se_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_se_01.png` |
| `animal_chicken_walk_se_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_se_02.png` |
| `animal_chicken_walk_se_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_se_03.png` |
| `animal_chicken_walk_se_04` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_se_04.png` |
| `animal_chicken_walk_se_05` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_se_05.png` |
| `animal_chicken_walk_sw_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_sw_00.png` |
| `animal_chicken_walk_sw_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_sw_01.png` |
| `animal_chicken_walk_sw_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_sw_02.png` |
| `animal_chicken_walk_sw_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_sw_03.png` |
| `animal_chicken_walk_sw_04` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_sw_04.png` |
| `animal_chicken_walk_sw_05` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_sw_05.png` |
| `animal_chicken_walk_nw_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_nw_00.png` |
| `animal_chicken_walk_nw_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_nw_01.png` |
| `animal_chicken_walk_nw_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_nw_02.png` |
| `animal_chicken_walk_nw_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_nw_03.png` |
| `animal_chicken_walk_nw_04` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_nw_04.png` |
| `animal_chicken_walk_nw_05` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_walk_nw_05.png` |
| `animal_chicken_eat_ne_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_ne_00.png` |
| `animal_chicken_eat_ne_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_ne_01.png` |
| `animal_chicken_eat_ne_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_ne_02.png` |
| `animal_chicken_eat_ne_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_ne_03.png` |
| `animal_chicken_eat_ne_04` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_ne_04.png` |
| `animal_chicken_eat_se_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_se_00.png` |
| `animal_chicken_eat_se_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_se_01.png` |
| `animal_chicken_eat_se_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_se_02.png` |
| `animal_chicken_eat_se_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_se_03.png` |
| `animal_chicken_eat_se_04` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_se_04.png` |
| `animal_chicken_eat_sw_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_sw_00.png` |
| `animal_chicken_eat_sw_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_sw_01.png` |
| `animal_chicken_eat_sw_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_sw_02.png` |
| `animal_chicken_eat_sw_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_sw_03.png` |
| `animal_chicken_eat_sw_04` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_sw_04.png` |
| `animal_chicken_eat_nw_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_nw_00.png` |
| `animal_chicken_eat_nw_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_nw_01.png` |
| `animal_chicken_eat_nw_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_nw_02.png` |
| `animal_chicken_eat_nw_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_nw_03.png` |
| `animal_chicken_eat_nw_04` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_eat_nw_04.png` |
| `animal_chicken_happy_ne_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_ne_00.png` |
| `animal_chicken_happy_ne_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_ne_01.png` |
| `animal_chicken_happy_ne_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_ne_02.png` |
| `animal_chicken_happy_ne_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_ne_03.png` |
| `animal_chicken_happy_se_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_se_00.png` |
| `animal_chicken_happy_se_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_se_01.png` |
| `animal_chicken_happy_se_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_se_02.png` |
| `animal_chicken_happy_se_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_se_03.png` |
| `animal_chicken_happy_sw_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_sw_00.png` |
| `animal_chicken_happy_sw_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_sw_01.png` |
| `animal_chicken_happy_sw_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_sw_02.png` |
| `animal_chicken_happy_sw_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_sw_03.png` |
| `animal_chicken_happy_nw_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_nw_00.png` |
| `animal_chicken_happy_nw_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_nw_01.png` |
| `animal_chicken_happy_nw_02` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_nw_02.png` |
| `animal_chicken_happy_nw_03` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_happy_nw_03.png` |
| `animal_chicken_sleep_ne_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_sleep_ne_00.png` |
| `animal_chicken_sleep_ne_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_sleep_ne_01.png` |
| `animal_chicken_sleep_se_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_sleep_se_00.png` |
| `animal_chicken_sleep_se_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_sleep_se_01.png` |
| `animal_chicken_sleep_sw_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_sleep_sw_00.png` |
| `animal_chicken_sleep_sw_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_sleep_sw_01.png` |
| `animal_chicken_sleep_nw_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_sleep_nw_00.png` |
| `animal_chicken_sleep_nw_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_sleep_nw_01.png` |
| `animal_chicken_product_ready_ne_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_product_ready_ne_00.png` |
| `animal_chicken_product_ready_ne_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_product_ready_ne_01.png` |
| `animal_chicken_product_ready_se_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_product_ready_se_00.png` |
| `animal_chicken_product_ready_se_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_product_ready_se_01.png` |
| `animal_chicken_product_ready_sw_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_product_ready_sw_00.png` |
| `animal_chicken_product_ready_sw_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_product_ready_sw_01.png` |
| `animal_chicken_product_ready_nw_00` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_product_ready_nw_00.png` |
| `animal_chicken_product_ready_nw_01` | chicken | `production_ready` | 256×256 | 0.5,0.9 | `assets-src/animals/chicken/animal_chicken_product_ready_nw_01.png` |

## Animation contracts

| Animation | Category | Status | Atlas | Directions | Canvas sizes | Anchor/Pivot |
| --- | --- | --- | --- | --- | --- | --- |
| `pond_water` | pond | `placeholder` | farm_common | NONE | 512x384 | 0.5,0.86 |
| `pond_ripple` | pond | `placeholder` | farm_common | NONE | 512x384 | 0.5,0.86 |
| `pond_sparkle` | pond | `placeholder` | farm_common | NONE | 512x384 | 0.5,0.86 |
| `crop_ready_glow` | crops | `placeholder` | effects | NONE | 256x256 | 0.5,0.86 |
| `fx_plant` | effects | `placeholder` | effects | NONE | 256x256 | 0.5,0.86 |
| `fx_harvest` | effects | `placeholder` | effects | NONE | 256x256 | 0.5,0.86 |
| `fx_build_success` | effects | `placeholder` | effects | NONE | 256x256 | 0.5,0.86 |
| `fx_coin_gain` | effects | `placeholder` | effects | NONE | 256x256 | 0.5,0.86 |
| `fx_egg_collect` | effects | `placeholder` | effects | NONE | 256x256 | 0.5,0.86 |
| `animal_chicken` | animals | `production_ready` | chicken | NE, SE, SW, NW | 256x256 | 0.5,0.9 |

### `pond_water`

| State | Direction | Frames | FPS | Loop | Hold last | Events |
| --- | --- | --- | --- | --- | --- | --- |
| DEFAULT | NONE | 8 | 12 | true | false | — |

### `pond_ripple`

| State | Direction | Frames | FPS | Loop | Hold last | Events |
| --- | --- | --- | --- | --- | --- | --- |
| DEFAULT | NONE | 6 | 10 | true | false | — |

### `pond_sparkle`

| State | Direction | Frames | FPS | Loop | Hold last | Events |
| --- | --- | --- | --- | --- | --- | --- |
| DEFAULT | NONE | 4 | 8 | true | false | — |

### `crop_ready_glow`

| State | Direction | Frames | FPS | Loop | Hold last | Events |
| --- | --- | --- | --- | --- | --- | --- |
| DEFAULT | NONE | 4 | 8 | false | false | — |

### `fx_plant`

| State | Direction | Frames | FPS | Loop | Hold last | Events |
| --- | --- | --- | --- | --- | --- | --- |
| DEFAULT | NONE | 4 | 12 | false | false | — |

### `fx_harvest`

| State | Direction | Frames | FPS | Loop | Hold last | Events |
| --- | --- | --- | --- | --- | --- | --- |
| DEFAULT | NONE | 6 | 12 | false | false | — |

### `fx_build_success`

| State | Direction | Frames | FPS | Loop | Hold last | Events |
| --- | --- | --- | --- | --- | --- | --- |
| DEFAULT | NONE | 6 | 12 | false | false | — |

### `fx_coin_gain`

| State | Direction | Frames | FPS | Loop | Hold last | Events |
| --- | --- | --- | --- | --- | --- | --- |
| DEFAULT | NONE | 8 | 12 | false | false | — |

### `fx_egg_collect`

| State | Direction | Frames | FPS | Loop | Hold last | Events |
| --- | --- | --- | --- | --- | --- | --- |
| DEFAULT | NONE | 6 | 12 | false | false | — |

### `animal_chicken`

| State | Direction | Frames | FPS | Loop | Hold last | Events |
| --- | --- | --- | --- | --- | --- | --- |
| IDLE | NE | 4 | 6 | true | false | — |
| IDLE | SE | 4 | 6 | true | false | — |
| IDLE | SW | 4 | 6 | true | false | — |
| IDLE | NW | 4 | 6 | true | false | — |
| WALK | NE | 6 | 8 | true | false | — |
| WALK | SE | 6 | 8 | true | false | — |
| WALK | SW | 6 | 8 | true | false | — |
| WALK | NW | 6 | 8 | true | false | — |
| EAT | NE | 5 | 10 | false | true | FEED_CONSUMED@2 |
| EAT | SE | 5 | 10 | false | true | FEED_CONSUMED@2 |
| EAT | SW | 5 | 10 | false | true | FEED_CONSUMED@2 |
| EAT | NW | 5 | 10 | false | true | FEED_CONSUMED@2 |
| HAPPY | NE | 4 | 8 | false | true | — |
| HAPPY | SE | 4 | 8 | false | true | — |
| HAPPY | SW | 4 | 8 | false | true | — |
| HAPPY | NW | 4 | 8 | false | true | — |
| SLEEP | NE | 2 | 3 | true | false | — |
| SLEEP | SE | 2 | 3 | true | false | — |
| SLEEP | SW | 2 | 3 | true | false | — |
| SLEEP | NW | 2 | 3 | true | false | — |
| PRODUCT_READY | NE | 2 | 2 | true | false | — |
| PRODUCT_READY | SE | 2 | 2 | true | false | — |
| PRODUCT_READY | SW | 2 | 2 | true | false | — |
| PRODUCT_READY | NW | 2 | 2 | true | false | — |

## Replacement invariants

- Keep every asset ID and animation ID exactly unchanged.
- Keep atlas group, state names, direction names, default direction, and frame ordering unchanged.
- Keep every static source canvas width and height unchanged; use RGBA PNG with no accidental crop or trim.
- Keep sourceScale, anchor, pivot, renderOffset, and logical footprint unchanged unless renderer review explicitly approves the change.
- Keep every animation frame count, FPS, loop flag, holdLast flag, and event name/frame unchanged.
- Keep FEED_CONSUMED on the canonical EAT frame and preserve all one-shot effect timing.
- Replace source PNGs only; regenerate atlas JSON/PNG and preview through the existing deterministic pipeline.
- Record license, source URL or internal source reference, creator, tool/version, and review evidence before status changes.
- Do not mark an asset approved merely because it passes technical validation; art/style/license review is separate.

Required evidence for `production_ready` or `approved`:

- `sourceFile`
- `license`
- `creator`
- `styleReview`
- `technicalReview`
- `approvalRef`

## Production replacement order

1. Lock the art direction and palette against `assets-src/style/style-sheet.md`.
2. Replace terrain first, then buildings and pond layers so the world silhouette and depth anchors are stable.
3. Replace crop stage art, preserving the seed → stage 1 → stage 2 → stage 3 → ready sequence.
4. Replace all chicken states and directions as one review batch; do not mix placeholder and production frames within a state/direction contract.
5. Replace one-shot effects and UI icons after world scale is approved.
6. Attach license/style/technical evidence, update status metadata, regenerate atlases, and run the full validation sequence.

## Validation commands

Run from the repository root after every replacement batch:

```powershell
node tools/asset-inventory.mjs
node tools/export-assets/index.mjs validate
node tools/export-assets/index.mjs pack
node tools/export-assets/validate.mjs --strict-output
node tools/check-renderer-syntax.mjs
npm run check
```

A technically valid atlas is not approval evidence. Production release also requires explicit art/style/license review for every non-placeholder asset.
