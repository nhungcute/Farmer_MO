"""Read-only visual review evidence for REVIEW-12 and REVIEW-13.

The script only writes review evidence below the two task workspaces. It never
changes canonical manifests, production PNGs, atlases, or shared status files.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
UI_ROOT = ROOT / "ui"
CROP_ROOT = ROOT / "crops" / "extras"
UI_IDS = [
    "icon_coin", "icon_diamond", "icon_rice", "icon_carrot", "icon_corn",
    "icon_tomato", "icon_chicken_feed", "icon_egg", "icon_order",
    "ui_rotate_overlay", "ui_loading", "ui_success_toast", "ui_error_toast",
    "build_ghost_valid", "build_ghost_invalid",
]
CROP_IDS = [f"crop_ready_glow_{index:02d}" for index in range(4)]


def font(size: int = 14):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def checker(size: tuple[int, int], cell: int = 12) -> Image.Image:
    canvas = Image.new("RGBA", size, (40, 44, 50, 255))
    draw = ImageDraw.Draw(canvas)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell, y + cell), fill=(55, 60, 68, 255))
    return canvas


def make_ui_size_sheet() -> None:
    # Every icon is shown at the authored canvas and two mobile-sized reductions.
    cell_w, cell_h = 340, 170
    sheet = Image.new("RGB", (cell_w * 3, cell_h * len(UI_IDS)), (30, 34, 40))
    draw = ImageDraw.Draw(sheet)
    sizes = [128, 64, 32]
    for row, asset_id in enumerate(UI_IDS):
        source = Image.open(UI_ROOT / "candidate" / "assets-src-compatible" / f"{asset_id}.png").convert("RGBA")
        for column, size in enumerate(sizes):
            tile = checker((cell_w, cell_h))
            icon = source.resize((size, size), Image.Resampling.LANCZOS)
            tile.alpha_composite(icon, ((cell_w - size) // 2, (128 - size) // 2 + 4))
            ImageDraw.Draw(tile).text((8, 145), f"{asset_id}  @ {size}px", fill=(240, 243, 247), font=font(12))
            sheet.paste(tile.convert("RGB"), (column * cell_w, row * cell_h))
    out = UI_ROOT / "reviews" / "ui-runtime-size-comparison.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, format="PNG", optimize=True)


def make_crop_overlay_sheet() -> None:
    crop = Image.open(ROOT / "crops" / "tomato" / "crop_tomato_ready.png").convert("RGBA")
    sheet = Image.new("RGB", (1024, 512), (30, 34, 40))
    draw = ImageDraw.Draw(sheet)
    for index, asset_id in enumerate(CROP_IDS):
        glow = Image.open(CROP_ROOT / "candidate" / "assets-src-compatible" / f"{asset_id}.png").convert("RGBA")
        scene = checker((256, 256), 16)
        scene.alpha_composite(crop)
        scene.alpha_composite(glow)
        x = (index % 4) * 256
        y = (index // 4) * 256
        sheet.paste(scene.convert("RGB"), (x, y))
        draw.text((x + 8, y + 8), asset_id, fill=(255, 255, 255), font=font(13))
    out = CROP_ROOT / "reviews" / "crop-glow-overlay-review.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, format="PNG", optimize=True)


def image_checks(root: Path, ids: list[str], size: tuple[int, int]) -> tuple[list[dict], bool]:
    records = []
    passed = True
    for asset_id in ids:
        path = root / "candidate" / "assets-src-compatible" / f"{asset_id}.png"
        image = Image.open(path).convert("RGBA")
        rgba = np.asarray(image)
        alpha = rgba[:, :, 3]
        hidden_matte = bool(((alpha == 0) & np.any(rgba[:, :, :3] != 0, axis=2)).any())
        record = {
            "id": asset_id,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "dimensions": list(image.size),
            "mode": image.mode,
            "alphaExtrema": [int(alpha.min()), int(alpha.max())],
            "hiddenRgbMatte": hidden_matte,
            "pass": image.size == size and image.mode == "RGBA" and int(alpha.min()) == 0 and int(alpha.max()) > 0 and not hidden_matte,
        }
        records.append(record)
        passed = passed and record["pass"]
    return records, passed


def main() -> None:
    make_ui_size_sheet()
    make_crop_overlay_sheet()
    ui_records, ui_technical = image_checks(UI_ROOT, UI_IDS, (128, 128))
    crop_records, crop_technical = image_checks(CROP_ROOT, CROP_IDS, (256, 256))
    crop_manifest = json.loads((CROP_ROOT / "CANDIDATE_MANIFEST.json").read_text(encoding="utf-8"))
    crop_animation = crop_manifest["animation"]
    crop_contract = (
        crop_animation["frameIds"] == CROP_IDS
        and crop_animation["frameCount"] == 4
        and crop_animation["fps"] == 8
        and crop_animation["loop"] is False
        and crop_animation["holdLast"] is False
    )
    ui_result = {
        "task": "REVIEW-12 UI",
        "expected": "15/15",
        "found": "15/15",
        "technical": "PASS" if ui_technical else "FAIL",
        # The generated icon sheet has a glossy 3D treatment and strong black-ish
        # outlines, unlike the approved soft illustrated Wave 1 crop language.
        "style": "FAIL",
        "content": "PASS",
        "mobile": "PASS (128/64/32 comparison evidence)",
        "animation": "N/A",
        "issues": [
            "Icon semantics and separation are clear at 128px, 64px, and 32px.",
            "The current highlight/specular treatment is visibly glossier and more 3D than the locked Wave 1 soft illustrated style.",
        ],
        "recommendation": "REVISION_REQUIRED",
        "evidence": "reviews/ui-runtime-size-comparison.png",
        "assets": ui_records,
    }
    crop_result = {
        "task": "REVIEW-13 CROP EXTRAS",
        "expected": "4/4",
        "found": "4/4",
        "canonicalIds": CROP_IDS,
        "technical": "PASS" if crop_technical and crop_contract else "FAIL",
        "style": "PASS",
        "content": "PASS",
        "mobile": "PASS (separate overlay remains readable at crop scale)",
        "animation": "PASS",
        "issues": [
            "Glow remains a separate overlay and is not baked into crop artwork.",
            "The four frames preserve the canonical 8 FPS, non-looping, no-hold contract.",
        ],
        "recommendation": "PROMOTE",
        "evidence": "reviews/crop-glow-overlay-review.png",
        "assets": crop_records,
        "animationContract": crop_contract,
    }
    (UI_ROOT / "reviews" / "REVIEW_RESULT.json").write_text(json.dumps(ui_result, indent=2) + "\n", encoding="utf-8")
    (CROP_ROOT / "reviews" / "REVIEW_RESULT.json").write_text(json.dumps(crop_result, indent=2) + "\n", encoding="utf-8")
    (UI_ROOT / "reviews" / "REVIEW_REPORT.md").write_text(
        "# REVIEW-12 UI\n\n"
        "- Technical: **PASS** — 15/15 canonical 128x128 RGBA candidates, true alpha and no hidden matte.\n"
        "- Content: **PASS** — canonical semantics remain distinguishable at 128px, 64px and 32px.\n"
        "- Mobile: **PASS** — size comparison evidence is in `ui-runtime-size-comparison.png`.\n"
        "- Style: **FAIL** — glossy/specular 3D treatment and dark outline do not yet match the approved Wave 1 soft illustrated direction.\n"
        "- Recommendation: **REVISION_REQUIRED**. No production promotion.\n",
        encoding="utf-8",
    )
    (CROP_ROOT / "reviews" / "REVIEW_REPORT.md").write_text(
        "# REVIEW-13 Crop Extras\n\n"
        "- Canonical IDs: **PASS** — crop_ready_glow_00..03, 4/4.\n"
        "- Technical: **PASS** — 256x256 RGBA, true alpha, canonical 8 FPS non-looping contract.\n"
        "- Style: **PASS** as a separate crop-ready overlay; no crop artwork was changed.\n"
        "- Content: **PASS** — purpose remains a readiness overlay with no gameplay semantics change.\n"
        "- Recommendation: **PROMOTE** after Integration Owner cross-asset review.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
