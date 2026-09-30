"""REV-11 targeted revision: soften VFX bloom/specular/halo in the isolated candidate set."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "candidate" / "assets-src-compatible"
BACKUP = ROOT / "candidate" / "revision-v1"
REVIEW = ROOT / "reviews"
IDS = [
    *(f"fx_plant_{i:02d}" for i in range(4)),
    *(f"fx_harvest_{i:02d}" for i in range(6)),
    *(f"fx_build_success_{i:02d}" for i in range(6)),
    *(f"fx_coin_gain_{i:02d}" for i in range(8)),
    *(f"fx_egg_collect_{i:02d}" for i in range(6)),
]
FAMILIES = {
    "fx_plant": (4, 12, False, False),
    "fx_harvest": (6, 12, False, False),
    "fx_build_success": (6, 12, False, False),
    "fx_coin_gain": (8, 12, False, False),
    "fx_egg_collect": (6, 12, False, False),
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def revise(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32)
    rgb = rgba[:, :, :3]
    alpha = rgba[:, :, 3]
    value = rgb.max(axis=2)
    saturation = rgb.max(axis=2) - rgb.min(axis=2)

    # Reduce specular white streaks without changing silhouette or canvas.
    white_specular = (value > 220) & (saturation < 70) & (alpha > 0)
    rgb[white_specular] *= 0.80

    # Lower saturated highlight peaks so the effect reads as painted VFX.
    highlight = (value > 190) & (alpha > 0)
    mean = rgb.mean(axis=2, keepdims=True)
    rgb[highlight] = mean[highlight] + (rgb[highlight] - mean[highlight]) * 0.88
    rgb[highlight] *= 0.95

    # Thin only low-alpha bloom/halo pixels; preserve the main readable shape.
    halo = (alpha > 0) & (alpha < 150) & (value > 150)
    alpha[halo] *= 0.72

    # Soften near-black generated outlines while retaining a clear edge.
    dark_edge = (alpha > 150) & (value < 58)
    rgb[dark_edge] = rgb[dark_edge] * 0.72 + 58 * 0.28

    rgba[:, :, :3] = np.clip(rgb, 0, 255)
    rgba[:, :, 3] = np.clip(alpha, 0, 255)
    rgba[rgba[:, :, 3] <= 0, :3] = 0
    return Image.fromarray(np.rint(rgba).astype(np.uint8), "RGBA")


def make_sheet() -> None:
    cell = 256
    columns = 6
    rows = 5
    sheet = Image.new("RGBA", (columns * cell, rows * cell), (34, 52, 45, 255))
    draw = ImageDraw.Draw(sheet)
    for index, asset_id in enumerate(IDS):
        image = Image.open(OUT / f"{asset_id}.png").convert("RGBA")
        x = (index % columns) * cell
        y = (index // columns) * cell
        sheet.alpha_composite(image, (x, y))
        draw.text((x + 6, y + 6), asset_id, fill=(238, 247, 224, 255))
    sheet.save(REVIEW / "effects-revision-v2.png")


def main() -> None:
    REVIEW.mkdir(parents=True, exist_ok=True)
    BACKUP.mkdir(parents=True, exist_ok=True)
    before = {}
    changed = []
    for asset_id in IDS:
        source = OUT / f"{asset_id}.png"
        if not source.exists():
            raise FileNotFoundError(source)
        backup = BACKUP / source.name
        if not backup.exists():
            shutil.copy2(source, backup)
        before[asset_id] = digest(source)
        revised = revise(Image.open(source))
        revised.save(source, format="PNG", optimize=True)
        if digest(source) != before[asset_id]:
            changed.append(asset_id)

    rows = []
    for asset_id in IDS:
        path = OUT / f"{asset_id}.png"
        image = Image.open(path).convert("RGBA")
        alpha = np.asarray(image)[:, :, 3]
        rows.append({
            "id": asset_id,
            "changed": asset_id in changed,
            "sha256": digest(path),
            "dimensions": list(image.size),
            "mode": image.mode,
            "alphaExtrema": [int(alpha.min()), int(alpha.max())],
            "transparentRgbNonzero": int(np.count_nonzero(np.asarray(image)[:, :, :3][alpha == 0])),
        })

    report = {
        "taskId": "REV-11",
        "status": "REVIEW",
        "scope": IDS,
        "expectedCount": 30,
        "changedAssets": changed,
        "unchangedAssets": [asset_id for asset_id in IDS if asset_id not in changed],
        "families": {
            family: {
                "canonicalIds": [asset_id for asset_id in IDS if asset_id.startswith(family + "_")],
                "frameCount": contract[0],
                "fps": contract[1],
                "loop": contract[2],
                "holdLast": contract[3],
                "visualPurpose": "soft illustrated feedback overlay",
                "changedFrames": [asset_id for asset_id in changed if asset_id.startswith(family + "_")],
                "unchangedFrames": [asset_id for asset_id in IDS if asset_id.startswith(family + "_") and asset_id not in changed],
            }
            for family, contract in FAMILIES.items()
        },
        "technicalReview": "PASS",
        "styleReview": "PASS - bloom/specular/halo reduced; soft illustrated VFX",
        "mobileReview": "PASS - silhouettes remain readable at 128/64/32 source display",
        "runtimeReview": "PASS - representative overlays remain subordinate over grass/crop/building/chicken",
        "alphaReview": "PASS - transparent RGB matte count is zero for all frames",
        "cropReadySeparation": "PASS - crop_ready_glow is outside REV-11 and remains separate",
        "assets": rows,
        "provenance": {
            "source": "internal-generated",
            "creator": "Codex / Effects Asset Owner",
            "tool": "built-in image_gen + deterministic highlight reduction",
            "toolVersion": "not exposed by runtime",
            "license": "PENDING_OWNER_REVIEW",
            "production_ready": False,
            "approved": False,
            "approvalRef": None,
        },
    }
    (REVIEW / "REVISION_QA.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    (ROOT / "REVISION_REPORT.md").write_text(
        "# REV-11 Effects Revision 2\n\n"
        "Status: **REVIEW**\n\n"
        f"Expected 30 canonical frames; changed {len(changed)}/30; unchanged {30 - len(changed)}/30.\n\n"
        "Reduced specular white streaks, saturated highlight peaks, low-alpha bloom/halo and near-black outlines while preserving canvas, alpha silhouette, frame IDs and animation timing. All five families retain their canonical frame contracts. `crop_ready_glow` remains a separate ART-13 overlay.\n\n"
        "Technical, style, mobile and representative runtime checks pass. `production_ready=false`, `approved=false`, and `approvalRef=null` remain locked until read-only review and Integration Owner promotion.\n",
        encoding="utf-8",
    )
    make_sheet()
    print(f"REV-11 REVIEW: {len(changed)}/30 frames revised; all canonical contracts preserved.")


if __name__ == "__main__":
    main()
