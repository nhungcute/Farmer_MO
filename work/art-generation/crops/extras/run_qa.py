"""Local technical and continuity QA for ART-13 crop-ready glow frames."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "candidate" / "assets-src-compatible"
IDS = [
    "crop_ready_glow_00",
    "crop_ready_glow_01",
    "crop_ready_glow_02",
    "crop_ready_glow_03",
]


def alpha_center(image: Image.Image) -> tuple[float, float]:
    alpha = np.asarray(image.getchannel("A"), dtype=np.float64)
    total = alpha.sum()
    if total <= 0:
        raise ValueError("frame has no alpha")
    y, x = np.indices(alpha.shape)
    return float((x * alpha).sum() / total / image.width), float((y * alpha).sum() / total / image.height)


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
    centers = []
    for asset_id in IDS:
        image = Image.open(OUT / f"{asset_id}.png")
        check(f"{asset_id}.dimensions", image.size == (256, 256), str(image.size))
        check(f"{asset_id}.rgba", image.mode == "RGBA", image.mode)
        alpha = image.getchannel("A")
        low, high = alpha.getextrema()
        check(f"{asset_id}.true_alpha", low == 0 and high > 0, f"alpha extrema={low},{high}")
        check(
            f"{asset_id}.transparent_corners",
            all(alpha.getpixel(point) == 0 for point in ((0, 0), (255, 0), (0, 255), (255, 255))),
            "all four corners must remain transparent",
        )
        centers.append(alpha_center(image))

    spread_x = max(center[0] for center in centers) - min(center[0] for center in centers)
    spread_y = max(center[1] for center in centers) - min(center[1] for center in centers)
    check("animation_alignment", spread_x <= 0.02 and spread_y <= 0.02, f"center spread={spread_x:.4f},{spread_y:.4f}")

    manifest = json.loads((ROOT / "CANDIDATE_MANIFEST.json").read_text(encoding="utf-8"))
    check("manifest_count", manifest["canonicalCount"] == len(IDS), str(manifest["canonicalCount"]))
    animation = manifest["animation"]
    check("frame_order", animation["frameIds"] == IDS, str(animation["frameIds"]))
    check("animation_contract", all(animation[key] == expected for key, expected in {
        "atlas": "effects",
        "directions": ["NONE"],
        "defaultDirection": "NONE",
        "sourceScale": 2,
        "anchor": {"x": 0.5, "y": 0.86},
        "pivot": {"x": 0.5, "y": 0.86},
        "mirrorAllowed": False,
        "canvasSizes": ["256x256"],
        "frameAnchors": ["0.5,0.5"],
        "frameCount": 4,
        "fps": 8,
        "loop": False,
        "holdLast": False,
        "events": [],
    }.items()), "canonical crop_ready_glow contract preserved")
    check("source_evidence", (ROOT / "source" / "crop-ready-glow-sheet.png").exists(), "imagegen source sheet present")

    result = {
        "taskId": "ART-13",
        "status": "PASS",
        "scope": IDS,
        "checks": checks,
        "alignment": {"centers": centers, "spreadX": spread_x, "spreadY": spread_y},
        "technicalReview": "PASS (task-local QA)",
        "styleReview": "PENDING_OWNER_REVIEW",
        "approvalRef": None,
        "releaseFlags": {"placeholder": False, "production_ready": False, "approved": False},
        "separationInvariant": "Glow remains an overlay and is not baked into crop artwork.",
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
        "# ART-13 local review\n\n"
        "Technical candidate QA: **PASS** (4/4 exact IDs, 256x256 RGBA PNG, true "
        "alpha, transparent corners, canonical DEFAULT/NONE 4-frame order at 8 FPS, "
        "and stable alpha centroids).\n\n"
        "The glow was generated with built-in `image_gen` as a transparent 2x2 sheet "
        "and cropped into canonical frames. It remains a separate overlay; no crop "
        "artwork was changed. Style/owner/release review remains pending; "
        "`production_ready` and `approved` remain false.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
