"""Process Renato Funko pose sheet (7 frames)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from pokemon_sprite_common import bbox, build_sheet, crop_pose_row, place_on_canvas, strip_bg

ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "Pokemons" / "renato-funko" / "renato-poses-raw.png"
SHEET_PATH = ROOT / "assets" / "pokemon" / "renato-sheet.png"
IDLE_PATH = ROOT / "assets" / "pokemon" / "renato-idle.png"
FRAMES = 7
RISE_LIFT = {1: -16, 2: -8, 3: -12, 4: -20, 5: -28}


def process_frame(frame: Image.Image, index: int) -> Image.Image:
    frame = strip_bg(frame)
    x0, y0, x1, y1 = bbox(frame)
    cropped = frame.crop((x0, y0, x1 + 1, y1 + 1))
    return place_on_canvas(cropped, lift_px=RISE_LIFT.get(index, 0))


def main():
    if not RAW_PATH.exists():
        raise SystemExit(f"Missing pose sheet: {RAW_PATH}")

    sheet = Image.open(RAW_PATH).convert("RGBA")
    frames = [process_frame(crop_pose_row(sheet, i, FRAMES), i) for i in range(FRAMES)]
    out = build_sheet(frames)
    out.save(SHEET_PATH, optimize=True)
    frames[0].save(IDLE_PATH, optimize=True)
    print(f"Wrote {SHEET_PATH} ({out.size}) and {IDLE_PATH}")


if __name__ == "__main__":
    main()
