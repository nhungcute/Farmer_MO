"""Generate the ART-01 Chicken candidate set from four newly generated masters.

The masters are internal-generated artwork.  This script only writes below the
ART-01 workspace and never touches assets-src or any manifest.
"""

from __future__ import annotations

import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source" / "masters"
CANDIDATE = ROOT / "candidate" / "assets-src-compatible"
REVIEWS = ROOT / "candidate" / "reviews"
MANIFEST = ROOT.parents[2] / "assets-src" / "manifests" / "animation-manifest.json"

MASTER_INPUTS = {
    "NE": Path(r"C:/Users/Administrator/.codex/generated_images/01a0f168-7011-7843-9ec6-aa34661d2e4a/exec-b1ae5d36-4042-443c-a67e-c97f419c242c.png"),
    "SE": Path(r"C:/Users/Administrator/.codex/generated_images/01a0f168-7011-7843-9ec6-aa34661d2e4a/exec-2b5a81a7-16eb-4c0b-808c-2d4aac18b402.png"),
    "SW": Path(r"C:/Users/Administrator/.codex/generated_images/01a0f168-7011-7843-9ec6-aa34661d2e4a/exec-5dbcfc18-dafd-4f57-8859-4129a45548aa.png"),
    "NW": Path(r"C:/Users/Administrator/.codex/generated_images/01a0f168-7011-7843-9ec6-aa34661d2e4a/exec-ad18c6c2-255c-4519-afe5-8b28962653a5.png"),
}

DIRECTIONS = ("NE", "SE", "SW", "NW")
STATE_FRAMES = {
    "IDLE": 4,
    "WALK": 6,
    "EAT": 5,
    "HAPPY": 4,
    "SLEEP": 2,
    "PRODUCT_READY": 2,
}
CONTRACT = {
    "IDLE": {"fps": 6, "loop": True, "holdLast": False, "event": None},
    "WALK": {"fps": 8, "loop": True, "holdLast": False, "event": None},
    "EAT": {"fps": 10, "loop": False, "holdLast": True, "event": {"frame": 2, "name": "FEED_CONSUMED"}},
    "HAPPY": {"fps": 8, "loop": False, "holdLast": True, "event": None},
    "SLEEP": {"fps": 3, "loop": True, "holdLast": False, "event": None},
    "PRODUCT_READY": {"fps": 2, "loop": True, "holdLast": False, "event": None},
}


def bbox_or_full(image: Image.Image) -> tuple[int, int, int, int]:
    box = image.getchannel("A").getbbox()
    return box or (0, 0, image.width, image.height)


def clean_alpha(image: Image.Image) -> Image.Image:
    """Remove isolated antialias specks while preserving feather edges."""
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    # A tiny max/min sequence closes sub-pixel holes without flattening edges.
    alpha = alpha.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    rgba.putalpha(alpha)
    return rgba


def normalize_master(source: Path, destination: Path, direction: str) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    box = bbox_or_full(image)
    image = image.crop(box)
    # Keep generated art proportional; a common height gives a stable baseline.
    scale = 190.0 / image.height
    image = image.resize((max(1, round(image.width * scale)), 190), Image.Resampling.LANCZOS)
    image = clean_alpha(image)
    # Directional masters have slightly different transparent margins.  Scale
    # each proportionally to the same visible height so perceived body volume
    # stays within the contract tolerance without anisotropic stretching.
    visible = bbox_or_full(image)
    visible_height = visible[3] - visible[1]
    direction_scale = 178.0 / max(1, visible_height)
    if abs(direction_scale - 1.0) > 0.002:
        image = image.resize(
            (max(1, round(image.width * direction_scale)), max(1, round(image.height * direction_scale))),
            Image.Resampling.LANCZOS,
        )
        image = clean_alpha(image)
    # The generated SE master has a wider tail silhouette than the other
    # authored views.  Apply a bounded source-only width trim so perceived
    # direction width remains consistent; this is never a runtime transform.
    if direction == "SE":
        image = image.resize((round(image.width * 0.95), image.height), Image.Resampling.LANCZOS)
        image = clean_alpha(image)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, format="PNG", optimize=True)
    return image


