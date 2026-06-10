"""Shared normalization for all Pokemon Funko sprite sheets."""
from __future__ import annotations

from PIL import Image

FRAME_W = 320
FRAME_H = 900
CHAR_HEIGHT = 300
FEET_PAD = 8
TOP_PAD = 14
MAX_WIDTH_RATIO = 0.96


def frame_bounds(width: int, index: int, count: int, inset_ratio: float = 0.0):
    step = width / count
    x0 = int(round(index * step))
    x1 = int(round((index + 1) * step))
    inset = max(2, int(step * inset_ratio))
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


def strip_white_bottom(frame: Image.Image, start_ratio: float = 0.72) -> Image.Image:
    """Remove near-white bottom band (UI stripe artifact in farm slots)."""
    out = frame.copy()
    arr = out.load()
    w, h = out.size
    y0 = int(h * start_ratio)
    for y in range(y0, h):
        for x in range(w):
            r, g, b, a = arr[x, y]
            if a < 12:
                continue
            if r >= 228 and g >= 228 and b >= 228:
                arr[x, y] = (0, 0, 0, 0)
                continue
            if abs(r - g) < 16 and abs(g - b) < 16 and max(r, g, b) > 195:
                arr[x, y] = (0, 0, 0, 0)
    return trim_bottom_white_rows(out)


def trim_bottom_white_rows(frame: Image.Image) -> Image.Image:
    """Drop trailing rows that are only white/transparent (thin stripe under base)."""
    arr = frame.load()
    w, h = frame.size
    last_solid = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = arr[x, y]
            if a < 25:
                continue
            if r >= 225 and g >= 225 and b >= 225:
                continue
            last_solid = y
    if last_solid <= 0 or last_solid >= h - 1:
        return frame
    trimmed = frame.crop((0, 0, w, last_solid + 1))
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    canvas.paste(trimmed, (0, h - trimmed.height))
    return canvas


def strip_stand_rod(frame: Image.Image) -> Image.Image:
    """Mullin-only: remove stand rod / base ellipse."""
    out = frame.copy()
    w, h = out.size
    arr = out.load()
    cx = w * 0.5
    base_y = h * 0.84
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
            if nx * nx + ny * ny <= 1.0 and r < 40 and g < 40 and b < 45:
                arr[x, y] = (0, 0, 0, 0)
    return out


def place_on_canvas(cropped: Image.Image, lift_px: int = 0) -> Image.Image:
    """Scale every Pokemon to the same on-screen height; feet on a shared baseline."""
    canvas = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    scale = CHAR_HEIGHT / max(1, cropped.height)
    max_w = FRAME_W * MAX_WIDTH_RATIO
    if cropped.width * scale > max_w:
        scale = max_w / cropped.width

    nw = max(1, int(cropped.width * scale))
    nh = max(1, int(cropped.height * scale))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    x = (FRAME_W - nw) // 2
    y = FRAME_H - FEET_PAD - nh + lift_px
    if y < TOP_PAD:
        y = TOP_PAD

    canvas.paste(resized, (x, y), resized)
    return strip_white_bottom(canvas)


def crop_pose_row(sheet: Image.Image, index: int, frames: int, pad_ratio: float = 0.06) -> Image.Image:
    w, h = sheet.size
    x0, x1 = frame_bounds(w, index, frames)
    pad = max(2, int((x1 - x0) * pad_ratio))
    x0 = max(0, x0 - pad)
    x1 = min(w, x1 + pad)
    return sheet.crop((x0, 0, x1, h))


def build_sheet(frames: list[Image.Image]) -> Image.Image:
    out = Image.new("RGBA", (FRAME_W * len(frames), FRAME_H), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        out.paste(frame, (i * FRAME_W, 0), frame)
    return out
