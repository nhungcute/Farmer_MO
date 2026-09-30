"""Create non-production contact sheets for Wave 2 visual review evidence."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
TASKS = {
    "buildings/chicken-coop": ("chicken-coop-candidates.png", 1, 1),
    "terrain": ("terrain-candidates.png", 3, 2),
    "effects": ("effects-candidates.png", 5, 6),
    "ui": ("ui-candidates.png", 5, 3),
    "crops/extras": ("crop-glow-candidates.png", 2, 2),
}


def checker(size: tuple[int, int], cell: int = 16) -> Image.Image:
    image = Image.new("RGB", size, (42, 46, 52))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell, y + cell), fill=(54, 59, 66))
    return image


def main() -> None:
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except OSError:
        font = ImageFont.load_default()
    for relative, (filename, columns, rows) in TASKS.items():
        task_root = ROOT / relative
        files = sorted((task_root / "candidate" / "assets-src-compatible").glob("**/*.png"))
        if not files:
            continue
        cell_w, cell_h = (220, 180) if relative.endswith("chicken-coop") else (180, 160)
        sheet = Image.new("RGB", (columns * cell_w, rows * cell_h), (30, 34, 40))
        for index, path in enumerate(files):
            row, column = divmod(index, columns)
            tile = checker((cell_w, cell_h))
            image = Image.open(path).convert("RGBA")
            image.thumbnail((cell_w - 20, cell_h - 38), Image.Resampling.LANCZOS)
            x = (cell_w - image.width) // 2
            y = 6 + (cell_h - 32 - image.height) // 2
            tile.paste(image, (x, y), image)
            ImageDraw.Draw(tile).text((8, cell_h - 24), path.stem, fill=(240, 243, 247), font=font)
            sheet.paste(tile, (column * cell_w, row * cell_h))
        reviews = task_root / "reviews"
        reviews.mkdir(parents=True, exist_ok=True)
        sheet.save(reviews / filename, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
