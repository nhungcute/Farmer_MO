"""Build ART-13 crop-ready glow frames from the imagegen strip.

Only this task's isolated candidate/evidence directories are written.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source" / "crop-ready-glow-sheet.png"
OUT = ROOT / "candidate" / "assets-src-compatible"
IDS = [
    "crop_ready_glow_00",
    "crop_ready_glow_01",
    "crop_ready_glow_02",
    "crop_ready_glow_03",
]


def make_frame(cell: Image.Image) -> Image.Image:
    """Keep the isometric ellipse, add a stable margin, and produce 256x256."""

    # Threshold only the imagegen's near-zero alpha fringe.  The broad crop is
    # fixed for every frame so the glow never jitters as the animation loops.
    alpha = cell.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    if bbox is None:
        raise ValueError("glow frame has no meaningful alpha")
    left, top, right, bottom = bbox
    pad_x = max(16, cell.width // 24)
    pad_y = max(12, cell.height // 24)
    left = max(0, left - pad_x)
    top = max(0, top - pad_y)
    right = min(cell.width, right + pad_x)
    bottom = min(cell.height, bottom + pad_y)
    cropped = cell.crop((left, top, right, bottom))

    # Preserve the generated ellipse's aspect ratio.  The source cells are
    # intentionally wide; placing the fitted strip in a square canvas gives
    # the renderer its 256x256 frame without stretching the effect vertically.
    scale = min(236 / cropped.width, 236 / cropped.height)
    size = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
    fitted = cropped.resize(size, Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    result.paste(fitted, ((256 - size[0]) // 2, (256 - size[1]) // 2), fitted)
    # Compensate for asymmetric sparkle placement so the weighted alpha
    # centroid stays on the canonical .5/.5 frame center and cannot jitter.
    alpha = result.getchannel("A")
    alpha_array = np.asarray(alpha, dtype=np.float64)
    total = float(alpha_array.sum())
    if total:
        y_grid, x_grid = np.indices(alpha_array.shape)
        weighted_x = float((x_grid * alpha_array).sum() / total)
        weighted_y = float((y_grid * alpha_array).sum() / total)
        shift_x = round(127.5 - weighted_x)
        shift_y = round(127.5 - weighted_y)
        aligned = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        aligned.alpha_composite(result, (shift_x, shift_y))
        result = aligned
    rgba = np.asarray(result, dtype=np.uint8).copy()
    rgba[rgba[:, :, 3] == 0, :3] = 0
    result = Image.fromarray(rgba, mode="RGBA")
    return result


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SOURCE).convert("RGBA")
    width, height = sheet.size
    if width < 2 or height < 2:
        raise ValueError(f"invalid glow sheet dimensions: {sheet.size}")
    x_edges = [round(index * width / 2) for index in range(3)]
    y_edges = [round(index * height / 2) for index in range(3)]
    written = []
    # Generated layout is: frame 00, 01 on row 0; frame 02, 03 on row 1.
    for index, asset_id in enumerate(IDS):
        row, column = divmod(index, 2)
        cell = sheet.crop(
            (x_edges[column], y_edges[row], x_edges[column + 1], y_edges[row + 1])
        )
        make_frame(cell).save(OUT / f"{asset_id}.png", format="PNG", optimize=True)
        written.append(asset_id)
    if written != IDS:
        raise AssertionError(f"candidate order mismatch: {written}")

    common = {
        "atlas": "effects",
        "width": 256,
        "height": 256,
        "sourceScale": 2,
        "anchor": {"x": 0.5, "y": 0.5},
        "pivot": {"x": 0.5, "y": 0.5},
        "renderOffset": {"x": 0, "y": 0},
        "placeholder": False,
        "production_ready": False,
        "approved": False,
        "license": "PENDING_OWNER_REVIEW",
        "source": "internal-generated; imagegen glow sheet cropped into canonical cells",
        "tool": "built-in image_gen",
        "toolVersion": "not exposed by runtime",
        "creator": "Codex / Crop Extras Asset Owner",
    }
    assets = []
    for asset_id in IDS:
        metadata = dict(common)
        metadata.update(
            {
                "id": asset_id,
                "sourceFile": f"assets-src/effects/{asset_id}.png",
                "format": "PNG",
                "mode": "RGBA",
            }
        )
        assets.append(metadata)
    manifest = {
        "taskId": "ART-13",
        "contentVersion": "mvp-1",
        "status": "RUNNING",
        "canonicalCount": len(IDS),
        "assets": assets,
        "animation": {
            "id": "crop_ready_glow",
            "atlas": "effects",
            "directions": ["NONE"],
            "defaultDirection": "NONE",
            "sourceScale": 2,
            "anchor": {"x": 0.5, "y": 0.86},
            "pivot": {"x": 0.5, "y": 0.86},
            "mirrorAllowed": False,
            "canvasSizes": ["256x256"],
            "frameAnchors": ["0.5,0.5"],
            "state": "DEFAULT",
            "frameCount": 4,
            "frameIds": IDS,
            "fps": 8,
            "loop": False,
            "holdLast": False,
            "events": [],
        },
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
        "separationInvariant": "Glow is an overlay; never bake into crop artwork.",
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
        "imagegen sheet; glow remains separate from all crop artwork."
    )
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
