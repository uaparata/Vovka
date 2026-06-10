"""Rebuild Mullin from clean Funko preview (raw sheet has AI center seam)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from pokemon_sprite_common import (
    bbox,
    build_sheet,
    place_on_canvas,
    strip_bg,
    strip_stand_rod,
)

ROOT = Path(__file__).resolve().parents[1]
PREVIEW_PATH = ROOT / "Pokemons" / "kirill-mulin-funko" / "kirill-mulin-funko-preview.png"
SHEET_PATH = ROOT / "assets" / "pokemon" / "kirill-sheet.png"
IDLE_PATH = ROOT / "assets" / "pokemon" / "kirill-idle.png"
FRAMES = 6
JUMP_LIFT = {1: -16, 2: -80, 3: -20, 4: -104, 5: -16}


def load_clean_source() -> Image.Image:
    img = Image.open(PREVIEW_PATH).convert("RGBA")
    img = strip_bg(img)
    return strip_stand_rod(img)


def main():
    if not PREVIEW_PATH.exists():
        raise SystemExit(f"Missing preview: {PREVIEW_PATH}")

    source = load_clean_source()
    x0, y0, x1, y1 = bbox(source)
    cropped = source.crop((x0, y0, x1 + 1, y1 + 1))
    frames = [place_on_canvas(cropped, lift_px=JUMP_LIFT.get(i, 0)) for i in range(FRAMES)]

    out = build_sheet(frames)
    out.save(SHEET_PATH, optimize=True)
    frames[0].save(IDLE_PATH, optimize=True)
    print(f"Wrote {SHEET_PATH} ({out.size}) and {IDLE_PATH}")


if __name__ == "__main__":
    main()
