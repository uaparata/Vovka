"""Process Zhekon Funko pose sheet (7 frames) — uppercut + thumbs up."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from pokemon_sprite_common import bbox, build_sheet, crop_pose_row, place_on_canvas, strip_bg

ROOT = Path(__file__).resolve().parents[1]
IDLE_RAW = ROOT / "Pokemons" / "zhekon-funko" / "zhekon-funko-idle-raw.png"
RAW_PATH = ROOT / "Pokemons" / "zhekon-funko" / "zhekon-poses-raw.png"
SHEET_PATH = ROOT / "assets" / "pokemon" / "zhekon-sheet.png"
IDLE_PATH = ROOT / "assets" / "pokemon" / "zhekon-idle.png"
FRAMES = 7
PUNCH_LIFT = {1: -10, 2: -28, 3: -52, 4: -68, 5: -44, 6: -16}


def process_frame(frame: Image.Image, index: int) -> Image.Image:
    frame = strip_bg(frame)
    x0, y0, x1, y1 = bbox(frame)
    cropped = frame.crop((x0, y0, x1 + 1, y1 + 1))
    return place_on_canvas(cropped, lift_px=PUNCH_LIFT.get(index, 0))


def load_idle_from_raw() -> Image.Image | None:
    if not IDLE_RAW.exists():
        return None
    img = strip_bg(Image.open(IDLE_RAW).convert("RGBA"))
    x0, y0, x1, y1 = bbox(img)
    return img.crop((x0, y0, x1 + 1, y1 + 1))


def main():
    if not RAW_PATH.exists():
        raise SystemExit(f"Missing pose sheet: {RAW_PATH}")

    sheet = Image.open(RAW_PATH).convert("RGBA")
    frames = [process_frame(crop_pose_row(sheet, i, FRAMES, pad_ratio=0.05), i) for i in range(FRAMES)]

    idle_crop = load_idle_from_raw()
    if idle_crop is not None:
        frames[0] = place_on_canvas(idle_crop, lift_px=0)

    out = build_sheet(frames)
    out.save(SHEET_PATH, optimize=True)
    frames[0].save(IDLE_PATH, optimize=True)
    print(f"Wrote {SHEET_PATH} ({out.size}) and {IDLE_PATH}")


if __name__ == "__main__":
    main()
