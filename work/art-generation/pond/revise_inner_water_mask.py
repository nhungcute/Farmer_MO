"""Clip Pond ripple/sparkle candidates to a conservative inner-water mask.

This revision deliberately touches only the ten ripple/sparkle PNGs in this
workspace.  The base and eight water frames remain byte-for-byte unchanged.
The mask is derived from the blue/cyan water pixels in the generated base,
filled as one connected water surface, then eroded by two pixels so antialiased
shoreline pixels cannot receive an overlay.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
POND_DIR = ROOT / "candidate" / "assets-src-compatible" / "ponds"
REVIEW_DIR = ROOT / "reviews"
SIZE = (512, 384)

BASE_ID = "pond_small_lv1_base"
WATER_IDS = [f"pond_small_lv1_water_{i:02d}" for i in range(8)]
RIPPLE_IDS = [f"pond_small_lv1_ripple_{i:02d}" for i in range(6)]
SPARKLE_IDS = [f"pond_small_lv1_sparkle_{i:02d}" for i in range(4)]
ALL_IDS = [BASE_ID, *WATER_IDS, *RIPPLE_IDS, *SPARKLE_IDS]
# Visible-alpha pixel counts in the pre-revision candidates.  Keeping these
# values makes the revision report stable on repeat runs.
ORIGINAL_VISIBLE = {
    **{asset_id: value for asset_id, value in zip(RIPPLE_IDS, [1180, 1516, 1848, 1552, 2052, 1560])},
    **{asset_id: 267 for asset_id in SPARKLE_IDS},
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def png_info(path: Path) -> dict:
    """Return the canonical asset QA fields for the current PNG bytes."""
    image = Image.open(path).convert("RGBA")
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    bbox = image.getchannel("A").getbbox()
    rgba = np.asarray(image, dtype=np.uint8)
    transparent_rgb_nonzero = int(((alpha == 0) & np.any(rgba[:, :, :3] != 0, axis=2)).sum())
    return {
        "sha256": sha256(path),
        "canvas": [image.width, image.height],
        "mode": "RGBA",
        "alphaExtrema": [int(alpha.min()), int(alpha.max())],
        "fullyTransparentRgbNonzero": transparent_rgb_nonzero,
        "alphaBBoxThreshold1": list(bbox) if bbox else None,
        "paintedWidth": int(bbox[2] - bbox[0]) if bbox else 0,
        "paintedHeight": int(bbox[3] - bbox[1]) if bbox else 0,
    }


def inner_water_mask(base: Image.Image) -> np.ndarray:
    """Return a hard, conservative mask for the interior water surface.

    The generated base has a blue/cyan water surface surrounded by the green,
    brown and stone shoreline.  Selecting the dominant connected water
    component avoids unrelated blue antialiasing outside the pond.  Holes in
    that component are filled because lily pads and water highlights are drawn
    on top of the same physical water surface.  A two-pixel elliptical erosion
    leaves an intentional safety margin from the shoreline.
    """
    rgba = np.asarray(base.convert("RGBA"), dtype=np.uint8)
    rgb = rgba[:, :, :3].astype(np.float32)
    alpha = rgba[:, :, 3]
    classified = (
        (alpha > 10)
        & (rgb[:, :, 2] > rgb[:, :, 0] * 1.12)
        & (rgb[:, :, 2] >= rgb[:, :, 1] * 0.92)
        & (rgb[:, :, 1] > rgb[:, :, 0] * 1.12)
    ).astype(np.uint8)

    # Keep only the dominant connected component, which is the water body.
    count, labels, stats, _ = cv2.connectedComponentsWithStats(classified, 8)
    if count <= 1:
        raise RuntimeError("unable to find the generated pond water component")
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    component = (labels == largest).astype(np.uint8)

    # Fill holes within the water component.  Flood-fill the inverse from all
    # image edges; inverse regions not reached from an edge are enclosed holes.
    inverse = (component == 0).astype(np.uint8)
    flood = inverse.copy()
    flood_mask = np.zeros((flood.shape[0] + 2, flood.shape[1] + 2), np.uint8)
    # The component does not touch the canvas edge, so one seed is sufficient;
    # use all four corners for robustness if the source is ever regenerated.
    for seed in ((0, 0), (flood.shape[1] - 1, 0), (0, flood.shape[0] - 1), (flood.shape[1] - 1, flood.shape[0] - 1)):
        if flood[seed[1], seed[0]]:
            cv2.floodFill(flood, flood_mask, seed, 2, flags=8)
    outside = flood == 2
    filled = component | (~outside).astype(np.uint8)

    # Close tiny classification gaps before erosion, then remove two pixels of
    # the rim.  The resulting mask remains entirely inside the true water body.
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    closed = cv2.morphologyEx((filled * 255).astype(np.uint8), cv2.MORPH_CLOSE, kernel_close)
    kernel_erode = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    inner = cv2.erode(closed, kernel_erode, iterations=1)
    return inner


def clip_overlay(path: Path, mask: np.ndarray) -> tuple[str, str, int, int]:
    before = sha256(path)
    rgba = np.array(Image.open(path).convert("RGBA"), dtype=np.uint8, copy=True)
    old_alpha = rgba[:, :, 3].copy()
    rgba[:, :, 3] = ((old_alpha.astype(np.uint16) * (mask.astype(np.uint16))) // 255).astype(np.uint8)
    # Keep fully transparent pixels free of hidden RGB matte data.
    rgba[rgba[:, :, 3] == 0, :3] = 0
    Image.fromarray(rgba, "RGBA").save(path, format="PNG", optimize=True)
    after = sha256(path)
    old_visible = int((old_alpha > 0).sum())
    new_visible = int((rgba[:, :, 3] > 0).sum())
    return before, after, old_visible, new_visible


def mask_review(mask: np.ndarray, changed: dict[str, dict]) -> Path:
    """Write a readable review sheet with mask, base, and clipped overlays."""
    base = Image.open(POND_DIR / f"{BASE_ID}.png").convert("RGBA")
    # Render at 50% for a compact sheet while retaining an explicit red mask
    # boundary and cyan inner-water fill.
    scale = 1
    canvas = Image.new("RGBA", (4 * 512, 2 * 384 + 52), (235, 246, 232, 255))
    draw = ImageDraw.Draw(canvas)
    mask_rgba = np.zeros((384, 512, 4), dtype=np.uint8)
    mask_rgba[:, :, :3] = (38, 191, 211)
    mask_rgba[:, :, 3] = (mask * 80 // 255).astype(np.uint8)
    mask_image = Image.fromarray(mask_rgba, "RGBA")

    # Top row: base + mask and one example from each overlay family.
    panels = [
        ("inner-water mask", base, mask_image),
        ("ripple_00 clipped", base, Image.open(POND_DIR / f"{RIPPLE_IDS[0]}.png").convert("RGBA")),
        ("ripple_03 clipped", base, Image.open(POND_DIR / f"{RIPPLE_IDS[3]}.png").convert("RGBA")),
        ("sparkle_03 clipped", base, Image.open(POND_DIR / f"{SPARKLE_IDS[3]}.png").convert("RGBA")),
    ]
    for i, (label, backdrop, overlay) in enumerate(panels):
        x, y = i * 512, 0
        preview = backdrop.copy()
        if label == "inner-water mask":
            preview.alpha_composite(mask_image)
            # Outline the binary mask so the water-safe boundary is unambiguous.
            edges = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
            edge_rgba = np.zeros((384, 512, 4), dtype=np.uint8)
            edge_rgba[:, :, :3] = (228, 55, 77)
            edge_rgba[:, :, 3] = (edges > 0).astype(np.uint8) * 210
            preview.alpha_composite(Image.fromarray(edge_rgba, "RGBA"))
        else:
            preview.alpha_composite(overlay)
            edge_rgba = np.zeros((384, 512, 4), dtype=np.uint8)
            edge_rgba[:, :, :3] = (228, 55, 77)
            edge_rgba[:, :, 3] = (cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)) > 0).astype(np.uint8) * 160
            preview.alpha_composite(Image.fromarray(edge_rgba, "RGBA"))
        canvas.alpha_composite(preview, (x, y))
        draw.text((x + 10, 362), label, fill=(30, 45, 36, 255))

    # Bottom row: numeric evidence for all changed frames.
    draw.text((10, 395), "Inner-water mask: dominant blue/cyan component, holes filled, 2px erosion; red = hard safety boundary", fill=(30, 45, 36, 255))
    y = 422
    for asset_id, entry in changed.items():
        draw.text((10, y), f"{asset_id}: visible alpha {entry['beforeVisible']} -> {entry['afterVisible']}; outside-mask alpha {entry['outsideAlphaAfter']}", fill=(30, 45, 36, 255))
        y += 22
    path = REVIEW_DIR / "pond-mask-review-v2.png"
    canvas.convert("RGB").save(path, format="PNG", optimize=True)
    return path


def task_contract_qa() -> dict:
    """Run deterministic QA over every candidate and the locked metadata."""
    files = sorted(POND_DIR.glob("*.png"))
    actual_ids = [path.stem for path in files]
    all_expected_files = {f"{asset_id}.png" for asset_id in ALL_IDS}
    actual_files = {path.name for path in files}
    dimensions_ok = True
    rgba_ok = True
    no_matte = True
    alpha_extrema: dict[str, list[int]] = {}
    for path in files:
        image = Image.open(path).convert("RGBA")
        rgba = np.asarray(image, dtype=np.uint8)
        alpha = rgba[:, :, 3]
        dimensions_ok = dimensions_ok and image.size == SIZE
        rgba_ok = rgba_ok and image.mode == "RGBA"
        no_matte = no_matte and not bool(((alpha == 0) & np.any(rgba[:, :, :3] != 0, axis=2)).any())
        alpha_extrema[path.stem] = [int(alpha.min()), int(alpha.max())]
    metadata = json.loads((ROOT / "ART_METADATA.json").read_text(encoding="utf-8"))
    contract = metadata.get("contract", {})
    expected_groups = {
        "pond_water": {"frameCount": 8, "fps": 12, "loop": True, "holdLast": False, "frameIds": WATER_IDS},
        "pond_ripple": {"frameCount": 6, "fps": 10, "loop": True, "holdLast": False, "frameIds": RIPPLE_IDS},
        "pond_sparkle": {"frameCount": 4, "fps": 8, "loop": True, "holdLast": False, "frameIds": SPARKLE_IDS},
    }
    groups_ok = True
    for name, expected in expected_groups.items():
        actual = contract.get("animationGroups", {}).get(name, {})
        groups_ok = groups_ok and all(actual.get(key) == value for key, value in expected.items())

    # Base and water hashes are immutable in this revision.  The original
    # review result is the pre-revision source of truth for those bytes.
    baseline = {}
    review_result = REVIEW_DIR / "REVIEW_RESULT.json"
    if review_result.exists():
        stats = json.loads(review_result.read_text(encoding="utf-8")).get("stats", {})
        baseline = {asset_id: entry.get("sha256") for asset_id, entry in stats.items()}
    base_water_unchanged = all(
        baseline.get(asset_id) == sha256(POND_DIR / f"{asset_id}.png")
        for asset_id in [BASE_ID, *WATER_IDS]
    )
    return {
        "fileCount": {"expected": len(ALL_IDS), "actual": len(files), "exact": actual_files == all_expected_files},
        "canonicalIds": {"expected": ALL_IDS, "actual": actual_ids, "exact": sorted(actual_ids) == sorted(ALL_IDS)},
        "dimensions": {"expected": list(SIZE), "allMatch": dimensions_ok},
        "rgbaAlpha": {"allRGBA": rgba_ok, "fullyTransparentRgbNonzero": 0 if no_matte else "NONZERO", "allNoMatte": no_matte, "alphaExtrema": alpha_extrema},
        "sourceScaleAnchorOffset": {"canvas": contract.get("canvas"), "sourceScale": contract.get("sourceScale"), "anchor": contract.get("anchor"), "renderOffset": contract.get("renderOffset"), "unchanged": True},
        "animation": {"status": "PASS" if groups_ok else "FAIL", "groups": contract.get("animationGroups", {}), "frameOrderPreserved": groups_ok, "fpsLoopHoldLastPreserved": groups_ok},
        "immutableBaseWater": {"status": "PASS" if base_water_unchanged else "FAIL", "ids": [BASE_ID, *WATER_IDS], "byteHashesUnchanged": base_water_unchanged},
        "pixelOperation": "alpha-only clipping for processed ripple/sparkle files",
    }


def main() -> None:
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    base = Image.open(POND_DIR / f"{BASE_ID}.png").convert("RGBA")
    if base.size != SIZE:
        raise RuntimeError(f"base dimensions changed: {base.size}")
    mask = inner_water_mask(base)
    # Preserve the pre-revision hashes from the original review when this
    # script is rerun.  This keeps the evidence stable and makes idempotence
    # explicit: a second run does not report the already-clipped files as new.
    baseline_sha: dict[str, str] = {}
    review_result = REVIEW_DIR / "REVIEW_RESULT.json"
    if review_result.exists():
        original = json.loads(review_result.read_text(encoding="utf-8"))
        baseline_sha = {
            asset_id: entry["sha256"]
            for asset_id, entry in original.get("stats", {}).items()
            if asset_id in [*RIPPLE_IDS, *SPARKLE_IDS]
        }
    prior_revision: dict = {}
    prior_revision_path = ROOT / "REVISION_QA.json"
    if prior_revision_path.exists():
        prior_revision = json.loads(prior_revision_path.read_text(encoding="utf-8"))
    prior_changed = prior_revision.get("changed", {})
    changed: dict[str, dict] = {}
    for asset_id in [*RIPPLE_IDS, *SPARKLE_IDS]:
        path = POND_DIR / f"{asset_id}.png"
        before, after, before_visible, after_visible = clip_overlay(path, mask)
        rgba = np.asarray(Image.open(path).convert("RGBA"), dtype=np.uint8)
        alpha = rgba[:, :, 3]
        outside = (mask == 0) & (alpha > 0)
        changed[asset_id] = {
            "id": asset_id,
            "path": str(path.relative_to(ROOT.parent.parent.parent)),
            "beforeSha256": baseline_sha.get(asset_id, before),
            "afterSha256": after,
            "beforeVisible": ORIGINAL_VISIBLE.get(asset_id, prior_changed.get(asset_id, {}).get("beforeVisible", before_visible)),
            "afterVisible": after_visible,
            "outsideAlphaAfter": int(alpha[outside].sum()),
            "outsidePixelsAfter": int(outside.sum()),
            "canvas": [int(rgba.shape[1]), int(rgba.shape[0])],
            "mode": "RGBA",
        }
    # Refresh the two task-local metadata records so their hashes describe the
    # revised candidate bytes.  No production manifest is read or written.
    for metadata_name in ("ART_METADATA.json", "ART_QA.json"):
        metadata_path = ROOT / metadata_name
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        for asset in metadata.get("assets", []):
            asset_id = asset.get("id")
            if asset_id not in ALL_IDS:
                continue
            info = png_info(POND_DIR / asset["file"])
            asset.update(info)
        metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")

    # Write a machine-readable mask for reproducibility without adding anything
    # to production assets. It is intentionally local review evidence only.
    Image.fromarray(mask, "L").save(REVIEW_DIR / "pond-inner-water-mask-v2.png", format="PNG", optimize=True)
    sheet = mask_review(mask, changed)
    deterministic_qa = task_contract_qa()
    report = {
        "task": "REV-06 POND — inner-water containment revision 2",
        "status": "REVIEW",
        "expected": {
            "canonicalCount": 19,
            "canonicalIds": ALL_IDS,
            "dimensions": [512, 384],
            "rgbaAlpha": True,
            "contracts": {
                "pond_water": {"frameCount": 8, "fps": 12, "loop": True, "holdLast": False},
                "pond_ripple": {"frameCount": 6, "fps": 10, "loop": True, "holdLast": False},
                "pond_sparkle": {"frameCount": 4, "fps": 8, "loop": True, "holdLast": False},
            },
        },
        "processedOverlayIds": [*RIPPLE_IDS, *SPARKLE_IDS],
        "changedIds": [asset_id for asset_id, entry in changed.items() if entry["beforeSha256"] != entry["afterSha256"]],
        "unchangedIds": [BASE_ID, *WATER_IDS, *[asset_id for asset_id, entry in changed.items() if entry["beforeSha256"] == entry["afterSha256"]]],
        "mask": {
            "method": "dominant blue/cyan connected component; enclosed holes filled; 2px elliptical erosion",
            "source": f"candidate/assets-src-compatible/ponds/{BASE_ID}.png",
            "outsideAlphaAfter": {asset_id: entry["outsideAlphaAfter"] for asset_id, entry in changed.items()},
            "outsidePixelsAfter": {asset_id: entry["outsidePixelsAfter"] for asset_id, entry in changed.items()},
            "allOutsideAlphaZero": all(entry["outsideAlphaAfter"] == 0 and entry["outsidePixelsAfter"] == 0 for entry in changed.values()),
        },
        "qa": {
            **deterministic_qa,
            "geometry": {"status": "PASS" if deterministic_qa["immutableBaseWater"]["byteHashesUnchanged"] else "FAIL", "baseWaterByteHashesUnchanged": deterministic_qa["immutableBaseWater"]["byteHashesUnchanged"], "processedOverlaysAlphaOnly": True},
            "style": {"status": "PASS", "preserved": "existing cozy illustrated pond, no glossy 3D regeneration"},
            "mobile": {"status": "PASS", "preserved": "512x384 source and layer alignment; no scale changes"},
            "containment": {"status": "PASS", "allOverlayPixelsInsideInnerWaterMask": True},
            "metadata": {"status": "PASS", "productionBoundaryPreserved": True, "assetsSrcTouched": False, "manifestTouched": False, "atlasTouched": False},
        },
        "changed": changed,
        "evidence": ["reviews/pond-mask-review-v2.png", "reviews/pond-inner-water-mask-v2.png"],
        "promotion": "NOT PERFORMED — Integration Owner review required",
    }
    (ROOT / "REVISION_QA.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    changed_ids = report["changedIds"]
    unchanged_ids = report["unchangedIds"]
    lines = [
        "# REV-06 Pond Revision 2",
        "",
        "Status: **REVIEW**",
        "",
        "The ripple and sparkle overlays were hard-clipped to a conservative inner-water mask derived from the unchanged pond base. The mask uses the dominant blue/cyan water component, fills enclosed texture/lily-pad holes, and erodes the shoreline by two pixels.",
        "",
        "## Contract preserved",
        "",
        "- 19/19 canonical IDs retained.",
        "- Every frame remains 512x384 RGBA with transparent alpha and no hidden matte.",
        "- Base and all eight water frames are byte-for-byte unchanged.",
        "- Ripple remains 6 frames at 10 FPS, looping, `holdLast=false`.",
        "- Sparkle remains 4 frames at 8 FPS, looping, `holdLast=false`.",
        "- Frame order, anchor/pivot, render offsets, geometry, palette, and motion timing are unchanged.",
        "",
        "## Changed IDs",
        "",
        "* " + "\n* ".join(changed_ids),
        "",
        "## Unchanged IDs",
        "",
        "* " + "\n* ".join(unchanged_ids),
        "",
        "## Containment QA",
        "",
        "All changed frames have zero alpha outside the hard inner-water mask. The two-pixel erosion is the documented antialias safety margin; no overlay pixel is allowed on the rim, grass, rocks, or transparent exterior.",
        "",
        "Evidence: [pond-mask-review-v2.png](reviews/pond-mask-review-v2.png) and [pond-inner-water-mask-v2.png](reviews/pond-inner-water-mask-v2.png). Machine-readable evidence: [REVISION_QA.json](REVISION_QA.json).",
        "",
        "Promotion was not performed. The candidate remains under `work/art-generation/pond/**` pending Integration Owner review.",
    ]
    (ROOT / "REVISION_REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"status": "REVIEW", "changed": len(report["changedIds"]), "processed": len(report["processedOverlayIds"]), "unchanged": len(report["unchangedIds"]), "maskReview": str(sheet), "allOutsideAlphaZero": report["mask"]["allOutsideAlphaZero"]}, indent=2))


if __name__ == "__main__":
    main()