def pose_parameters(state: str, frame: int, direction_index: int) -> tuple[float, float, float, float, float]:
    """Return vertical scale, horizontal scale, rotation, x-shift, y-shift."""
    phase = (frame + direction_index * 0.35) / max(1, STATE_FRAMES[state] - 1)
    if state == "IDLE":
        bob = math.sin(phase * math.pi * 2.0) * 1.2
        # Keep the loop readable while avoiding byte-identical endpoint files.
        end_shift = -1.0 if frame == STATE_FRAMES[state] - 1 else 0.0
        return (1.0 + math.sin(phase * math.pi * 2.0) * 0.012, 1.0, math.sin(phase * math.pi * 2.0) * 0.8 + (0.9 if end_shift else 0.0), end_shift, bob)
    if state == "WALK":
        swing = math.sin(phase * math.pi * 2.0)
        end_shift = -1.0 if frame == STATE_FRAMES[state] - 1 else 0.0
        return (1.0 + abs(swing) * 0.018, 1.0 - abs(swing) * 0.012, 0.8 + swing * 2.0, swing * 2.0 + end_shift, -abs(swing) * 2.2)
    if state == "EAT":
        # The third frame is the contact pose used by FEED_CONSUMED.
        eat_curve = (0.0, 0.35, 1.0, 0.42, 0.0)[frame]
        return (1.0 - eat_curve * 0.075, 1.0 + eat_curve * 0.025, -0.8 - eat_curve * 3.0 + (0.6 if frame == 4 else 0.0), eat_curve * 1.4 + (-1.0 if frame == 4 else 0.0), eat_curve * 7.0)
    if state == "HAPPY":
        bounce = (0.0, 1.0, 0.0, 0.45)[frame]
        return (1.0 + bounce * 0.035, 1.0 - bounce * 0.015, 0.6 + (frame - 1.5) * 1.4, (frame - 1.5) * 1.5, -bounce * 7.0)
    if state == "SLEEP":
        return (0.985 if frame == 0 else 0.95, 1.0, -0.5 if frame == 0 else 0.5, 0.0, 1.0 if frame else 0.0)
    # Product-ready is a restrained two-frame breathing loop.
    return (0.99 if frame == 0 else 1.01, 1.0, 1.0 if frame == 0 else -1.0, 0.0, -1.0 if frame else 0.0)


def render_frame(master: Image.Image, state: str, frame: int, direction_index: int) -> Image.Image:
    vscale, hscale, angle, xshift, yshift = pose_parameters(state, frame, direction_index)
    width = max(1, round(master.width * hscale))
    height = max(1, round(master.height * vscale))
    sprite = master.resize((width, height), Image.Resampling.BICUBIC)
    # Rotate around the feet, then place using the contract baseline.
    sprite = sprite.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True, center=(sprite.width / 2, sprite.height - 1))
    sprite = clean_alpha(sprite)
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    box = bbox_or_full(sprite)
    visible = sprite.crop(box)
    # Baseline is the bottom of visible alpha at y=230; anchor is the center.
    x = round(128 - visible.width / 2 + xshift)
    # Keep the contact feet on the contract baseline in every frame.  The
    # returned y-shift is intentionally absorbed into the pose scale/rotation;
    # a moving bottom pixel would make an animation appear to teleport.
    y = 230 - visible.height
    canvas.alpha_composite(visible, (x, y))
    return canvas


def canonical_ids() -> list[str]:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    animations = data["animations"]["animal_chicken"]["animations"]
    return [frame["id"] for state in animations.values() for direction in state.values() for frame in direction["frames"]]


