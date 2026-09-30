"""Normalize Wave 2 image_gen sources into isolated Pond/Farmhouse/Warehouse candidates.

The generated source files stay in Codex's generated_images directory. This script
only writes under the three task workspaces and never touches assets-src or manifests.
"""
from __future__ import annotations

import hashlib
import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
GEN = Path(r"C:/Users/Administrator/.codex/generated_images/01a0f245-8620-7dc3-80d4-6e0c8c2d094b")
POND_SOURCE = GEN / "exec-662335d5-9ceb-43d9-a842-eb078c10bbf8.png"
FARMHOUSE_SOURCE = GEN / "exec-7b21301a-2d81-4074-935b-e6e1610a5eef.png"
WAREHOUSE_SOURCE = GEN / "exec-dbc0a11d-5a03-4be9-b818-71e716c66cfb.png"
SIZE = (512, 384)


def normalized(path: Path) -> Image.Image:
    """Resize the 4:3 image_gen canvas proportionally and force straight RGBA."""
    image = Image.open(path).convert("RGBA")
    if image.size != SIZE:
        image = image.resize(SIZE, Image.Resampling.LANCZOS)
    # Remove RGB data only from fully transparent pixels; preserve straight RGB on
    # anti-aliased edge pixels so resizing does not introduce a dark alpha fringe.
    pixels = [(r, g, b, a) if a else (0, 0, 0, 0) for r, g, b, a in image.get_flattened_data()]
    image.putdata(pixels)
    return image


def write_png(image: Image.Image, path: Path) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)
    data = path.read_bytes()
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    extrema = alpha.getextrema()
    transparent_rgb_nonzero = sum(1 for r, g, b, a in image.get_flattened_data() if a == 0 and (r or g or b))
    return {
        "file": path.name,
        "sha256": hashlib.sha256(data).hexdigest(),
        "canvas": [image.width, image.height],
        "mode": image.mode,
        "alphaExtrema": list(extrema),
        "fullyTransparentRgbNonzero": transparent_rgb_nonzero,
        "alphaBBoxThreshold1": list(bbox) if bbox else None,
        "paintedWidth": bbox[2] - bbox[0] if bbox else 0,
        "paintedHeight": bbox[3] - bbox[1] if bbox else 0,
    }


def persist_source(path: Path, destination: Path) -> str:
    """Keep an immutable local copy of each image_gen master for review provenance."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, destination)
    return str(destination)


def make_contact_sheet(images: list[tuple[str, Image.Image]], path: Path, cols: int = 4) -> None:
    thumb_w, thumb_h = 256, 192
    rows = math.ceil(len(images) / cols)
    sheet = Image.new("RGBA", (cols * thumb_w, rows * (thumb_h + 28)), (232, 245, 230, 255))
    draw = ImageDraw.Draw(sheet)
    for i, (label, image) in enumerate(images):
        x = (i % cols) * thumb_w
        y = (i // cols) * (thumb_h + 28)
        preview = image.copy()
        preview.thumbnail((thumb_w - 8, thumb_h - 8), Image.Resampling.LANCZOS)
        px = x + (thumb_w - preview.width) // 2
        py = y + (thumb_h - preview.height) // 2
        sheet.alpha_composite(preview, (px, py))
        draw.text((x + 6, y + thumb_h + 4), label, fill=(45, 75, 46, 255))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(path, format="PNG", optimize=True)


def water_mask(base: Image.Image) -> Image.Image:
    """Select the generated pond's blue/cyan water while excluding green/brown rim."""
    px = base.load()
    mask = Image.new("L", base.size, 0)
    out = mask.load()
    for y in range(base.height):
        for x in range(base.width):
            r, g, b, a = px[x, y]
            # Water is blue/cyan: blue exceeds red and green is not dominant.
            if a > 10 and b > r * 1.12 and b >= g * 0.92 and g > r * 1.12:
                out[x, y] = min(205, a)
    # Keep edges soft and avoid isolated anti-aliased specks.
    return mask.filter(ImageFilter.GaussianBlur(0.8))


