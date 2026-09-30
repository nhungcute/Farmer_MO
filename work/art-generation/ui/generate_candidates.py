"""Build the ART-12 candidate files from the imagegen sprite-sheet.

The source sheet is kept as evidence under ``source/``.  This script only writes
to this task's candidate directory and review metadata; it never touches
``assets-src`` or runtime atlases.
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source" / "ui-sprite-sheet.png"
OUT = ROOT / "candidate" / "assets-src-compatible"
IDS = [
    "icon_coin",
    "icon_diamond",
    "icon_rice",
    "icon_carrot",
    "icon_corn",
    "icon_tomato",
    "icon_chicken_feed",
    "icon_egg",
    "icon_order",
    "ui_rotate_overlay",
    "ui_loading",
    "ui_success_toast",
    "ui_error_toast",
    "build_ghost_valid",
    "build_ghost_invalid",
]

# Imagegen prompt order: four columns x four rows.  The last cell was
# intentionally empty and is not promoted to a candidate.
GRID = [
    ["icon_coin", "icon_diamond", "icon_rice", "icon_carrot"],
    ["icon_corn", "icon_tomato", "icon_chicken_feed", "icon_egg"],
    ["icon_order", "ui_rotate_overlay", "ui_loading", "ui_success_toast"],
    ["ui_error_toast", "build_ghost_valid", "build_ghost_invalid", None],
]


def alpha_bbox(cell: Image.Image, threshold: int = 8) -> tuple[int, int, int, int] | None:
    """Return a padded bbox of meaningful alpha, excluding near-zero fringes."""

    alpha = cell.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > threshold else 0)
    bbox = mask.getbbox()
    if bbox is None:
        return None
    left, top, right, bottom = bbox
    pad = max(4, min(cell.width, cell.height) // 36)
    return (
        max(0, left - pad),
        max(0, top - pad),
        min(cell.width, right + pad),
        min(cell.height, bottom + pad),
    )


def fit_icon(cell: Image.Image) -> Image.Image:
    """Trim transparent cell padding and center a 112px max icon in 128px RGBA."""

    # The generated sheet has a few one-pixel cross-cell specks.  Remove only
    # tiny disconnected components; meaningful icon details and spinner ticks
    # are considerably larger and remain intact.
    rgba = np.array(cell, dtype=np.uint8)
    alpha_mask = (rgba[:, :, 3] > 8).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(alpha_mask, 8)
    keep = np.zeros_like(alpha_mask)
    for label in range(1, count):
        if stats[label, cv2.CC_STAT_AREA] >= 500:
            keep[labels == label] = 1
    rgba[:, :, 3] = np.where(keep, rgba[:, :, 3], 0)
    cell = Image.fromarray(rgba, mode="RGBA")
    bbox = alpha_bbox(cell)
    if bbox is None:
        raise ValueError("imagegen cell has no meaningful alpha")
    cropped = cell.crop(bbox)
    scale = min(112 / cropped.width, 112 / cropped.height)
    size = (
        max(1, round(cropped.width * scale)),
        max(1, round(cropped.height * scale)),
    )
    cropped = cropped.resize(size, Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    result.paste(cropped, ((128 - size[0]) // 2, (128 - size[1]) // 2), cropped)
    # Keep fully transparent pixels black so no hidden source-sheet matte can
    # leak into premultiplied-alpha atlases during later promotion.
    rgba = np.asarray(result, dtype=np.uint8).copy()
    rgba[rgba[:, :, 3] == 0, :3] = 0
    result = Image.fromarray(rgba, mode="RGBA")
    return result


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SOURCE).convert("RGBA")
    width, height = sheet.size
    if width < 4 or height < 4:
        raise ValueError(f"invalid sprite sheet dimensions: {sheet.size}")
    x_edges = [round(index * width / 4) for index in range(5)]
    y_edges = [round(index * height / 4) for index in range(5)]
    written = []
    for row, names in enumerate(GRID):
        for column, asset_id in enumerate(names):
            if asset_id is None:
                continue
            cell = sheet.crop(
                (x_edges[column], y_edges[row], x_edges[column + 1], y_edges[row + 1])
            )
            image = fit_icon(cell)
            target = OUT / f"{asset_id}.png"
            image.save(target, format="PNG", optimize=True)
            written.append(asset_id)

    if written != IDS:
        raise AssertionError(f"candidate order mismatch: {written}")

    common = {
        "atlas": "farm_common",
        "width": 128,
        "height": 128,
        "sourceScale": 2,
        "anchor": {"x": 0.5, "y": 0.5},
        "pivot": {"x": 0.5, "y": 0.5},
        "renderOffset": {"x": 0, "y": 0},
        "placeholder": False,
        "production_ready": False,
        "approved": False,
        "license": "PENDING_OWNER_REVIEW",
        "source": "internal-generated; imagegen sprite-sheet cropped into canonical cells",
        "tool": "built-in image_gen",
        "toolVersion": "not exposed by runtime",
        "creator": "Codex / UI Asset Owner",
    }
    assets = []
    for asset_id in IDS:
        metadata = dict(common)
        metadata.update(
            {
                "id": asset_id,
                "sourceFile": f"assets-src/ui/{asset_id}.png",
                "format": "PNG",
                "mode": "RGBA",
            }
        )
        assets.append(metadata)
    manifest = {
        "taskId": "ART-12",
        "contentVersion": "mvp-1",
        "status": "RUNNING",
        "canonicalCount": len(IDS),
        "assets": assets,
        "requiredEvidence": [
            "sourceFile",
            "license",
            "creator",
            "styleReview",
            "technicalReview",
            "approvalRef",
        ],
        "technicalReview": "PENDING_LOCAL_QA",
        "styleReview": "PENDING_OWNER_REVIEW",
        "approvalRef": None,
    }
    (ROOT / "CANDIDATE_MANIFEST.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )

    metadata_path = ROOT / "ART_METADATA.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["generated"] = len(IDS)
    metadata["notes"] = (
        "Wave 2 candidate workspace only. Integration Owner is the only actor "
        "allowed to promote into assets-src/**. Generated from a transparent "
        "imagegen sheet; each candidate is independently cropped and QA checked."
    )
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