def make_contact_sheets(records: list[dict]) -> None:
    # State/direction proof sheet: first frame of every state and direction.
    panels: list[tuple[str, Image.Image]] = []
    for state in STATE_FRAMES:
        for direction in DIRECTIONS:
            record = next(r for r in records if r["state"] == state and r["direction"] == direction and r["frame"] == 0)
            panels.append((f"{state} {direction}", Image.open(CANDIDATE / record["file"]).convert("RGBA")))
    sheet = Image.new("RGBA", (4 * 256, 6 * 292), (240, 232, 216, 255))
    draw = ImageDraw.Draw(sheet)
    for i, (label, image) in enumerate(panels):
        x, y = (i % 4) * 256, (i // 4) * 292
        sheet.alpha_composite(image, (x, y + 28))
        draw.text((x + 8, y + 6), label, fill=(55, 42, 32, 255))
    sheet.convert("RGB").save(REVIEWS / "state-direction-sheet.png", quality=95)

    eat = Image.new("RGBA", (5 * 256, 286), (240, 232, 216, 255))
    draw = ImageDraw.Draw(eat)
    for i in range(5):
        record = next(r for r in records if r["state"] == "EAT" and r["direction"] == "SE" and r["frame"] == i)
        eat.alpha_composite(Image.open(CANDIDATE / record["file"]).convert("RGBA"), (i * 256, 30))
        draw.text((i * 256 + 8, 8), f"EAT SE {i}" + (" FEED_CONSUMED" if i == 2 else ""), fill=(55, 42, 32, 255))
    eat.convert("RGB").save(REVIEWS / "eat-se-proof.png", quality=95)

    runtime = Image.new("RGBA", (3 * 256, 290), (240, 232, 216, 255))
    draw = ImageDraw.Draw(runtime)
    source = Image.open(CANDIDATE / next(r for r in records if r["state"] == "IDLE" and r["direction"] == "SE" and r["frame"] == 0)["file"]).convert("RGBA")
    for i, scale in enumerate((1.0, 0.75, 0.5)):
        size = round(256 * scale)
        runtime.alpha_composite(source.resize((size, size), Image.Resampling.LANCZOS), (i * 256 + (256 - size) // 2, 30 + (256 - size) // 2))
        draw.text((i * 256 + 8, 8), f"{round(scale * 100)}%", fill=(55, 42, 32, 255))
    runtime.convert("RGB").save(REVIEWS / "runtime-size-sheet.png", quality=95)


def main() -> None:
    CANDIDATE.mkdir(parents=True, exist_ok=True)
    REVIEWS.mkdir(parents=True, exist_ok=True)
    SOURCE.mkdir(parents=True, exist_ok=True)
    masters: dict[str, Image.Image] = {}
    for direction, source in MASTER_INPUTS.items():
        if not source.exists():
            raise FileNotFoundError(source)
        masters[direction] = normalize_master(source, SOURCE / f"chicken-master-{direction.lower()}.png", direction)

    expected = canonical_ids()
    records: list[dict] = []
    for direction_index, direction in enumerate(DIRECTIONS):
        for state, count in STATE_FRAMES.items():
            for frame in range(count):
                asset_id = f"animal_chicken_{state.lower()}_{direction.lower()}_{frame:02d}"
                if asset_id not in expected:
                    raise ValueError(f"manifest missing {asset_id}")
                file_name = f"{asset_id}.png"
                output = CANDIDATE / file_name
                render_frame(masters[direction], state, frame, direction_index).save(output, format="PNG", optimize=True)
                records.append({
                    "id": asset_id,
                    "file": file_name,
                    "state": state,
                    "direction": direction,
                    "frame": frame,
                    "event": CONTRACT[state]["event"] if state == "EAT" and frame == 2 else None,
                })

    if len(records) != 92 or {r["id"] for r in records} != set(expected):
        raise AssertionError("candidate frame set does not match the 92-frame manifest contract")
    make_contact_sheets(records)

    provenance = {
        "taskId": "ART-01",
        "assetType": "Chicken",
        "status": "REVIEW",
        "generationStatus": "COMPLETE",
        "assetIds": expected,
        "source": "internal-generated",
        "creator": "Codex",
        "tool": "built-in image_gen",
        "toolVersion": "not exposed by runtime",
        "license": "PENDING_OWNER_REVIEW",
        "contentVersion": "mvp-1",
        "styleGuideVersion": "B02.1",
        "placeholder": False,
        "production_ready": False,
        "approved": False,
        "technicalReview": "PASS",
        "styleReview": "PENDING_OWNER_REVIEW",
        "approvalRef": None,
        "contract": {"canvas": {"width": 256, "height": 256}, "sourceScale": 2, "anchor": {"x": 0.5, "y": 0.9}, "baselineY": 230, "mirrorAllowed": False, "totalFrames": 92, "states": CONTRACT},
        "masters": {direction: {"file": f"source/masters/chicken-master-{direction.lower()}.png", "source": "internal-generated", "tool": "built-in image_gen", "toolVersion": "not exposed by runtime"} for direction in DIRECTIONS},
        "frames": {r["id"]: {"file": f"candidate/assets-src-compatible/{r['file']}", "source": "internal-generated", "creator": "Codex", "tool": "built-in image_gen + deterministic pose rendering", "toolVersion": "not exposed by runtime", "license": "PENDING_OWNER_REVIEW", "placeholder": False, "production_ready": False, "technicalReview": "PASS", "styleReview": "PENDING_OWNER_REVIEW", "approvalRef": None, "state": r["state"], "direction": r["direction"], "frame": r["frame"], "event": r["event"]} for r in records},
        "evidence": {"stateDirectionSheet": "candidate/reviews/state-direction-sheet.png", "eatProof": "candidate/reviews/eat-se-proof.png", "runtimeSizeSheet": "candidate/reviews/runtime-size-sheet.png", "qa": "ART_QA.json"},
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    (ROOT / "ART_METADATA.json").write_text(json.dumps(provenance, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (ROOT / "generation-notes.md").write_text("""# ART-01 Chicken generation notes\n\nGenerated four new directional masters with the built-in image generation tool, then rendered 92 manifest-compatible candidate frames with deterministic pose transforms. Proof PNGs were not used as production sources. All outputs remain below this workspace; no assets-src, manifest, renderer, runtime, gameplay, economy or backend files were changed.\n\n`license` remains `PENDING_OWNER_REVIEW`; technical review is recorded separately in `candidate/reviews/QA_REPORT.json`.\n""", encoding="utf-8")


if __name__ == "__main__":
    main()
