"""Recolor Sasha pose sheet hair to strawberry blonde (Renato reference photo)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "Pokemons" / "sasha-funko" / "sasha-poses-raw.png"
BACKUP_PATH = ROOT / "Pokemons" / "sasha-funko" / "sasha-poses-raw.auburn.bak.png"

# Warm strawberry blonde palette from reference photo
HIGHLIGHT = (218, 182, 128)
MID = (196, 140, 92)
SHADOW = (168, 108, 68)


def is_hair_pixel(r: int, g: int, b: int, a: int) -> bool:
    if a < 40:
        return False
    if max(r, g, b) < 45:
        return False
    # Auburn / brown hair on Funko sheet (not dress, not skin)
    if r > 55 and g > 25 and b > 15 and r > g and g > b * 0.65:
        if r - b > 25 and g < r * 0.85:
            return True
    return False


def blend_toward(r, g, b, target, t):
    return tuple(int(c * (1 - t) + target[i] * t) for i, c in enumerate((r, g, b)))


def recolor(img: Image.Image) -> Image.Image:
    out = img.copy()
    arr = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = arr[x, y]
            if not is_hair_pixel(r, g, b, a):
                continue
            lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255
            if lum > 0.62:
                target = HIGHLIGHT
                t = 0.82
            elif lum > 0.42:
                target = MID
                t = 0.78
            else:
                target = SHADOW
                t = 0.75
            nr, ng, nb = blend_toward(r, g, b, target, t)
            arr[x, y] = (nr, ng, nb, a)
    return out


def main():
    if not RAW_PATH.exists():
        raise SystemExit(f"Missing {RAW_PATH}")
    img = Image.open(RAW_PATH).convert("RGBA")
    if not BACKUP_PATH.exists():
        img.save(BACKUP_PATH)
    recolor(img).save(RAW_PATH, optimize=True)
    print(f"Recolored hair in {RAW_PATH} (backup: {BACKUP_PATH})")


if __name__ == "__main__":
    main()
