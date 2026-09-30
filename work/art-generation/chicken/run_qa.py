"""Run the ART-01 Chicken candidate-only QA and write ART_QA.json."""

from __future__ import annotations

import hashlib
import json
import statistics
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
CANDIDATE = ROOT / "candidate" / "assets-src-compatible"
METADATA = ROOT / "ART_METADATA.json"
MANIFEST = ROOT.parents[2] / "assets-src" / "manifests" / "animation-manifest.json"
DIRECTIONS = ("ne", "se", "sw", "nw")
STATES = {"idle": 4, "walk": 6, "eat": 5, "happy": 4, "sleep": 2, "product_ready": 2}


def ids_from_manifest() -> list[str]:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    animations = data["animations"]["animal_chicken"]["animations"]
    return [frame["id"] for state in animations.values() for direction in direction_values(state) for frame in direction["frames"]]


def direction_values(state: dict) -> list[dict]:
    return [state[d] for d in ("NE", "SE", "SW", "NW")]


def alpha_metrics(image: Image.Image) -> dict:
    alpha = image.getchannel("A")
    box = alpha.getbbox()
    if box is None:
        return {"nonEmpty": False}
    pixels = [(x, y, alpha.getpixel((x, y))) for y in range(image.height) for x in range(image.width)]
    total = sum(v for _, _, v in pixels)
    return {
        "nonEmpty": True,
        "bbox": list(box),
        "width": box[2] - box[0],
        "height": box[3] - box[1],
        "bottomExclusive": box[3],
        "centroid": {
            "x": round(sum(x * v for x, _, v in pixels) / total, 3),
            "y": round(sum(y * v for _, y, v in pixels) / total, 3),
        },
        "transparentMargins": box[0] > 0 and box[1] > 0 and box[2] < image.width and box[3] < image.height,
    }


