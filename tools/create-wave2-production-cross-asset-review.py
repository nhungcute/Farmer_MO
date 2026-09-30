"""Compose a read-only cross-asset review sheet from production PNGs.

This creates visual evidence only. It never writes assets-src, manifests,
atlases, runtime files, or approval metadata.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "docs" / "assets" / "review"


def load(relative: str) -> Image.Image:
    return Image.open(ROOT / "assets-src" / relative).convert("RGBA")


def fit(image: Image.Image, width: int) -> Image.Image:
    ratio = width / image.width
    return image.resize((width, max(1, round(image.height * ratio))), Image.Resampling.LANCZOS)


def font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def label(draw: ImageDraw.ImageDraw, text: str, position: tuple[int, int], size: int = 18) -> None:
    face = font(size)
    box = draw.textbbox(position, text, font=face)
    draw.rounded_rectangle(
        (box[0] - 7, box[1] - 5, box[2] + 7, box[3] + 5),
        radius=6,
        fill=(22, 43, 31, 205),
    )
    draw.text(position, text, fill=(255, 255, 255, 255), font=face)


def main() -> None:
    REVIEW.mkdir(parents=True, exist_ok=True)
    tile = load("terrain/terrain_grass_tile.png")
    scene = Image.new("RGBA", (1600, 1080), (123, 184, 90, 255))
    for y in range(-64, scene.height, tile.height):
        for x in range(-128, scene.width, tile.width):
            scene.alpha_composite(tile, (x, y))

    assets = {
        "Farmhouse": fit(load("buildings/building_farmhouse_lv1.png"), 330),
        "Warehouse": fit(load("buildings/building_warehouse_lv1.png"), 330),
        "Chicken Coop": fit(load("buildings/building_chicken_coop_lv1.png"), 330),
        "Pond": fit(load("ponds/pond_small_lv1_base.png"), 320),
        "Chicken": fit(load("animals/chicken/animal_chicken_idle_se_00.png"), 160),
        "Rice": fit(load("crops/crop_rice_stage_3.png"), 145),
        "Carrot": fit(load("crops/crop_carrot_stage_3.png"), 145),
        "Corn": fit(load("crops/crop_corn_stage_3.png"), 145),
        "Tomato": fit(load("crops/crop_tomato_stage_3.png"), 145),
        "Plant effect": fit(load("effects/fx_plant_03.png"), 170),
        "Coin effect": fit(load("effects/fx_coin_gain_03.png"), 145),
    }
    placements = [
        ("Farmhouse", (60, 145)),
        ("Warehouse", (625, 120)),
        ("Chicken Coop", (1190, 145)),
        ("Pond", (620, 575)),
        ("Rice", (70, 815)),
        ("Carrot", (260, 820)),
        ("Corn", (450, 815)),
        ("Tomato", (640, 820)),
        ("Chicken", (1150, 770)),
        ("Plant effect", (410, 760)),
        ("Coin effect", (875, 265)),
    ]
    for name, position in placements:
        scene.alpha_composite(assets[name], position)

    draw = ImageDraw.Draw(scene)
    draw.rectangle((0, 0, scene.width, 62), fill=(22, 43, 31, 225))
    draw.text((20, 18), "MỠ FARM · WAVE 2 PRODUCTION CROSS-ASSET REVIEW", fill=(255, 255, 255, 255), font=font(25))
    draw.text((20, 76), "Production PNGs only · visual evidence · no approval metadata changed", fill=(244, 255, 232, 255), font=font(16))
    for text, position in [
        ("Farmhouse", (78, 160)),
        ("Warehouse", (643, 135)),
        ("Chicken Coop", (1208, 160)),
        ("Pond", (638, 590)),
        ("Rice", (87, 895)),
        ("Carrot", (277, 900)),
        ("Corn", (467, 895)),
        ("Tomato", (657, 900)),
        ("Chicken", (1172, 925)),
        ("Effects", (865, 235)),
    ]:
        label(draw, text, position)

    scene.convert("RGB").save(REVIEW / "wave2-final-production-cross-asset-review.png", format="PNG", optimize=True)


if __name__ == "__main__":
    main()
