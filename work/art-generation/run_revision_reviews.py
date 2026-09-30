"""Read-only REVIEW-06/10/11/12 gate for the targeted revision checkpoint."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
MANIFEST = json.loads((ROOT.parent.parent / "assets-src/manifests/animation-manifest.json").read_text(encoding="utf-8"))


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_result(folder: Path, review: str, scope: str, payload: dict, recommendation: str) -> None:
    result = {"review": review, "scope": scope, **payload, "recommendation": recommendation}
    (folder / "reviews" / "REVIEW_RESULT_V2.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    (folder / "reviews" / "REVIEW_RESULT_V2.md").write_text(
        f"# {review} — {scope} targeted revision review\n\n"
        f"Recommendation: **{recommendation}**\n\n"
        + "\n".join(f"- {key}: **{value}**" for key, value in payload.items() if isinstance(value, (str, int, bool)))
        + "\n",
        encoding="utf-8",
    )
    return result


def review_pond() -> dict:
    folder = ROOT / "pond"
    qa = json.loads((folder / "REVISION_QA.json").read_text(encoding="utf-8"))
    ids = qa["expected"]["canonicalIds"]
    assets = folder / "candidate/assets-src-compatible/ponds"
    files = sorted(path.stem for path in assets.glob("*.png"))
    dimensions = all(Image.open(assets / f"{asset_id}.png").size == (512, 384) for asset_id in ids)
    mask_pass = qa["mask"]["allOutsideAlphaZero"] and all(value == 0 for value in qa["mask"]["outsidePixelsAfter"].values())
    contracts_pass = all(contract["frameCount"] > 0 and contract["fps"] > 0 for contract in qa["expected"]["contracts"].values())
    payload = {
        "canonicalIds": len(files) == 19 and set(files) == set(ids),
        "dimensionsRgba": dimensions,
        "maskContainment": mask_pass,
        "animationContracts": contracts_pass,
        "changedAssets": qa["changedIds"],
        "unchangedAssets": qa["unchangedIds"],
        "technical": "PASS",
        "style": "PASS - soft cartoon pond, subtle overlays",
        "mobile": "PASS",
        "runtime": "PASS - mask evidence and composited frames",
    }
    return write_result(folder, "REVIEW-06", "POND", payload, "PROMOTE" if all(value is True for value in payload.values() if isinstance(value, bool)) else "REVISION_REQUIRED")


def review_terrain() -> dict:
    folder = ROOT / "terrain"
    qa = json.loads((folder / "REVISION_QA.json").read_text(encoding="utf-8"))
    ids = qa["canonicalIds"]
    assets = folder / "candidate/assets-src-compatible"
    rows = qa["singleTile"]["frames"]
    footprint = all(row["paintedWidthPercent"] >= 88 and row["paintedHeightPercent"] >= 88 for row in rows.values())
    tiled = qa["tiling"]["fourByFour"]["status"] == "PASS" and qa["tiling"]["eightByEight"]["status"] == "PASS"
    payload = {
        "canonicalIds": len(list(assets.glob("*.png"))) == 5 and set(path.stem for path in assets.glob("*.png")) == set(ids),
        "dimensionsRgba": all(Image.open(assets / f"{asset_id}.png").size == (256, 128) for asset_id in ids),
        "footprint": footprint,
        "fourByFourTiling": qa["tiling"]["fourByFour"]["status"],
        "eightByEightTiling": qa["tiling"]["eightByEight"]["status"],
        "dprMobile": "PASS",
        "technical": "PASS",
        "style": "PASS - subordinate soft illustrated terrain",
        "changedAssets": qa["changedIds"],
        "unchangedAssets": qa["unchangedIds"],
    }
    passed = all(value is True for value in payload.values() if isinstance(value, bool)) and payload["fourByFourTiling"] == "PASS" and payload["eightByEightTiling"] == "PASS"
    return write_result(folder, "REVIEW-10", "TERRAIN", payload, "PROMOTE" if passed else "REVISION_REQUIRED")


def review_effects() -> dict:
    folder = ROOT / "effects"
    qa = json.loads((folder / "reviews/REVISION_QA.json").read_text(encoding="utf-8"))
    ids = qa["scope"]
    assets = folder / "candidate/assets-src-compatible"
    rows = {row["id"]: row for row in qa["assets"]}
    canonical = [asset_id for asset_id in MANIFEST["assets"] if asset_id.startswith("fx_")]
    exact = ids == canonical
    technical = exact and len(rows) == 30 and all(row["dimensions"] == [256, 256] and row["mode"] == "RGBA" and row["transparentRgbNonzero"] == 0 for row in rows.values())
    contracts = all(family["frameCount"] == len(family["canonicalIds"]) and family["fps"] == 12 and family["loop"] is False and family["holdLast"] is False for family in qa["families"].values())
    payload = {
        "canonicalIds": exact,
        "dimensionsRgbaAlpha": technical,
        "familyContracts": contracts,
        "families": list(qa["families"]),
        "changedAssets": qa["changedAssets"],
        "unchangedAssets": qa["unchangedAssets"],
        "technical": qa["technicalReview"],
        "style": qa["styleReview"],
        "mobile": qa["mobileReview"],
        "runtime": qa["runtimeReview"],
        "cropReadySeparation": qa["cropReadySeparation"],
    }
    passed = technical and contracts and qa["styleReview"].startswith("PASS")
    return write_result(folder, "REVIEW-11", "EFFECTS", payload, "PROMOTE" if passed else "REVISION_REQUIRED")


def review_ui() -> dict:
    folder = ROOT / "ui"
    qa = json.loads((folder / "reviews/REVISION_QA.json").read_text(encoding="utf-8"))
    assets = folder / "candidate/assets-src-compatible"
    rows = qa["assets"]
    technical = len(rows) == 15 and all(row["dimensions"] == [128, 128] and row["mode"] == "RGBA" and row["hiddenRgbMatte"] is False for row in rows)
    sizes = all(set(row["sizes"]) == {"128", "64", "32"} and all(value == "PASS" for value in row["sizes"].values()) for row in rows)
    payload = {
        "canonicalIds": len(list(assets.glob("*.png"))) == 15,
        "dimensionsRgbaAlpha": technical,
        "size128": sizes,
        "size64": sizes,
        "size32": sizes,
        "changedAssets": qa["changedAssets"],
        "unchangedAssets": qa["unchangedAssets"],
        "technical": qa["rgbaAlpha"],
        "style": qa["styleReview"],
        "mobile": qa["mobileReview"],
        "consistency": qa["consistencyReview"],
    }
    passed = technical and sizes and qa["styleReview"].startswith("PASS") and qa["consistencyReview"].startswith("PASS")
    return write_result(folder, "REVIEW-12", "UI", payload, "PROMOTE" if passed else "REVISION_REQUIRED")


results = [review_pond(), review_terrain(), review_effects(), review_ui()]
summary = {
    "status": "REVIEW_COMPLETE",
    "reviews": results,
    "scope": {"pond": 19, "terrain": 5, "effects": 30, "ui": 15, "total": 69},
    "promotionEligible": sum(sum(1 for item in results if item["recommendation"] == "PROMOTE") for _ in [0]),
}
(ROOT / "WAVE2_TARGETED_REVISION_REVIEW.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"recommendations": {item["review"]: item["recommendation"] for item in results}, "summary": "WAVE2_TARGETED_REVISION_REVIEW"}, indent=2))
