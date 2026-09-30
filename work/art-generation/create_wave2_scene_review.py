"""Compose non-production cross-asset review scenes from Wave 2 candidates.

The output is visual evidence only. It intentionally never writes production
assets, atlases, manifests, or runtime files.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
REVIEW = ROOT.parent.parent / "docs" / "assets" / "review"


def load(path: str) -> Image.Image:
    return Image.open(ROOT / path).convert("RGBA")


def font(size: int = 18):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def fit(asset: Image.Image, width: int) -> Image.Image:
    ratio = width / asset.width
    return asset.resize((width, max(1, round(asset.height * ratio))), Image.Resampling.LANCZOS)


def main() -> None:
    REVIEW.mkdir(parents=True, exist_ok=True)
    tile = load("terrain/candidate/assets-src-compatible/terrain_grass_tile.png")
    scene = Image.new("RGBA", (1536, 1024), (123, 184, 90, 255))
    for y in range(-64, scene.height, tile.height):
        for x in range(-128, scene.width, tile.width):
            scene.alpha_composite(tile, (x, y))

    assets = {
        "Farmhouse": fit(load("buildings/farmhouse/candidate/assets-src-compatible/buildings/building_farmhouse_lv1.png"), 360),
        "Warehouse": fit(load("buildings/warehouse/candidate/assets-src-compatible/buildings/building_warehouse_lv1.png"), 360),
        "Chicken Coop": fit(load("buildings/chicken-coop/candidate/assets-src-compatible/building_chicken_coop_lv1.png"), 360),
        "Pond": fit(load("pond/candidate/assets-src-compatible/ponds/pond_small_lv1_base.png"), 360),
        "Chicken": fit(load("chicken/candidate/assets-src-compatible/animal_chicken_idle_se_00.png"), 150),
        "Rice": fit(load("crops/rice/candidates/crop_rice_stage_3.png"), 150),
        "Carrot": fit(load("crops/carrot/crop_carrot_stage_3.png"), 150),
        "Corn": fit(load("crops/corn/crop_corn_stage_3.png"), 150),
        "Tomato": fit(load("crops/tomato/crop_tomato_ready.png"), 150),
        "Plant effect": fit(load("effects/candidate/assets-src-compatible/fx_plant_03.png"), 150),
        "Coin effect": fit(load("effects/candidate/assets-src-compatible/fx_coin_gain_03.png"), 130),
        "Ready glow": fit(load("crops/extras/candidate/assets-src-compatible/crop_ready_glow_02.png"), 150),
    }
    placements = [
        ("Farmhouse", (55, 135)),
        ("Warehouse", (565, 110)),
        ("Chicken Coop", (1085, 145)),
        ("Pond", (490, 560)),
        ("Rice", (70, 760)),
        ("Carrot", (245, 775)),
        ("Corn", (420, 780)),
        ("Tomato", (595, 770)),
        ("Chicken", (1020, 715)),
        ("Plant effect", (390, 700)),
        ("Coin effect", (850, 220)),
        ("Ready glow", (570, 760)),
    ]
    for name, position in placements:
        scene.alpha_composite(assets[name], position)
    draw = ImageDraw.Draw(scene)
    labels = [("Farmhouse", (72, 145)), ("Warehouse", (582, 120)), ("Chicken Coop", (1102, 155)), ("Pond", (505, 575)), ("Crop + effects", (76, 915)), ("Chicken", (1040, 855))]
    for text, position in labels:
        box = draw.textbbox(position, text, font=font(18))
        draw.rounded_rectangle((box[0] - 6, box[1] - 4, box[2] + 6, box[3] + 4), radius=5, fill=(30, 47, 34, 190))
        draw.text(position, text, fill=(255, 255, 255, 255), font=font(18))
    title = "MỠ FARM · WAVE 2 CROSS-ASSET REVIEW · CANDIDATES ONLY"
    draw.rectangle((0, 0, scene.width, 52), fill=(30, 47, 34, 220))
    draw.text((18, 16), title, fill=(255, 255, 255, 255), font=font(22))
    scene.convert("RGB").save(REVIEW / "wave2-cross-asset-review.png", format="PNG", optimize=True)

    # Mobile evidence uses the same composition, cropped at the review viewport
    # sizes so scale hierarchy and silhouette remain visible without production UI.
    mobile = ImageOps.fit(scene.convert("RGB"), (932, 430), method=Image.Resampling.LANCZOS, centering=(0.50, 0.54))
    mobile.save(REVIEW / "wave2-cross-asset-mobile.png", format="PNG", optimize=True)


if __name__ == "__main__":
    main()
