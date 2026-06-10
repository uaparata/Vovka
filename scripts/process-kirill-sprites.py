"""Crop, scale, and clean Mullin pokemon sprite sheet."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHEET_PATH = ROOT / "assets" / "pokemon" / "kirill-sheet.png"
IDLE_PATH = ROOT / "assets" / "pokemon" / "kirill-idle.png"
FRAMES = 6
JUMP_FRAMES = {2, 4}
TARGET_FRAME_H = 900
TARGET_FRAME_W = 320


def frame_bounds(width: int, index: int):
    x0 = round(index * width / FRAMES)
    x1 = round((index + 1) * width / FRAMES)
    return x0, x1


def iter_opaque_pixels(frame: Image.Image):
    arr = frame.load()
    w, h = frame.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = arr[x, y]
            if a > 20 and (r + g + b) > 40:
                yield x, y


def bbox(frame: Image.Image):
    xs, ys = zip(*iter_opaque_pixels(frame))
    return min(xs), min(ys), max(xs), max(ys)


def remove_jump_base(frame: Image.Image) -> Image.Image:
    """Remove only the display stand + support rod from jump frames."""
    out = frame.copy()
    w, h = out.size
    arr = out.load()
    cx = w * 0.5
    base_y = h * 0.84
    rx = w * 0.3
    ry = h * 0.1

    for y in range(h):
        for x in range(w):
            r, g, b, a = arr[x, y]
            if a < 10:
                continue

            # silver support rod near center
            if abs(x - cx) < 6 and y > h * 0.38:
                if r > 130 and g > 130 and b > 130:
                    arr[x, y] = (0, 0, 0, 0)
                    continue

            # black circular base at bottom
            nx = (x - cx) / rx
            ny = (y - base_y) / ry
            if nx * nx + ny * ny <= 1.0 and r < 35 and g < 35 and b < 40:
                arr[x, y] = (0, 0, 0, 0)

    return out


def process_frame(frame: Image.Image, index: int) -> Image.Image:
    if index in JUMP_FRAMES:
        frame = remove_jump_base(frame)

    x0, y0, x1, y1 = bbox(frame)
    cropped = frame.crop((x0, y0, x1 + 1, y1 + 1))

    canvas = Image.new("RGBA", (TARGET_FRAME_W, TARGET_FRAME_H), (0, 0, 0, 0))
    scale = min(
        (TARGET_FRAME_W * 0.96) / cropped.width,
        (TARGET_FRAME_H * 0.94) / cropped.height,
    )
    nw = max(1, int(cropped.width * scale))
    nh = max(1, int(cropped.height * scale))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    x = (TARGET_FRAME_W - nw) // 2
    if index in JUMP_FRAMES:
        y = max(8, int((TARGET_FRAME_H - nh) * 0.12))
    else:
        y = TARGET_FRAME_H - nh - 2

    canvas.paste(resized, (x, y), resized)
    return canvas


def main():
    sheet = Image.open(SHEET_PATH).convert("RGBA")
    w, h = sheet.size
    raw_frames = [sheet.crop((frame_bounds(w, i)[0], 0, frame_bounds(w, i)[1], h)) for i in range(FRAMES)]
    frames = [process_frame(f, i) for i, f in enumerate(raw_frames)]

    out_w = TARGET_FRAME_W * FRAMES
    out = Image.new("RGBA", (out_w, TARGET_FRAME_H), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        out.paste(frame, (i * TARGET_FRAME_W, 0), frame)

    out.save(SHEET_PATH, optimize=True)
    frames[0].save(IDLE_PATH, optimize=True)
    print(f"Wrote {SHEET_PATH} ({out.size}) and {IDLE_PATH}")


if __name__ == "__main__":
    main()