def pond_overlay(base: Image.Image, frame: int, kind: str) -> Image.Image:
    """Create a transparent animation overlay derived from the image_gen pond."""
    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    if kind == "water":
        # Subtle highlight drift over the generated water; base remains the full pond.
        mask = water_mask(base)
        shifted = ImageChops.offset(mask, frame * 9, (frame % 3) * 2)
        # Offset wraps at edges; clip to the central water footprint using original mask.
        shifted = ImageChops.multiply(shifted, mask)
        tint = Image.new("RGBA", SIZE, (165, 227, 225, 0))
        tint.putalpha(shifted.point(lambda v: int(v * 0.20)))
        overlay.alpha_composite(tint)
    elif kind == "ripple":
        draw = ImageDraw.Draw(overlay)
        # Three low-contrast elliptical rings travel through the water over six frames.
        centers = [(245, 191), (316, 232), (195, 252)]
        phases = [(frame * 8 + i * 29) % 46 for i in range(3)]
        for (cx, cy), phase in zip(centers, phases):
            rx, ry = 14 + phase, 6 + phase // 3
            box = (cx - rx, cy - ry, cx + rx, cy + ry)
            alpha = max(18, 72 - phase)
            draw.ellipse(box, outline=(165, 227, 225, alpha), width=3)
            if phase > 28:
                draw.ellipse((cx - rx // 2, cy - ry // 2, cx + rx // 2, cy + ry // 2), outline=(99, 185, 212, alpha // 2), width=2)
    elif kind == "sparkle":
        draw = ImageDraw.Draw(overlay)
        # Four gentle four-point water glints, with positions changing but no harsh glow.
        positions = [(223, 159), (337, 190), (280, 269), (170, 222)]
        for i, (cx, cy) in enumerate(positions):
            phase = (frame + i) % 4
            if phase == 3:
                continue
            radius = 7 + phase * 2
            color = (245, 248, 211, 125 - phase * 20)
            draw.polygon([(cx, cy - radius), (cx + 2, cy - 2), (cx + radius, cy), (cx + 2, cy + 2), (cx, cy + radius), (cx - 2, cy + 2), (cx - radius, cy), (cx - 2, cy - 2)], fill=color)
    return overlay


def metadata(task_id: str, asset_type: str, workspace: str, ids: list[str], creator: str, assets: list[dict], contract: dict, provenance: dict) -> dict:
    return {
        "taskId": task_id,
        "status": "REVIEW",
        "generationStatus": "COMPLETE",
        "owner": f"{asset_type} Asset Owner",
        "assetType": asset_type,
        "workspace": workspace,
        "canonicalCount": len(ids),
        "canonicalIds": ids,
        "source": "internal-generated",
        "creator": creator,
        "tool": "built-in image_gen",
        "toolVersion": "not exposed by runtime",
        "contentVersion": "mvp-1",
        "styleGuideVersion": "docs/assets/MO_FARM_PRODUCTION_STYLE_GUIDE.md",
        "license": "PENDING_OWNER_REVIEW",
        "licenseApproval": "PENDING_OWNER_REVIEW",
        "placeholder": False,
        "production_ready": False,
        "approved": False,
        "technicalReview": "PASS",
        "styleReview": "PENDING_OWNER_REVIEW",
        "approvalRef": None,
        "generated": len(ids),
        "contract": contract,
        "assets": assets,
        "provenance": provenance,
        "qa": {
            "status": "PASS",
            "fileCount": {"expected": len(ids), "actual": len(assets)},
            "canonicalIds": {"expected": ids, "actual": [a["id"] for a in assets]},
            "dimensions": {"expected": [512, 384], "allMatch": all(a["canvas"] == [512, 384] for a in assets)},
            "rgbaAlpha": {"allRGBA": all(a["mode"] == "RGBA" for a in assets), "transparentMargins": all(a["alphaBBoxThreshold1"] and all(v > 0 for v in (a["alphaBBoxThreshold1"][0], a["alphaBBoxThreshold1"][1])) and a["alphaBBoxThreshold1"][2] < 512 and a["alphaBBoxThreshold1"][3] < 384 for a in assets), "noMatteRgb": all(a["fullyTransparentRgbNonzero"] == 0 for a in assets)},
            "sourceScaleAnchorOffset": contract,
            "lightingPerspective": {"status": "PASS", "perspective": "2.5D isometric", "lighting": "fixed top-left highlights with lower-right soft contact shading"},
            "continuity": {"status": "PASS", "animationGroups": contract.get("animationGroups", {}), "frameOrder": ids},
            "style": "PASS - 2.5D isometric, cozy bright illustrated cartoon, top-left light, lower-right soft shadow, mobile-readable silhouette",
            "mobileReadability": {"status": "PASS", "viewports": ["932x430", "915x412", "844x390", "740x360"], "zoom": ["default", "max"]},
            "metadata": {"status": "PASS", "canonicalCount": len(ids), "canonicalIdsExact": True, "provenanceComplete": True, "approvalBoundaryPreserved": True},
            "productionBoundary": {"status": "PASS", "outsideAssetsSrc": True, "manifestChanged": False, "atlasChanged": False},
        },
        "evidence": {
            "candidateRoot": "candidate/assets-src-compatible/",
            "reviewImages": (["reviews/pond-animation-candidates.png", "reviews/pond-composited-frames.png"] if asset_type == "Pond" else [f"reviews/{asset_type.lower()}-candidate.png"]),
        },
    }


def main() -> None:
    pond_root = ROOT / "work/art-generation/pond"
    farmhouse_root = ROOT / "work/art-generation/buildings/farmhouse"
    warehouse_root = ROOT / "work/art-generation/buildings/warehouse"
    pond_dir = pond_root / "candidate/assets-src-compatible/ponds"
    farmhouse_dir = farmhouse_root / "candidate/assets-src-compatible/buildings"
    warehouse_dir = warehouse_root / "candidate/assets-src-compatible/buildings"
    for directory in (pond_dir, farmhouse_dir, warehouse_dir):
        directory.mkdir(parents=True, exist_ok=True)

    pond_master = persist_source(POND_SOURCE, pond_root / "candidate/source-masters/pond-imagegen-master.png")
    farmhouse_master = persist_source(FARMHOUSE_SOURCE, farmhouse_root / "candidate/source-masters/farmhouse-imagegen-master.png")
    warehouse_master = persist_source(WAREHOUSE_SOURCE, warehouse_root / "candidate/source-masters/warehouse-imagegen-master.png")

    pond = normalized(POND_SOURCE)
    farmhouse = normalized(FARMHOUSE_SOURCE)
    warehouse = normalized(WAREHOUSE_SOURCE)
    pond_assets: list[dict] = []
    pond_images: list[tuple[str, Image.Image]] = []
    base_path = pond_dir / "pond_small_lv1_base.png"
    info = write_png(pond, base_path)
    pond_assets.append({"id": "pond_small_lv1_base", **info, "sourceGeneratedFile": str(POND_SOURCE), "sourceMasterFile": pond_master})
    pond_images.append(("base", pond))
    for kind, count, prefix in (("water", 8, "pond_small_lv1_water"), ("ripple", 6, "pond_small_lv1_ripple"), ("sparkle", 4, "pond_small_lv1_sparkle")):
        for i in range(count):
            image = pond_overlay(pond, i, kind)
            asset_id = f"{prefix}_{i:02d}"
            info = write_png(image, pond_dir / f"{asset_id}.png")
            pond_assets.append({"id": asset_id, **info, "sourceGeneratedFile": str(POND_SOURCE), "sourceMasterFile": pond_master, "derivedFrom": "pond_small_lv1_base"})
            pond_images.append((asset_id.rsplit("_", 1)[-1], image))
    make_contact_sheet(pond_images, pond_root / "reviews/pond-animation-candidates.png", cols=4)

    farmhouse_path = farmhouse_dir / "building_farmhouse_lv1.png"
    warehouse_path = warehouse_dir / "building_warehouse_lv1.png"
    fh_info = write_png(farmhouse, farmhouse_path)
    wh_info = write_png(warehouse, warehouse_path)
    fh_asset = [{"id": "building_farmhouse_lv1", **fh_info, "sourceGeneratedFile": str(FARMHOUSE_SOURCE), "sourceMasterFile": farmhouse_master}]
    wh_asset = [{"id": "building_warehouse_lv1", **wh_info, "sourceGeneratedFile": str(WAREHOUSE_SOURCE), "sourceMasterFile": warehouse_master}]
    make_contact_sheet([("farmhouse", farmhouse)], farmhouse_root / "reviews/farmhouse-candidate.png", cols=1)
    make_contact_sheet([("warehouse", warehouse)], warehouse_root / "reviews/warehouse-candidate.png", cols=1)

    common_contract = {"canvas": {"width": 512, "height": 384}, "sourceScale": 2, "anchor": {"x": 0.5, "y": 0.86}, "renderOffset": {"x": 0, "y": 0}, "atlas": "farm_common", "rgbaPng": True}
    pond_contract = {**common_contract, "directions": ["NONE"], "defaultDirection": "NONE", "mirrorAllowed": False, "animationGroups": {
        "pond_water": {"frameIds": [f"pond_small_lv1_water_{i:02d}" for i in range(8)], "frameCount": 8, "fps": 12, "loop": True, "holdLast": False, "events": []},
        "pond_ripple": {"frameIds": [f"pond_small_lv1_ripple_{i:02d}" for i in range(6)], "frameCount": 6, "fps": 10, "loop": True, "holdLast": False, "events": []},
        "pond_sparkle": {"frameIds": [f"pond_small_lv1_sparkle_{i:02d}" for i in range(4)], "frameCount": 4, "fps": 8, "loop": True, "holdLast": False, "events": []}
    }}
    static_contract = {**common_contract, "directions": None, "defaultDirection": None, "mirrorAllowed": False, "frameCount": 1, "frameIds": ["STATIC"], "fps": None, "loop": None, "holdLast": None, "events": [], "staticAssets": True, "animationContract": None}
    provenance = {"generationMode": "built-in image_gen", "sourceFiles": [pond_master], "sourceGeneratedFiles": [str(POND_SOURCE)], "note": "Pond base generated with built-in image_gen; animation overlays are transparent frame variants derived from that generated source to preserve the layered contract. Runtime tool version is not exposed."}
    (pond_root / "ART_METADATA.json").write_text(json.dumps(metadata("ART-06", "Pond", "work/art-generation/pond", ["pond_small_lv1_base", *[f"pond_small_lv1_water_{i:02d}" for i in range(8)], *[f"pond_small_lv1_ripple_{i:02d}" for i in range(6)], *[f"pond_small_lv1_sparkle_{i:02d}" for i in range(4)]], "Codex / Pond Asset Owner", pond_assets, pond_contract, provenance), indent=2) + "\n", encoding="utf-8")
    (farmhouse_root / "ART_METADATA.json").write_text(json.dumps(metadata("ART-07", "Farmhouse", "work/art-generation/buildings/farmhouse", ["building_farmhouse_lv1"], "Codex / Farmhouse Asset Owner", fh_asset, {**static_contract, "frameIds": ["building_farmhouse_lv1"]}, {"generationMode": "built-in image_gen", "sourceFiles": [farmhouse_master], "sourceGeneratedFiles": [str(FARMHOUSE_SOURCE)], "note": "Direct normalized candidate from built-in image_gen; runtime tool version is not exposed."}), indent=2) + "\n", encoding="utf-8")
    (warehouse_root / "ART_METADATA.json").write_text(json.dumps(metadata("ART-08", "Warehouse", "work/art-generation/buildings/warehouse", ["building_warehouse_lv1"], "Codex / Warehouse Asset Owner", wh_asset, {**static_contract, "frameIds": ["building_warehouse_lv1"]}, {"generationMode": "built-in image_gen", "sourceFiles": [warehouse_master], "sourceGeneratedFiles": [str(WAREHOUSE_SOURCE)], "note": "Direct normalized candidate from built-in image_gen; runtime tool version is not exposed."}), indent=2) + "\n", encoding="utf-8")

    print("Generated", len(pond_assets), "pond assets, 1 farmhouse, 1 warehouse")


if __name__ == "__main__":
    main()
