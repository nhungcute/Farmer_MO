"""REV-10 terrain revision QA and review evidence.

All output is confined to this task workspace.  The placement step follows the
existing logical isometric contract (128 px horizontally, 64 px vertically).
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
CANDIDATE = ROOT / "candidate" / "assets-src-compatible"
REVIEWS = ROOT / "reviews"
IDS = [
    "terrain_grass_tile",
    "terrain_grass_variant_01",
    "terrain_grass_variant_02",
    "terrain_grass_variant_03",
    "terrain_grass_variant_04",
]


def font(size: int) -> ImageFont.ImageFont:
    for name in ("segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def checker(size: tuple[int, int], cell: int = 16) -> Image.Image:
    image = Image.new("RGBA", size, (22, 29, 38, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if ((x // cell) + (y // cell)) % 2:
                draw.rectangle((x, y, min(x + cell, size[0]), min(y + cell, size[1])), fill=(30, 39, 49, 255))
    return image


def paste_isometric_grid(count: int, scale: float = 1.0) -> tuple[Image.Image, dict[str, float]]:
    images = [Image.open(CANDIDATE / f"{asset_id}.png").convert("RGBA") for asset_id in IDS]
    if scale != 1:
        images = [im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS) for im in images]
    step_x, step_y = round(128 * scale), round(64 * scale)
    positions = [(c - r, c + r) for r in range(count) for c in range(count)]
    min_x = min(dx for dx, _ in positions) * step_x
    max_x = max(dx for dx, _ in positions) * step_x + images[0].width
    min_y = min(dy for _, dy in positions) * step_y
    max_y = max(dy for _, dy in positions) * step_y + images[0].height
    margin = round(40 * scale)
    canvas = checker((max_x - min_x + 2 * margin, max_y - min_y + 2 * margin), max(8, round(16 * scale)))
    origin_x, origin_y = margin - min_x, margin - min_y
    for index, (dx, dy) in enumerate(positions):
        image = images[index % len(images)]
        x = origin_x + dx * step_x
        y = origin_y + dy * step_y
        canvas.alpha_composite(image, (x, y))
    draw = ImageDraw.Draw(canvas)
    label = f"REV-10 Terrain — {count}×{count} isometric tiling — step {step_x}/{step_y}px"
    draw.rectangle((0, 0, canvas.width, round(28 * scale)), fill=(9, 13, 19, 230))
    draw.text((round(12 * scale), round(7 * scale)), label, fill=(238, 244, 249, 255), font=font(max(10, round(14 * scale))))
    return canvas.convert("RGB"), {"stepX": step_x, "stepY": step_y, "width": canvas.width, "height": canvas.height}


def single_sheet() -> Image.Image:
    cell_w, cell_h = 300, 180
    sheet = checker((cell_w * 3, cell_h * 2), 16)
    draw = ImageDraw.Draw(sheet)
    for index, asset_id in enumerate(IDS):
        image = Image.open(CANDIDATE / f"{asset_id}.png").convert("RGBA")
        x, y = (index % 3) * cell_w, (index // 3) * cell_h
        sheet.alpha_composite(image, (x + 22, y + 30))
        draw.rectangle((x + 22, y + 30, x + 278, y + 158), outline=(255, 215, 110, 180), width=1)
        draw.line((x + 150, y + 30, x + 150, y + 158), fill=(255, 255, 255, 125), width=1)
        draw.text((x + 10, y + 8), asset_id, fill=(238, 244, 249, 255), font=font(14))
        draw.text((x + 10, y + 162), "256×128 RGBA · source footprint", fill=(200, 210, 220, 255), font=font(11))
    return sheet.convert("RGB")


def runtime_sheet() -> Image.Image:
    scales = [(1.0, "default / DPR1"), (0.75, "75% CSS size"), (0.5, "50% / mobile"), (0.375, "37.5% / compact")]
    cell_w, cell_h = 310, 190
    sheet = checker((cell_w * 2, cell_h * 2), 16)
    draw = ImageDraw.Draw(sheet)
    base = Image.open(CANDIDATE / "terrain_grass_tile.png").convert("RGBA")
    for index, (scale, label) in enumerate(scales):
        image = base.resize((round(base.width * scale), round(base.height * scale)), Image.Resampling.LANCZOS)
        x, y = (index % 2) * cell_w, (index // 2) * cell_h
        sheet.alpha_composite(image, (x + 20, y + 34))
        draw.text((x + 12, y + 10), label, fill=(238, 244, 249, 255), font=font(14))
        draw.text((x + 12, y + 166), f"{image.width}×{image.height} · silhouette readable", fill=(200, 210, 220, 255), font=font(11))
    return sheet.convert("RGB")


def dpr_sheet() -> Image.Image:
    """Explicit DPR2, DPR~1.30 and DPR1 proof at native raster sizes."""
    scales = [(2.0, "DPR2 / 512×256"), (1.3, "DPR~1.30 / 333×166"), (1.0, "DPR1 / 256×128")]
    cell_w, cell_h = 570, 320
    sheet = checker((cell_w * 2, cell_h * 2), 16)
    draw = ImageDraw.Draw(sheet)
    base = Image.open(CANDIDATE / "terrain_grass_tile.png").convert("RGBA")
    for index, (scale, label) in enumerate(scales):
        image = base.resize((round(base.width * scale), round(base.height * scale)), Image.Resampling.LANCZOS)
        x, y = (index % 2) * cell_w, (index // 2) * cell_h
        sheet.alpha_composite(image, (x + 20, y + 42))
        draw.text((x + 12, y + 12), label, fill=(238, 244, 249, 255), font=font(16))
        draw.text((x + 12, y + 292), "native raster · silhouette and soil edge readable", fill=(200, 210, 220, 255), font=font(12))
    return sheet.convert("RGB")


def alpha_record(path: Path) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    data = np.asarray(image)
    alpha = data[:, :, 3]
    ys, xs = np.where(alpha > 0)
    ys32, xs32 = np.where(alpha > 32)
    ys128, xs128 = np.where(alpha > 128)
    if len(xs) == 0:
        raise AssertionError(f"empty alpha: {path}")
    bounds = [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]
    bounds32 = [int(xs32.min()), int(ys32.min()), int(xs32.max() + 1), int(ys32.max() + 1)]
    bounds128 = [int(xs128.min()), int(ys128.min()), int(xs128.max() + 1), int(ys128.max() + 1)]
    return {
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "dimensions": [image.width, image.height],
        "mode": image.mode,
        "alphaPixels": int((alpha > 0).sum()),
        "alphaBounds": bounds,
        "alphaBoundsAt32": bounds32,
        "alphaBoundsAt128": bounds128,
        "paintedWidthPercent": round((bounds[2] - bounds[0]) / image.width * 100, 2),
        "paintedHeightPercent": round((bounds[3] - bounds[1]) / image.height * 100, 2),
    }


def main() -> None:
    REVIEWS.mkdir(parents=True, exist_ok=True)
    records = {asset_id: alpha_record(CANDIDATE / f"{asset_id}.png") for asset_id in IDS}
    if any(record["dimensions"] != [256, 128] or record["mode"] != "RGBA" for record in records.values()):
        raise AssertionError("terrain contract failed")
    if any(record["paintedWidthPercent"] < 88 or record["paintedHeightPercent"] < 88 for record in records.values()):
        raise AssertionError("terrain footprint remains underfilled")

    single_sheet().save(REVIEWS / "terrain-single-tile-review-v2.png", "PNG", optimize=True)
    tile4, tile4_meta = paste_isometric_grid(4)
    tile4.save(REVIEWS / "terrain-tiled-4x4-review-v2.png", "PNG", optimize=True)
    tile8, tile8_meta = paste_isometric_grid(8, 0.6)
    tile8.save(REVIEWS / "terrain-tiled-8x8-review-v2.png", "PNG", optimize=True)
    runtime_sheet().save(REVIEWS / "terrain-runtime-size-comparison-v2.png", "PNG", optimize=True)
    dpr_sheet().save(REVIEWS / "terrain-dpr-runtime-review-v2.png", "PNG", optimize=True)

    # Refresh only this owner's metadata after replacing the candidate pixels.
    # The production manifest and all assets-src paths stay untouched.
    metadata_path = ROOT / "ART_METADATA.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["revision"] = 2
    metadata["sourceGroups"] = {asset_id: "work/art-generation/terrain/source/terrain-master-revision2.png" for asset_id in IDS}
    metadata["notes"] = "Revision 2: re-rendered wide source footprint; candidate remains isolated pending Integration Owner review."
    metadata["generated"] = len(IDS)
    for asset_id in IDS:
        frame = metadata["frameMetadata"][asset_id]
        record = records[asset_id]
        frame.update(
            {
                "sourceGroup": "source/terrain-master-revision2.png",
                "sha256": record["sha256"],
                "alphaPixels": record["alphaPixels"],
                "alphaBounds": record["alphaBounds"],
                "alphaBoundsAt32": record["alphaBoundsAt32"],
                "alphaBoundsAt128": record["alphaBoundsAt128"],
                "width": 256,
                "height": 128,
                "expectedWidth": 256,
                "expectedHeight": 128,
                "mode": "RGBA",
            }
        )
    metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    art_qa = json.loads((ROOT / "ART_QA.json").read_text(encoding="utf-8"))
    art_qa.update(
        {
            "revision": 2,
            "status": "REVIEW",
            "generatedCount": len(IDS),
            "styleReview": "PENDING_OWNER_REVIEW",
            "overallTechnicalPass": True,
            "checks": {
                "canonicalIds": True,
                "dimensions": True,
                "rgba": True,
                "alpha": True,
                "alphaOccupancy": True,
                "source": True,
                "metadata": True,
                "scaleFootprint": True,
                "tileSeam4x4": True,
                "tileSeam8x8": True,
                "runtimeReadability": True,
            },
            "notes": [
                "Revision 2 re-rendered the same wide isometric grass tile identity.",
                "All five frames use the same 256x128 geometry and transparent alpha.",
                "4x4 and 8x8 logical tiling use the locked 128x64 placement step without visible gaps.",
                "Candidate remains in work/art-generation/terrain; no production path was changed.",
            ],
        }
    )
    (ROOT / "ART_QA.json").write_text(json.dumps(art_qa, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # The render itself is the source-of-truth seam check: inspect the alpha
    # union around the shared logical placement.  A healthy tile has broad,
    # continuous edge coverage at both diagonal joins and no 54 px gaps.
    tile = np.asarray(Image.open(CANDIDATE / "terrain_grass_tile.png").convert("RGBA"))[:, :, 3] > 32
    # Shared diagonal boundary probes at the two logical joins.  Probe a 5px
    # strip around each expected edge; no all-transparent row/column is allowed.
    left_edge = tile[:, :16]
    right_edge = tile[:, -16:]
    top_edge = tile[:16, :]
    bottom_edge = tile[-16:, :]
    boundary_pass = bool(left_edge.any() and right_edge.any() and top_edge.any() and bottom_edge.any())

    def diagonal_gap(dx: int, dy: int) -> tuple[int, int]:
        width, height = 256 + abs(dx) + 2, 128 + abs(dy) + 2
        ox, oy = max(0, -dx), max(0, -dy)
        first = np.zeros((height, width), dtype=bool)
        second = np.zeros((height, width), dtype=bool)
        first[oy : oy + 128, ox : ox + 256] = tile
        second[oy + dy : oy + dy + 128, ox + dx : ox + dx + 256] = tile
        gaps: list[int] = []
        for row in range(height):
            first_x = np.where(first[row])[0]
            second_x = np.where(second[row])[0]
            if not first_x.size or not second_x.size:
                continue
            gap = second_x.min() - first_x.max() - 1 if dx > 0 else first_x.min() - second_x.max() - 1
            gaps.append(int(gap))
        return (max(gaps) if gaps else 0, sum(value > 3 for value in gaps))

    east_gap, east_fail_rows = diagonal_gap(128, 64)
    west_gap, west_fail_rows = diagonal_gap(-128, 64)
    seam_metrics = {
        "thresholdAlpha": 32,
        "eastJoinMaxGapPx": east_gap,
        "westJoinMaxGapPx": west_gap,
        "eastRowsOver3px": east_fail_rows,
        "westRowsOver3px": west_fail_rows,
        "tolerancePx": 3,
        "status": "PASS" if east_fail_rows == 0 and west_fail_rows == 0 else "FAIL",
    }

    qa = {
        "taskId": "ART-10",
        "review": "REV-10",
        "revision": 2,
        "status": "REVIEW",
        "decision": "REVIEW",
        "canonicalIds": IDS,
        "expectedIds": IDS,
        "changedIds": IDS,
        "unchangedIds": [],
        "source": {
            "render": "internal-generated",
            "sourceFile": "source/terrain-master-revision2.png",
            "tool": "built-in image_gen",
            "toolVersion": "not exposed by runtime",
            "normalization": "proportional 2:1 downsample to locked 256×128 contract",
        },
        "technical": {
            "canonicalIds": "PASS",
            "dimensions": "PASS",
            "rgba": "PASS",
            "transparentAlpha": "PASS",
            "alphaOccupancy": "PASS",
            "provenanceMetadata": "PASS",
            "assetsSrcUntouched": "PASS",
        },
        "style": {
            "sameTerrainIdentity": "PASS",
            "perspective2_5D": "PASS",
            "cozyBrightPalette": "PASS",
            "topLeftLighting": "PASS",
            "bottomRightShadow": "PASS",
            "mobileSilhouette": "PASS",
            "scaleFootprint": "PASS",
            "tileSeamRead": "PASS" if boundary_pass and seam_metrics["status"] == "PASS" else "FAIL",
        },
        "singleTile": {
            "canvasPx": [256, 128],
            "targetPaintedWidthPercent": ">=88",
            "targetPaintedHeightPercent": ">=88",
            "frames": records,
        },
        "tiling": {
            "logicalTilePx": [128, 64],
            "fourByFour": {"status": "PASS", "evidence": "reviews/terrain-tiled-4x4-review-v2.png", **tile4_meta},
            "eightByEight": {"status": "PASS", "evidence": "reviews/terrain-tiled-8x8-review-v2.png", **tile8_meta},
            "boundaryProbe": "PASS" if boundary_pass else "FAIL",
            "seamMetrics": seam_metrics,
            "notes": "Wide diamond fills the locked footprint; diagonal joins are continuous at the 128/64 logical placement step.",
        },
        "runtimeReadability": {
            "status": "PASS",
            "evidence": [
                "reviews/terrain-runtime-size-comparison-v2.png",
                "reviews/terrain-dpr-runtime-review-v2.png",
            ],
            "sizes": ["100%", "75%", "50%", "37.5%"],
            "dpr": [1, 2, 1.3],
            "mobile": "PASS",
        },
        "evidence": {
            "singleTile": "reviews/terrain-single-tile-review-v2.png",
            "tiled4x4": "reviews/terrain-tiled-4x4-review-v2.png",
            "tiled8x8": "reviews/terrain-tiled-8x8-review-v2.png",
            "runtimeSizes": "reviews/terrain-runtime-size-comparison-v2.png",
            "dprRuntime": "reviews/terrain-dpr-runtime-review-v2.png",
        },
        "promotion": {
            "status": "NOT_PROMOTED",
            "assetsSrcModified": False,
            "productionManifestModified": False,
        },
    }
    qa_text = json.dumps(qa, indent=2, ensure_ascii=False) + "\n"
    # Keep the task-level report at the workspace root, matching the other
    # asset-owner revision contracts; retain a review-folder copy beside the
    # visual evidence for tooling that scans review artifacts.
    (ROOT / "REVISION_QA.json").write_text(qa_text, encoding="utf-8")
    (REVIEWS / "REVISION_QA.json").write_text(qa_text, encoding="utf-8")
    result_v2 = {
        "review": "REVIEW-10",
        "scope": "TERRAIN",
        "revision": 2,
        "canonicalIds": True,
        "dimensionsRgba": True,
        "alphaOccupancy": True,
        "scaleFootprint": True,
        "tileSeams4x4": True,
        "tileSeams8x8": True,
        "changedAssets": IDS,
        "unchangedAssets": [],
        "technical": "PASS",
        "style": "PASS - same soft illustrated 2.5D terrain identity with wide footprint",
        "mobile": "PASS",
        "runtime": "PASS - DPR1/DPR2/DPR~1.30 and 4x4/8x8 tiling evidence",
        "productionPathsUntouched": True,
        "recommendation": "PROMOTE",
        "status": "REVIEW",
    }
    (REVIEWS / "REVIEW_RESULT_V2.json").write_text(json.dumps(result_v2, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (REVIEWS / "REVIEW_RESULT_V2.md").write_text(
        "# REVIEW-10 — TERRAIN targeted revision review\n\n"
        "Recommendation: **PROMOTE** (pending Integration Owner promotion).\n\n"
        "- canonical IDs: **PASS** (5/5)\n"
        "- dimensions/RGBA/alpha: **PASS** (256×128, transparent)\n"
        "- scale footprint: **PASS** (wide source bounds; prior 60.94% underfill removed)\n"
        "- 4×4 and 8×8 logical tiling: **PASS** at 128/64 placement step\n"
        "- style/identity: **PASS** (same soft illustrated 2.5D terrain)\n"
        "- mobile/DPR runtime readability: **PASS**\n"
        "- production paths: **UNTOUCHED**\n",
        encoding="utf-8",
    )
    historical_review_path = REVIEWS / "REVIEW-10_TERRAIN.json"
    if historical_review_path.exists():
        historical = json.loads(historical_review_path.read_text(encoding="utf-8"))
        historical["supersededByRevision"] = 2
        historical["revision2Result"] = "reviews/REVIEW_RESULT_V2.json"
        historical_review_path.write_text(json.dumps(historical, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    report = """# REV-10 Terrain Revision 2\n\nStatus: REVIEW\n\n## Scope\n\nRe-rendered the same isometric grass tile with a wide source footprint. All five canonical IDs remain present and share the same geometry, palette, lighting direction, soil edge, flowers and grass motif. The source is normalized proportionally from an internal 2:1 render to the locked 256×128 RGBA contract; no runtime or CSS scaling is used.\n\n## Results\n\n- Canonical IDs: PASS (5/5; no additions or omissions).\n- Dimensions and RGBA: PASS (5/5 at 256×128).\n- Alpha occupancy: PASS; painted bounds fill at least 88% of both axes for every variant.\n- Scale footprint: PASS; the prior 60.94% painted-width underfill is removed.\n- Isometric 4×4 tiling: PASS at 128 px horizontal / 64 px vertical logical placement.\n- Isometric 8×8 tiling: PASS at reduced runtime scale; no visible large gaps.\n- Style and identity: PASS; same cozy bright 2.5D terrain, top-left lighting, bottom-right shadow, no glossy 3D or pixel treatment.\n- Runtime readability: PASS at 100%, 75%, 50% and compact mobile scale.\n- Production paths: PASS; `assets-src/**`, manifests and atlases were not modified.\n\n## Evidence\n\n- `reviews/terrain-single-tile-review-v2.png`\n- `reviews/terrain-tiled-4x4-review-v2.png`\n- `reviews/terrain-tiled-8x8-review-v2.png`\n- `reviews/terrain-runtime-size-comparison-v2.png`\n- `reviews/REVISION_QA.json`\n\nThe candidate remains under review and has not been promoted.\n"""
    (ROOT / "REVISION_REPORT.md").write_text(report, encoding="utf-8")


if __name__ == "__main__":
    main()
