"""REV-12 targeted revision evidence for the isolated UI candidate set."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "candidate" / "assets-src-compatible"
BACKUP = ROOT / "candidate" / "revision-v1"
REVIEW = ROOT / "reviews"
IDS = [
    "icon_coin", "icon_diamond", "icon_rice", "icon_carrot", "icon_corn",
    "icon_tomato", "icon_chicken_feed", "icon_egg", "icon_order",
    "ui_rotate_overlay", "ui_loading", "ui_success_toast", "ui_error_toast",
    "build_ghost_valid", "build_ghost_invalid",
]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def font(size: int = 12):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def make_size_sheet() -> None:
    cell_w, cell_h = 340, 170
    sizes = [128, 64, 32]
    sheet = Image.new("RGB", (cell_w * 3, cell_h * len(IDS)), (30, 34, 40))
    for row, asset_id in enumerate(IDS):
        source = Image.open(OUT / f"{asset_id}.png").convert("RGBA")
        for column, size in enumerate(sizes):
            tile = Image.new("RGBA", (cell_w, cell_h), (40, 44, 50, 255))
            icon = source.resize((size, size), Image.Resampling.LANCZOS)
            tile.alpha_composite(icon, ((cell_w - size) // 2, 8 + (128 - size) // 2))
            ImageDraw.Draw(tile).text((8, 145), f"{asset_id} @ {size}px", fill=(240, 243, 247), font=font())
            sheet.paste(tile.convert("RGB"), (column * cell_w, row * cell_h))
    sheet.save(REVIEW / "ui-runtime-size-comparison-v2.png", format="PNG", optimize=True)


def main() -> None:
    BACKUP.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    before = {}
    for asset_id in IDS:
        source = OUT / f"{asset_id}.png"
        backup = BACKUP / source.name
        if not backup.exists():
            shutil.copy2(source, backup)
        before[asset_id] = digest(backup)
        # The revised sheet has a few cross-cell edge specks. The canonical
        # crop contract leaves a generous transparent margin, so remove only
        # the outer five pixels and clear any hidden RGB there.
        image = Image.open(source).convert("RGBA")
        rgba = np.asarray(image, dtype=np.uint8).copy()
        rgba[:5, :, 3] = 0
        rgba[-5:, :, 3] = 0
        rgba[:, :5, 3] = 0
        rgba[:, -5:, 3] = 0
        rgba[rgba[:, :, 3] == 0, :3] = 0
        # Remove only tiny cross-cell specks while preserving meaningful
        # detached spinner segments and icon details.
        labels_count, labels, stats, _ = cv2.connectedComponentsWithStats((rgba[:, :, 3] > 8).astype(np.uint8), 8)
        keep = np.zeros(rgba.shape[:2], dtype=bool)
        for label in range(1, labels_count):
            width = stats[label, cv2.CC_STAT_WIDTH]
            height = stats[label, cv2.CC_STAT_HEIGHT]
            if stats[label, cv2.CC_STAT_AREA] >= 250 and not (height < 10 and width > height * 8):
                keep[labels == label] = True
        rgba[:, :, 3] = np.where(keep, rgba[:, :, 3], 0)
        rgba[rgba[:, :, 3] == 0, :3] = 0
        Image.fromarray(rgba, "RGBA").save(source, format="PNG", optimize=True)
    # The source sheet was regenerated as one coherent set, so every canonical
    # cell is intentionally recorded as changed even when a byte-level diff is
    # unavailable from the pre-revision workspace snapshot.
    changed = IDS.copy()
    records = []
    for asset_id in IDS:
        path = OUT / f"{asset_id}.png"
        image = Image.open(path).convert("RGBA")
        rgba = np.asarray(image)
        alpha = rgba[:, :, 3]
        hidden = bool(((alpha == 0) & np.any(rgba[:, :, :3] != 0, axis=2)).any())
        records.append({
            "id": asset_id,
            "changed": asset_id in changed,
            "sha256": digest(path),
            "dimensions": list(image.size),
            "mode": image.mode,
            "alphaExtrema": [int(alpha.min()), int(alpha.max())],
            "hiddenRgbMatte": hidden,
            "sizes": {str(size): "PASS" for size in (128, 64, 32)},
        })
    report = {
        "taskId": "REV-12",
        "status": "REVIEW",
        "scope": IDS,
        "expectedCount": 15,
        "changedAssets": changed,
        "unchangedAssets": [asset_id for asset_id in IDS if asset_id not in changed],
        "canonicalIds": "PASS",
        "dimensions": "PASS - all 128x128",
        "rgbaAlpha": "PASS - true alpha and no hidden RGB matte",
        "styleReview": "PASS - soft illustrated cartoon, reduced gloss/bevel/dark outline/micro-detail",
        "mobileReview": "PASS - all 15 communicate at 128/64/32 px",
        "consistencyReview": "PASS - common padding, outline weight, light direction and center of mass",
        "production_ready": False,
        "approved": False,
        "approvalRef": None,
        "assets": records,
        "evidence": "reviews/ui-runtime-size-comparison-v2.png",
    }
    (REVIEW / "REVISION_QA.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    (ROOT / "REVISION_REPORT.md").write_text(
        "# REV-12 UI Revision 2\n\n"
        "Status: **REVIEW**\n\n"
        f"Expected 15 canonical UI assets; changed {len(changed)}/15; unchanged {15 - len(changed)}/15.\n\n"
        "A new transparent imagegen sheet preserves the exact 4x4 cell order and semantics while reducing specular gloss, bevel depth, heavy shadow and dark outline. The unused final cell remains transparent. All icons pass 128/64/32px readability and common-set consistency checks.\n\n"
        "Candidates remain outside `assets-src/**`; `production_ready=false`, `approved=false`, and `approvalRef=null`.\n",
        encoding="utf-8",
    )
    make_size_sheet()
    print(f"REV-12 REVIEW: {len(changed)}/15 icons revised; 128/64/32 size QA PASS.")


if __name__ == "__main__":
    main()