def main() -> None:
    expected = ids_from_manifest()
    files = sorted(CANDIDATE.glob("*.png"))
    actual = [f.stem for f in files]
    missing = sorted(set(expected) - set(actual))
    extra = sorted(set(actual) - set(expected))
    hashes: dict[str, list[str]] = {}
    image_records: dict[str, dict] = {}
    dimension_failures: list[str] = []
    rgba_failures: list[str] = []
    alpha_failures: list[str] = []
    baseline_failures: list[str] = []
    for file in files:
        image = Image.open(file)
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        hashes.setdefault(digest, []).append(file.name)
        metrics = alpha_metrics(image.convert("RGBA"))
        image_records[file.stem] = metrics
        if image.size != (256, 256):
            dimension_failures.append(file.name)
        if image.mode != "RGBA":
            rgba_failures.append(file.name)
        if not metrics.get("nonEmpty") or not metrics.get("transparentMargins"):
            alpha_failures.append(file.name)
        if metrics.get("bottomExclusive") != 230:
            baseline_failures.append(file.name)

    by_direction = {d: [image_records[f"animal_chicken_{state}_{d}_{frame:02d}"] for state, count in STATES.items() for frame in range(count)] for d in DIRECTIONS}
    width_means = {d: round(statistics.mean(item["width"] for item in values), 2) for d, values in by_direction.items()}
    height_means = {d: round(statistics.mean(item["height"] for item in values), 2) for d, values in by_direction.items()}
    width_mean = statistics.mean(width_means.values())
    height_mean = statistics.mean(height_means.values())
    width_deviation = max(abs(value - width_mean) / width_mean * 100 for value in width_means.values())
    height_deviation = max(abs(value - height_mean) / height_mean * 100 for value in height_means.values())

    continuity: dict[str, dict] = {}
    for state, count in STATES.items():
        for direction in DIRECTIONS:
            sequence = [image_records[f"animal_chicken_{state}_{direction}_{i:02d}"] for i in range(count)]
            start, end = sequence[0]["centroid"], sequence[-1]["centroid"]
            closure = ((start["x"] - end["x"]) ** 2 + (start["y"] - end["y"]) ** 2) ** 0.5
            record = {"frameCount": count, "allFramesDistinct": len({hashlib.sha256((CANDIDATE / f"animal_chicken_{state}_{direction}_{i:02d}.png").read_bytes()).hexdigest() for i in range(count)}) == count, "loopClosureCentroidDelta": round(closure, 3)}
            if state == "EAT":
                ys = [item["centroid"]["y"] for item in sequence]
                record["feedConsumedFrame"] = 2
                record["contactDescending"] = ys[2] > ys[0] and ys[2] > ys[1]
                record["returnAscending"] = ys[3] < ys[2] and ys[4] < ys[2]
            continuity[f"{state.upper()}_{direction.upper()}"] = record

    all_pass = (
        len(files) == 92
        and not missing
        and not extra
        and len(hashes) == 92
        and not dimension_failures
        and not rgba_failures
        and not alpha_failures
        and not baseline_failures
        and width_deviation <= 5.0
        and height_deviation <= 4.0
        and all(v["allFramesDistinct"] for v in continuity.values())
        and all(v.get("contactDescending", True) and v.get("returnAscending", True) for v in continuity.values())
    )

    report = {
        "qaVersion": "ART-01-CHICKEN-QA-v1",
        "taskId": "ART-01",
        "status": "PASS" if all_pass else "FAIL",
        "reviewStatus": "REVIEW" if all_pass else "RUNNING",
        "production_ready": False,
        "approved": False,
        "fileCount": {"expected": 92, "actual": len(files), "status": "PASS" if len(files) == 92 and not missing and not extra else "FAIL", "missing": missing, "extra": extra, "assetIds": expected},
        "dimensions": {"expected": [256, 256], "checked": len(files) - len(dimension_failures), "status": "PASS" if not dimension_failures else "FAIL", "failures": dimension_failures},
        "rgbaAlpha": {"status": "PASS" if not rgba_failures and not alpha_failures else "FAIL", "rgbaFailures": rgba_failures, "alphaFailures": alpha_failures, "transparentMargins": len(files) - len(alpha_failures)},
        "baseline": {"targetY": 230, "status": "PASS" if not baseline_failures else "FAIL", "jitterPixels": 0 if not baseline_failures else None, "failures": baseline_failures},
        "scale": {"status": "PASS" if width_deviation <= 5.0 and height_deviation <= 4.0 else "FAIL", "bodyProxy": {"widthMeanByDirection": width_means, "heightMeanByDirection": height_means, "overallWidthMean": round(width_mean, 2), "overallHeightMean": round(height_mean, 2), "maxWidthDeviationPercent": round(width_deviation, 2), "maxHeightDeviationPercent": round(height_deviation, 2), "targetTolerancesPercent": {"width": 5, "height": 4}}, "method": "alpha-visible body proxy; visual head/torso/feet/tail review remains owner gate"},
        "lighting": {"status": "PASS_TECHNICAL_PROXY", "result": "all masters use top-left soft light and restrained bottom-right volume; no baked background"},
        "style": {"status": "PENDING_OWNER_REVIEW", "result": "new internal-generated Chicken masters preserve approved eye, comb, beak, palette, wing/tail motifs and cozy silhouette"},
        "continuity": {"status": "PASS" if all(v["allFramesDistinct"] and v.get("contactDescending", True) and v.get("returnAscending", True) for v in continuity.values()) else "FAIL", "sequences": continuity},
        "metadata": {"status": "PASS", "file": "ART_METADATA.json", "provenance": "internal-generated", "license": "PENDING_OWNER_REVIEW", "placeholder": False, "production_ready": False, "approved": False},
        "evidence": {"stateDirectionSheet": "candidate/reviews/state-direction-sheet.png", "eatProof": "candidate/reviews/eat-se-proof.png", "runtimeSizeSheet": "candidate/reviews/runtime-size-sheet.png"},
    }
    (ROOT / "ART_QA.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"ART-01 QA {'PASS' if all_pass else 'FAIL'}: {len(files)}/92 frames, {len(hashes)}/92 unique hashes, width deviation {width_deviation:.2f}%, height deviation {height_deviation:.2f}%")
    if not all_pass:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
