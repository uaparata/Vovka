"""Remove near-white pixels from bottom of pokemon sprite sheets.

WARNING: do not run on production sheets without backup — can eat into Funko
bases and shrink characters. Prefer re-running process-*-sprites.py from raw.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "pokemon"
THRESHOLD = 235
BOTTOM_START = 0.86


def strip_frame(frame: Image.Image) -> Image.Image:
    out = frame.copy()
    arr = out.load()
    w, h = out.size
    y0 = int(h * BOTTOM_START)
    for y in range(y0, h):
        for x in range(w):
            r, g, b, a = arr[x, y]
            if a < 12:
                continue
            if r >= THRESHOLD and g >= THRESHOLD and b >= THRESHOLD:
                arr[x, y] = (0, 0, 0, 0)
                continue
            if abs(r - g) < 15 and abs(g - b) < 15 and max(r, g, b) > 200 and y > h * 0.9:
                arr[x, y] = (0, 0, 0, 0)
    return out


def process_sheet(path: Path, frame_w: int = 320) -> None:
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    frames = w // frame_w
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for i in range(frames):
        frame = img.crop((i * frame_w, 0, (i + 1) * frame_w, h))
        out.paste(strip_frame(frame), (i * frame_w, 0), strip_frame(frame))
    out.save(path, optimize=True)
    print(f"Stripped {path.name} ({frames} frames)")


def main():
    for name in ("kirill-sheet.png", "kirill-idle.png", "bitcoin-sheet.png", "bitcoin-idle.png"):
        p = ASSETS / name
        if p.exists():
            if "sheet" in name:
                process_sheet(p)
            else:
                strip_frame(Image.open(p).convert("RGBA")).save(p, optimize=True)
                print(f"Stripped {name}")


if __name__ == "__main__":
    main()
