"""Validate all Wave 2 candidate workspaces without touching production assets.

This is an integration-owner pre-review gate. It checks the canonical IDs, image
contracts, provenance, release flags, and task review state while every candidate
remains under work/art-generation/**.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent

TASKS = {
    "ART-06": ("pond", [
        "pond_small_lv1_base",
        *[f"pond_small_lv1_water_{index:02d}" for index in range(8)],
        *[f"pond_small_lv1_ripple_{index:02d}" for index in range(6)],
        *[f"pond_small_lv1_sparkle_{index:02d}" for index in range(4)],
    ], (512, 384)),
    "ART-07": ("buildings/farmhouse", ["building_farmhouse_lv1"], (512, 384)),
    "ART-08": ("buildings/warehouse", ["building_warehouse_lv1"], (512, 384)),
    "ART-09": ("buildings/chicken-coop", ["building_chicken_coop_lv1"], (512, 384)),
    "ART-10": ("terrain", [
        "terrain_grass_tile",
        *[f"terrain_grass_variant_{index:02d}" for index in range(1, 5)],
    ], (256, 128)),
    "ART-11": ("effects", [
        *[f"fx_plant_{index:02d}" for index in range(4)],
        *[f"fx_harvest_{index:02d}" for index in range(6)],
        *[f"fx_build_success_{index:02d}" for index in range(6)],
        *[f"fx_coin_gain_{index:02d}" for index in range(8)],
        *[f"fx_egg_collect_{index:02d}" for index in range(6)],
    ], (256, 256)),
    "ART-12": ("ui", [
        "icon_coin", "icon_diamond", "icon_rice", "icon_carrot", "icon_corn",
        "icon_tomato", "icon_chicken_feed", "icon_egg", "icon_order",
        "ui_rotate_overlay", "ui_loading", "ui_success_toast", "ui_error_toast",
        "build_ghost_valid", "build_ghost_invalid",
    ], (128, 128)),
    "ART-13": ("crops/extras", [f"crop_ready_glow_{index:02d}" for index in range(4)], (256, 256)),
}


def fail(message: str) -> None:
    raise SystemExit(f"WAVE2 QA FAIL: {message}")


def main() -> None:
    report: dict = {"status": "PASS", "tasks": {}, "totals": {"expected": 0, "found": 0}}
    for task_id, (relative, expected_ids, expected_size) in TASKS.items():
        task_root = ROOT / relative
        metadata_path = task_root / "ART_METADATA.json"
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        if metadata.get("taskId") != task_id:
            fail(f"{task_id}: metadata taskId mismatch")
        for key, expected in {
            "status": "REVIEW",
            "technicalReview": "PASS",
            "source": "internal-generated",
            "license": "PENDING_OWNER_REVIEW",
            "licenseApproval": "PENDING_OWNER_REVIEW",
            "placeholder": False,
            "production_ready": False,
            "approved": False,
            "approvalRef": None,
        }.items():
            if metadata.get(key) != expected:
                fail(f"{task_id}: metadata {key}={metadata.get(key)!r}, expected {expected!r}")
        if not metadata.get("creator") or not metadata.get("tool") or not metadata.get("toolVersion"):
            fail(f"{task_id}: incomplete provenance")
        frame_records = list(metadata.get("frameMetadata", {}).values())
        for record in frame_records:
            if record.get("license") != "PENDING_OWNER_REVIEW":
                fail(f"{task_id}: frame {record.get('id', record.get('sourceFile'))} has an unconfirmed license")
            if record.get("source") != "internal-generated":
                fail(f"{task_id}: frame provenance source is not internal-generated")

        candidate_root = task_root / "candidate" / "assets-src-compatible"
        images = sorted(candidate_root.glob("**/*.png"))
        found_ids = [image.stem for image in images]
        if found_ids != sorted(expected_ids):
            fail(f"{task_id}: IDs differ; expected {sorted(expected_ids)}, found {found_ids}")
        manifest_path = task_root / "CANDIDATE_MANIFEST.json"
        if manifest_path.exists():
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            if manifest.get("status") != "REVIEW" or manifest.get("technicalReview") != "PASS":
                fail(f"{task_id}: candidate manifest is not at REVIEW/PASS")
            for record in manifest.get("assets", []):
                if record.get("license") != "PENDING_OWNER_REVIEW":
                    fail(f"{task_id}: candidate manifest has an unconfirmed license")
                if record.get("placeholder") is not False or record.get("production_ready") is not False or record.get("approved") is not False:
                    fail(f"{task_id}: candidate manifest release flags are not closed")
        task_report = {
            "expected": len(expected_ids),
            "found": len(images),
            "dimensions": list(expected_size),
            "images": [],
            "status": "PASS",
        }
        for image_path in images:
            image = Image.open(image_path)
            if image.size != expected_size:
                fail(f"{task_id}/{image_path.stem}: dimensions {image.size} != {expected_size}")
            if image.mode != "RGBA":
                fail(f"{task_id}/{image_path.stem}: mode {image.mode} != RGBA")
            alpha = image.getchannel("A")
            low, high = alpha.getextrema()
            if low != 0 or high <= 0:
                fail(f"{task_id}/{image_path.stem}: invalid alpha extrema {low},{high}")
            # A fully transparent pixel must not carry a hidden matte color.
            rgba = np.asarray(image)
            hidden_matte = (rgba[:, :, 3] == 0) & np.any(rgba[:, :, :3] != 0, axis=2)
            if bool(hidden_matte.any()):
                fail(f"{task_id}/{image_path.stem}: hidden RGB matte under transparent pixels")
            task_report["images"].append({
                "id": image_path.stem,
                "sha256": hashlib.sha256(image_path.read_bytes()).hexdigest(),
                "size": list(image.size),
                "mode": image.mode,
                "alphaExtrema": [low, high],
            })
        report["tasks"][task_id] = task_report
        report["totals"]["expected"] += len(expected_ids)
        report["totals"]["found"] += len(images)

    if report["totals"]["expected"] != 76 or report["totals"]["found"] != 76:
        fail(f"total candidate count {report['totals']}, expected 76/76")
    output = ROOT / "WAVE2_CANDIDATE_QA.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"WAVE2 QA PASS: {report['totals']['found']}/{report['totals']['expected']} candidates")


if __name__ == "__main__":
    main()
