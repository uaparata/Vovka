"""Rebuild BITCOIN from clean Funko idle (pose sheet crops clip the head)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from pokemon_sprite_common import (
    bbox,
    build_sheet,
    crop_pose_row,
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


def load_idle_crop() -> Image.Image:
    img = strip_bg(Image.open(IDLE_RAW).convert("RGBA"))
    x0, y0, x1, y1 = bbox(img)
    return img.crop((x0, y0, x1 + 1, y1 + 1))


def load_pose_crop(index: int) -> Image.Image | None:
    if not POSE_RAW.exists() or index == 0:
        return None
    frame = strip_bg(crop_pose_row(Image.open(POSE_RAW).convert("RGBA"), index, FRAMES, pad_ratio=0.18))
    x0, y0, x1, y1 = bbox(frame)
    if x1 <= x0 or y1 <= y0:
        return None
    return frame.crop((x0, y0, x1 + 1, y1 + 1))


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
