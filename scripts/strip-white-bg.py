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


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit("usage: strip-white-bg.py <src> <dest>")
    strip_white(Path(sys.argv[1]), Path(sys.argv[2]))
