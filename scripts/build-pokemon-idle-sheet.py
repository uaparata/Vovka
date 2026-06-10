"""Build idle + jump sprite sheets from a single clean Funko source image."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from sprite_seam_fix import fix_center_seam

ROOT = Path(__file__).resolve().parents[1]
FRAME_W = 320
FRAME_H = 900
FRAMES = 6

JUMP_KEYS = [
    (0.0, 1.0),
    (0.02, 0.96),
    (-0.14, 1.0),
    (0.0, 1.02),
    (-0.22, 1.0),
    (0.04, 0.94),
]


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

    for y in range(h):
        for x in range(w):
            r, g, b, a = arr[x, y]
            if a < 10:
                continue
            if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) < 55 and y < h * 0.92:
                arr[x, y] = (0, 0, 0, 0)
    return out


def build_frame(source: Image.Image, y_ratio: float, scale: float) -> Image.Image:
    x0, y0, x1, y1 = bbox(source)
    cropped = source.crop((x0, y0, x1 + 1, y1 + 1))
    canvas = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))

    base_scale = min((FRAME_W * 0.99) / cropped.width, (FRAME_H * 0.97) / cropped.height)
    s = base_scale * scale
    nw = max(1, int(cropped.width * s))
    nh = max(1, int(cropped.height * s))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    x = (FRAME_W - nw) // 2
    y = FRAME_H - nh - 2 + int(y_ratio * FRAME_H)
    canvas.paste(resized, (x, y), resized)
    return canvas


def load_source(src: Path, crop_frame_index: int | None = None) -> Image.Image:
    img = Image.open(src).convert("RGBA")
    if crop_frame_index is not None:
        w, h = img.size
        x0 = int(round(crop_frame_index * w / FRAMES))
        x1 = int(round((crop_frame_index + 1) * w / FRAMES))
        inset = max(2, int((x1 - x0) * 0.02))
        img = img.crop((x0 + inset, 0, x1 - inset, h))
    return strip_bg(fix_center_seam(img))


def build_from_source(src: Path, out_idle: Path, out_sheet: Path, crop_frame_index: int | None = None):
    img = load_source(src, crop_frame_index)
    frames = [build_frame(img, y, s) for y, s in JUMP_KEYS]

    sheet = Image.new("RGBA", (FRAME_W * FRAMES, FRAME_H), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * FRAME_W, 0), frame)

    out_idle.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(out_idle, optimize=True)
    sheet.save(out_sheet, optimize=True)
    print(f"Built {out_idle.name} and {out_sheet.name}")


def main():
    build_from_source(
        ROOT / "Pokemons" / "kirill-mulin-funko" / "kirill-mulin-funko-preview.png",
        ROOT / "assets" / "pokemon" / "kirill-idle.png",
        ROOT / "assets" / "pokemon" / "kirill-sheet.png",
    )
    bitcoin_src = ROOT / "assets" / "pokemon" / "bitcoin-funko-idle-raw.png"
    if not bitcoin_src.exists():
        bitcoin_src = ROOT / "assets" / "pokemon" / "bitcoin-sheet-raw.png"
        build_from_source(
            bitcoin_src,
            ROOT / "assets" / "pokemon" / "bitcoin-idle.png",
            ROOT / "assets" / "pokemon" / "bitcoin-sheet.png",
            crop_frame_index=0,
        )
    else:
        build_from_source(
            bitcoin_src,
            ROOT / "assets" / "pokemon" / "bitcoin-idle.png",
            ROOT / "assets" / "pokemon" / "bitcoin-sheet.png",
        )


if __name__ == "__main__":
    main()
