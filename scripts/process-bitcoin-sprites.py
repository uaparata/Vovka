"""Process BITCOIN Funko sprite sheet into game-ready frames."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from sprite_seam_fix import fix_center_seam

ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "assets" / "pokemon" / "bitcoin-sheet-raw.png"
SHEET_PATH = ROOT / "assets" / "pokemon" / "bitcoin-sheet.png"
IDLE_PATH = ROOT / "assets" / "pokemon" / "bitcoin-idle.png"
FRAMES = 6
JUMP_FRAMES = {2, 4}
TARGET_FRAME_H = 900
TARGET_FRAME_W = 320


def frame_bounds(width: int, index: int, count: int):
    step = width / count
    x0 = int(round(index * step))
    x1 = int(round((index + 1) * step))
    inset = max(2, int(step * 0.015))
    if index > 0:
        x0 += inset
    if index < count - 1:
        x1 -= inset
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
    pts = list(iter_opaque_pixels(frame))
    if not pts:
        return 0, 0, frame.width - 1, frame.height - 1
    xs, ys = zip(*pts)
    return min(xs), min(ys), max(xs), max(ys)


def strip_bg(frame: Image.Image) -> Image.Image:
    out = frame.copy()
    w, h = out.size
    arr = out.load()
    cx = w * 0.5
    base_y = h * 0.86
    rx = w * 0.32
    ry = h * 0.11

    for y in range(h):
        for x in range(w):
            r, g, b, a = arr[x, y]
            if a < 10:
                continue
            if abs(x - cx) < 7 and y > h * 0.34 and r > 120 and g > 120 and b > 120:
                arr[x, y] = (0, 0, 0, 0)
                continue
            nx = (x - cx) / rx
            ny = (y - base_y) / ry
            if nx * nx + ny * ny <= 1.0 and r < 45 and g < 45 and b < 50:
                arr[x, y] = (0, 0, 0, 0)
    return out


def process_frame(frame: Image.Image, index: int) -> Image.Image:
    frame = fix_center_seam(frame)
    frame = strip_bg(frame)
    x0, y0, x1, y1 = bbox(frame)
    cropped = frame.crop((x0, y0, x1 + 1, y1 + 1))

    canvas = Image.new("RGBA", (TARGET_FRAME_W, TARGET_FRAME_H), (0, 0, 0, 0))
    scale = min(
        (TARGET_FRAME_W * 0.98) / cropped.width,
        (TARGET_FRAME_H * 0.96) / cropped.height,
    )
    nw = max(1, int(cropped.width * scale))
    nh = max(1, int(cropped.height * scale))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    x = (TARGET_FRAME_W - nw) // 2
    if index in JUMP_FRAMES:
        y = max(0, int((TARGET_FRAME_H - nh) * 0.03))
    else:
        y = TARGET_FRAME_H - nh - 2

    canvas.paste(resized, (x, y), resized)
    return canvas


def main():
    src_path = RAW_PATH if RAW_PATH.exists() else SHEET_PATH
    sheet = Image.open(src_path).convert("RGBA")
    w, h = sheet.size
    raw_frames = [
        sheet.crop((frame_bounds(w, i, FRAMES)[0], 0, frame_bounds(w, i, FRAMES)[1], h))
        for i in range(FRAMES)
    ]
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
