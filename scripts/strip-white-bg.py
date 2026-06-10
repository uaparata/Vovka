#!/usr/bin/env python3
"""Remove near-white pixels from PNG (alpha = 0)."""
import sys
from pathlib import Path

from PIL import Image


def strip_white(src: Path, dest: Path, threshold: int = 235) -> None:
    img = Image.open(src).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                pixels[x, y] = (r, g, b, 0)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG")


def crop_funko_base(src: Path, dest: Path | None = None, bottom_ratio: float = 0.14) -> None:
    """Trim black Funko stand / nameplate from the bottom."""
    out = dest or src
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    top = int(h * 0.02)
    bottom = int(h * (1 - bottom_ratio))
    left = int(w * 0.01)
    right = int(w * 0.99)
    cropped = img.crop((left, top, right, bottom))
    out.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(out, "PNG")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit("usage: strip-white-bg.py <src> <dest>")
    strip_white(Path(sys.argv[1]), Path(sys.argv[2]))
