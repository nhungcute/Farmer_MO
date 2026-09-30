"""Create the REV-10 terrain footprint revision in the isolated work area.

The source was re-rendered by the internal image generator at an exact 2:1
aspect ratio.  We normalize that render to the locked 256x128 source contract,
then derive the four controlled colour variants without changing geometry or
alpha.  No production path is touched by this script.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source" / "terrain-master-revision2.png"
CANDIDATE_DIR = ROOT / "candidate" / "assets-src-compatible"
GENERATED_RENDER = Path(
    r"C:\Users\Administrator\.codex\generated_images\01a0f2f0-5797-7ae1-8cba-4aff3a987dd5\exec-cb2042bc-1ae4-4042-8f79-8367e1e3c1ad.png"
)

IDS = [
    "terrain_grass_tile",
    "terrain_grass_variant_01",
    "terrain_grass_variant_02",
    "terrain_grass_variant_03",
    "terrain_grass_variant_04",
]
BRIGHTNESS = [0.96, 1.0, 1.04, 0.99, 1.02]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    if not GENERATED_RENDER.exists():
        raise FileNotFoundError(GENERATED_RENDER)

    render = Image.open(GENERATED_RENDER).convert("RGBA")
    if render.width / render.height != 2:
        raise ValueError(f"re-rendered source must be 2:1, got {render.size}")

    # The image generator returned a high-resolution 2:1 transparent render.
    # Reframe to its opaque terrain footprint first (the alpha bbox is exactly
    # 2:1), then downsample proportionally.  This removes generator padding
    # without stretching one axis or changing the terrain geometry.
    alpha = np.asarray(render.getchannel("A"))
    ys, xs = np.where(alpha >= 64)
    if len(xs) == 0:
        raise ValueError("re-rendered source has no visible alpha")
    bbox = (int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1))
    cropped = render.crop(bbox)
    if abs(cropped.width / cropped.height - 2.0) > 0.01:
        raise ValueError(f"alpha footprint must be approximately 2:1, got {cropped.size}")
    master = cropped.resize((256, 128), Image.Resampling.LANCZOS)
    SOURCE.parent.mkdir(parents=True, exist_ok=True)
    master.save(SOURCE, "PNG", optimize=True)

    CANDIDATE_DIR.mkdir(parents=True, exist_ok=True)
    records: dict[str, dict[str, object]] = {}
    for asset_id, brightness in zip(IDS, BRIGHTNESS):
        image = ImageEnhance.Brightness(master).enhance(brightness)
        # Brightness preserves the alpha channel and exact 256x128 geometry.
        output = CANDIDATE_DIR / f"{asset_id}.png"
        image.save(output, "PNG", optimize=True)
        records[asset_id] = {
            "sourceFile": f"work/art-generation/terrain/candidate/assets-src-compatible/{output.name}",
            "sourceGroup": "source/terrain-master-revision2.png",
            "sha256": sha256(output),
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
        }

    (ROOT / "revision-source-record.json").write_text(
        json.dumps(
            {
                "renderSource": str(GENERATED_RENDER),
                "source": "internal-generated",
                "tool": "built-in image_gen",
                "toolVersion": "not exposed by runtime",
                "target": [256, 128],
                "proportionalNormalization": True,
                "alphaReframeThreshold": 64,
                "assets": records,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
