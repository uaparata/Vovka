"""Process BITCOIN pdstyle pose sheet (POSE 1–4, 6, 7) into game-ready frames."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "Pokemons" / "bitcoin-bts-funko" / "bitcoin-poses-raw.png"
SHEET_PATH = ROOT / "assets" / "pokemon" / "bitcoin-sheet.png"
IDLE_PATH = ROOT / "assets" / "pokemon" / "bitcoin-idle.png"
FRAMES = 6
JUMP_FRAMES = {2, 3, 4}
TARGET_FRAME_H = 900
TARGET_FRAME_W = 320
TARGET_CHAR_H = 250


def frame_bounds(width: int, index: int, count: int = FRAMES):
    step = width / count
    x0 = int(round(index * step))
    x1 = int(round((index + 1) * step))
    inset = max(3, int(step * 0.04))
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
    corners = [arr[0, 0], arr[w - 1, 0], arr[0, h - 1], arr[w - 1, h - 1]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    cx = w * 0.5
    base_y = h * 0.88
    rx = w * 0.34
    ry = h * 0.12

    for y in range(h):
        for x in range(w):
            r, g, b, a = arr[x, y]
            if a < 10:
                continue
            if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) < 62 and y < h * 0.94:
                arr[x, y] = (0, 0, 0, 0)
                continue
            nx = (x - cx) / rx
            ny = (y - base_y) / ry
            if nx * nx + ny * ny <= 1.0 and r < 55 and g < 55 and b < 60:
                arr[x, y] = (0, 0, 0, 0)
                continue
            if y > h * 0.9 and abs(r - g) < 12 and abs(g - b) < 12 and max(r, g, b) < 210:
                arr[x, y] = (0, 0, 0, 0)
    return out


def process_frame(frame: Image.Image, index: int) -> Image.Image:
    frame = strip_bg(frame)
    x0, y0, x1, y1 = bbox(frame)
    cropped = frame.crop((x0, y0, x1 + 1, y1 + 1))

    canvas = Image.new("RGBA", (TARGET_FRAME_W, TARGET_FRAME_H), (0, 0, 0, 0))
    scale = min(
        (TARGET_FRAME_W * 1.04) / cropped.width,
        TARGET_CHAR_H / cropped.height,
    )
    nw = max(1, int(cropped.width * scale))
    nh = max(1, int(cropped.height * scale))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    x = (TARGET_FRAME_W - nw) // 2
    if index in JUMP_FRAMES:
        y = max(0, TARGET_FRAME_H - nh - 48)
    else:
        y = TARGET_FRAME_H - nh - 16

    canvas.paste(resized, (x, y), resized)
    return canvas


def main():
    if not RAW_PATH.exists():
        raise SystemExit(f"Missing pose sheet: {RAW_PATH}")

    sheet = Image.open(RAW_PATH).convert("RGBA")
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
