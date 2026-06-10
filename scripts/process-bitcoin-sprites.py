"""Rebuild BITCOIN — idle from dedicated raw; poses from manual bounds (not equal split)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from pokemon_sprite_common import (
    bbox,
    build_sheet,
    place_on_canvas,
    strip_bg,
)

ROOT = Path(__file__).resolve().parents[1]
IDLE_RAW = ROOT / "assets" / "pokemon" / "bitcoin-funko-idle-raw.png"
POSE_RAW = ROOT / "Pokemons" / "bitcoin-bts-funko" / "bitcoin-poses-raw.png"
SHEET_PATH = ROOT / "assets" / "pokemon" / "bitcoin-sheet.png"
IDLE_PATH = ROOT / "assets" / "pokemon" / "bitcoin-idle.png"
FRAMES = 6
JUMP_LIFT = {1: -12, 2: -56, 3: -64, 4: -48, 5: -12}

# Pose sheet is 1024×411 with 6 figures at irregular x — equal /6 split bleeds adjacent heads.
BITCOIN_POSE_BOUNDS = [
    (8, 168),
    (168, 338),
    (338, 508),
    (508, 678),
    (678, 848),
    (848, 1016),
]
# Per-pose (left_inset, right_inset) from raw sheet — trims neighbor head bleed.
BITCOIN_POSE_INSETS = [
    (12, 12),
    (30, 26),
    (26, 18),
    (18, 18),
    (30, 24),
    (24, 32),
]


def load_idle_crop() -> Image.Image:
    img = strip_bg(Image.open(IDLE_RAW).convert("RGBA"))
    x0, y0, x1, y1 = bbox(img)
    return img.crop((x0, y0, x1 + 1, y1 + 1))


def load_pose_crop(pose_index: int) -> Image.Image | None:
    """pose_index 1..5 maps to bounds[1]..bounds[5] (skip phone pose at bounds[0])."""
    if not POSE_RAW.exists() or pose_index <= 0 or pose_index >= len(BITCOIN_POSE_BOUNDS):
        return None
    x0, x1 = BITCOIN_POSE_BOUNDS[pose_index]
    left_inset, right_inset = BITCOIN_POSE_INSETS[pose_index]
    sheet = Image.open(POSE_RAW).convert("RGBA")
    crop_x0 = max(0, x0 + left_inset)
    crop_x1 = min(sheet.width, x1 - right_inset)
    frame = strip_bg(sheet.crop((crop_x0, 0, crop_x1, sheet.height)))
    x0b, y0, x1b, y1 = bbox(frame)
    if x1b <= x0b or y1 <= y0:
        return None
    return frame.crop((x0b, y0, x1b + 1, y1 + 1))


def process_frame(index: int, idle_crop: Image.Image) -> Image.Image:
    cropped = load_pose_crop(index) or idle_crop
    return place_on_canvas(cropped, lift_px=JUMP_LIFT.get(index, 0))


def main():
    if not IDLE_RAW.exists():
        raise SystemExit(f"Missing idle: {IDLE_RAW}")

    idle_crop = load_idle_crop()
    frames = [process_frame(i, idle_crop) for i in range(FRAMES)]
    out = build_sheet(frames)
    out.save(SHEET_PATH, optimize=True)
    frames[0].save(IDLE_PATH, optimize=True)
    print(f"Wrote {SHEET_PATH} ({out.size}) and {IDLE_PATH}")


if __name__ == "__main__":
    main()
