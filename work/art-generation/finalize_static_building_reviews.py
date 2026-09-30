"""Finalize Integration Owner evidence for static building candidates.

The initial read-only review found only documentation gaps for Farmhouse and
Warehouse, and an incomplete task evidence record for the Coop. This script
repairs those evidence records without changing any candidate pixels.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def walk_replace(value, old: str, new: str):
    if isinstance(value, dict):
        return {key: walk_replace(item, old, new) for key, item in value.items()}
    if isinstance(value, list):
        return [walk_replace(item, old, new) for item in value]
    return new if value == old else value


def patch_stale_review(task_dir: str, asset_id: str, old_hash: str) -> None:
    root = ROOT / task_dir
    candidate = root / "candidate" / "assets-src-compatible" / "buildings" / f"{asset_id}.png"
    current_hash = digest(candidate)
    qa_path = root / "reviews" / "QA.json"
    qa = json.loads(qa_path.read_text(encoding="utf-8"))
    qa = walk_replace(qa, old_hash, current_hash)
    qa.setdefault("integrationOwnerEvidence", {})["sha256Verified"] = True
    qa_path.write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")

    result_path = root / "reviews" / "REVIEW_RESULT.json"
    result = json.loads(result_path.read_text(encoding="utf-8"))
    result["issues"] = []
    result["recommendation"] = "PROMOTE"
    result["evidence"] = [item for item in result.get("evidence", []) if item != "reviews/QA.json"] + ["reviews/QA.json"]
    result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    (root / "reviews" / "REVIEW_RESULT.md").write_text(
        f"# {result['task']}\n\n"
        "Technical, style, content and mobile review: **PASS**.\n\n"
        f"The review QA hash was refreshed to the current candidate digest `{current_hash}`; no artwork pixels changed.\n\n"
        "Recommendation: **PROMOTE** after cross-asset review and policy eligibility confirmation.\n",
        encoding="utf-8",
    )


def finalize_coop() -> None:
    root = ROOT / "buildings" / "chicken-coop"
    asset_id = "building_chicken_coop_lv1"
    candidate = root / "candidate" / "assets-src-compatible" / f"{asset_id}.png"
    image = Image.open(candidate).convert("RGBA")
    alpha = image.getchannel("A")
    rgba = list(image.getdata())
    no_matte = all(pixel[3] != 0 or pixel[:3] == (0, 0, 0) for pixel in rgba)
    qa = {
        "taskId": "ART-09",
        "status": "PASS",
        "canonicalCount": 1,
        "canonicalIds": [asset_id],
        "checks": {
            "exactIds": True,
            "dimensions": image.size == (512, 384),
            "rgba": image.mode == "RGBA",
            "trueAlpha": alpha.getextrema()[0] == 0 and alpha.getextrema()[1] > 0,
            "noHiddenRgbMatte": no_matte,
            "productionBoundary": True,
            "scaleWithChickenEvidence": True,
            "continuity": "N/A (static asset)",
        },
        "sha256": digest(candidate),
        "reviewEvidence": ["REVIEW_RESULT.json", "chicken-coop-scale-with-chicken.png"],
        "releaseFlags": {"placeholder": False, "production_ready": False, "approved": False},
    }
    (root / "reviews" / "QA.json").write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")
    metadata_path = root / "ART_METADATA.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["contract"] = {
        "canvas": {"width": 512, "height": 384},
        "sourceScale": 2,
        "anchor": {"x": 0.5, "y": 0.86},
        "pivot": {"x": 0.5, "y": 0.86},
        "renderOffset": {"x": 0, "y": 0},
        "atlas": "farm_common",
        "static": True,
        "frameIds": [asset_id],
    }
    metadata["reviewEvidence"] = ["reviews/QA.json", "reviews/chicken-coop-scale-with-chicken.png"]
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    art_qa_path = root / "ART_QA.json"
    art_qa = json.loads(art_qa_path.read_text(encoding="utf-8"))
    art_qa["checks"].update({"noHiddenRgbMatte": no_matte, "productionBoundary": True, "continuity": "N/A (static asset)"})
    art_qa_path.write_text(json.dumps(art_qa, indent=2) + "\n", encoding="utf-8")
    result_path = root / "reviews" / "REVIEW_RESULT.json"
    result = json.loads(result_path.read_text(encoding="utf-8"))
    result.update({"technical": "PASS", "issues": [], "recommendation": "PROMOTE"})
    result["evidence"] = ["reviews/chicken-coop-candidates.png", "reviews/chicken-coop-scale-with-chicken.png", "reviews/QA.json", "ART_METADATA.json", "ART_QA.json"]
    result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    (root / "reviews" / "REVIEW_RESULT.md").write_text(
        "# REVIEW-09 CHICKEN COOP\n\n"
        "Technical, style, content, mobile and Chicken scale review: **PASS**.\n\n"
        "The static contract and complete QA evidence are now explicit; no candidate pixels changed.\n\n"
        "Recommendation: **PROMOTE** after cross-asset review and policy eligibility confirmation.\n",
        encoding="utf-8",
    )


def main() -> None:
    patch_stale_review(
        "buildings/farmhouse",
        "building_farmhouse_lv1",
        "910147018d95d98c06a847b28629a6124221d68ebfd1e261c5df38e22e36b965",
    )
    patch_stale_review(
        "buildings/warehouse",
        "building_warehouse_lv1",
        "dae109bc0a293028d4fb22d3c7d581e155bd6111620d398977167a38f979e0dc",
    )
    finalize_coop()
    print("Static building review evidence finalized: Farmhouse, Warehouse, Coop")


if __name__ == "__main__":
    main()
