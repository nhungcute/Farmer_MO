"""Local technical QA for the ART-12 isolated UI candidate set."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
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


def main() -> None:
    checks: list[dict] = []

    def check(name: str, passed: bool, detail: str) -> None:
        checks.append({"name": name, "status": "PASS" if passed else "FAIL", "detail": detail})
        if not passed:
            raise AssertionError(f"{name}: {detail}")

    files = sorted(OUT.glob("*.png"))
    names = [file.stem for file in files]
    check("id_count", len(files) == len(IDS), f"expected {len(IDS)}, found {len(files)}")
    check("exact_ids", names == sorted(IDS), f"unexpected candidates: {names}")
    for asset_id in IDS:
        image_path = OUT / f"{asset_id}.png"
        image = Image.open(image_path)
        check(f"{asset_id}.dimensions", image.size == (128, 128), str(image.size))
        check(f"{asset_id}.rgba", image.mode == "RGBA", image.mode)
        alpha = image.getchannel("A")
        low, high = alpha.getextrema()
        check(f"{asset_id}.true_alpha", low == 0 and high > 0, f"alpha extrema={low},{high}")
        check(
            f"{asset_id}.transparent_corners",
            all(alpha.getpixel(point) == 0 for point in ((0, 0), (127, 0), (0, 127), (127, 127))),
            "all four corners must remain transparent",
        )

    manifest = json.loads((ROOT / "CANDIDATE_MANIFEST.json").read_text(encoding="utf-8"))
    check("manifest_count", manifest["canonicalCount"] == len(IDS), str(manifest["canonicalCount"]))
    check("manifest_ids", [asset["id"] for asset in manifest["assets"]] == IDS, "manifest order/IDs")
    for asset in manifest["assets"]:
        check(f"{asset['id']}.metadata", all(asset[key] == expected for key, expected in {
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
        }.items()), "canonical metadata preserved")
    check("source_evidence", (ROOT / "source" / "ui-sprite-sheet.png").exists(), "imagegen source sheet present")

    result = {
        "taskId": "ART-12",
        "status": "PASS",
        "scope": IDS,
        "checks": checks,
        "technicalReview": "PASS (task-local QA)",
        "styleReview": "PENDING_OWNER_REVIEW",
        "approvalRef": None,
        "releaseFlags": {"placeholder": False, "production_ready": False, "approved": False},
    }
    (ROOT / "ART_QA.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    metadata_path = ROOT / "ART_METADATA.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata.update(status="REVIEW", generationStatus="COMPLETE", technicalReview="PASS", styleReview="PENDING")
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    manifest_path = ROOT / "CANDIDATE_MANIFEST.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest.update(status="REVIEW", technicalReview="PASS", styleReview="PENDING_OWNER_REVIEW")
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (ROOT / "REVIEW_REPORT.md").write_text(
        "# ART-12 local review\n\n"
        "Technical candidate QA: **PASS** (15/15 exact IDs, 128x128 RGBA PNG, "
        "true alpha, transparent corners, canonical metadata).\n\n"
        "The icons were generated with built-in `image_gen` as one transparent 4x4 "
        "sheet and cropped into canonical files. Style/owner/release review remains "
        "pending; `production_ready` and `approved` remain false.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
