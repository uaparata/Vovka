"""Nikita Funko Pop — beanie, shades, BAPE tee, screen-punch break animation (7 frames)."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "pokemon"
PREVIEW_DIR = ROOT / "Pokemons" / "nikita-funko"
SHEET_PATH = OUT_DIR / "nikita-sheet.png"
IDLE_PATH = OUT_DIR / "nikita-idle.png"
PREVIEW_PATH = OUT_DIR / "nikita-preview.png"
FRAMES = 7
FRAME_W = 320
FRAME_H = 900

HOODIE = (18, 18, 22)
HOODIE_SHINE = (48, 48, 56)
TEE = (22, 20, 24)
BAPE_BROWN = (148, 98, 58)
BAPE_DARK = (88, 58, 34)
JEANS = (58, 62, 72)
JEANS_SHADE = (38, 42, 50)
SKIN = (210, 172, 142)
BEANIE = (12, 12, 14)
SUPREME_RED = (220, 20, 30)
SHADE_BLACK = (8, 8, 10)
LENS = (16, 16, 18)
LENS_GLINT = (90, 90, 96)
BURBERRY_TAN = (196, 168, 128)
BURBERRY_BLACK = (28, 28, 32)
BURBERRY_RED = (168, 32, 40)
BASE = (12, 12, 16)
CRACK = (220, 235, 255, 180)
GLASS = (180, 210, 235, 90)


def draw_ellipse(draw, box, fill, outline=None):
    draw.ellipse(box, fill=fill, outline=outline)


def draw_round_rect(draw, box, radius, fill, outline=None):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline)


def punch_offset(frame: int) -> tuple[float, float, float]:
    """body shift x, body shift y, arm punch scale."""
    data = [
        (0, 0, 0.0),
        (-4, -2, 0.15),
        (-10, -6, 0.55),
        (-18, -10, 1.0),
        (-14, -8, 0.85),
        (-6, -4, 0.35),
        (0, 0, 0.0),
    ]
    return data[frame % FRAMES]


def crack_intensity(frame: int) -> float:
    return [0, 0, 0.15, 0.55, 1.0, 0.65, 0.1][frame % FRAMES]


def draw_screen_cracks(draw, intensity: float):
    if intensity <= 0:
        return
    cx, cy = FRAME_W * 0.5, FRAME_H * 0.42
    lines = [
        (cx, cy, cx - 120, cy - 80),
        (cx, cy, cx + 110, cy - 70),
        (cx, cy, cx - 90, cy + 100),
        (cx, cy, cx + 130, cy + 90),
        (cx - 40, cy - 20, cx - 150, cy + 40),
        (cx + 30, cy - 10, cx + 155, cy - 30),
        (cx, cy - 30, cx, cy - 140),
        (cx, cy + 20, cx, cy + 150),
    ]
    w = max(1, int(2 + intensity * 3))
    alpha = int(80 + intensity * 140)
    for x0, y0, x1, y1 in lines:
        draw.line([(x0, y0), (x1, y1)], fill=(*CRACK[:3], alpha), width=w)
    if intensity > 0.4:
        for i in range(int(6 + intensity * 10)):
            ang = i * 0.9
            r0 = 20 + i * 7
            r1 = r0 + 18 + intensity * 22
            x0 = cx + math.cos(ang) * r0
            y0 = cy + math.sin(ang) * r0
            x1 = cx + math.cos(ang) * r1
            y1 = cy + math.sin(ang) * r1
            draw.line([(x0, y0), (x1, y1)], fill=(*CRACK[:3], int(alpha * 0.7)), width=max(1, w - 1))
    if intensity > 0.7:
        draw_round_rect(
            draw,
            (18, 60, FRAME_W - 18, FRAME_H - 120),
            12,
            (200, 225, 245, int(35 + intensity * 40)),
            outline=(230, 245, 255, int(60 + intensity * 80)),
        )


def draw_burberry_sneaker(draw, cx: float, ground: float, flip: bool = False):
    sign = -1 if flip else 1
    toe = cx + sign * 22
    heel = cx - sign * 18
    draw_round_rect(draw, (min(toe, heel) - 6, ground - 20, max(toe, heel) + 6, ground - 4), 6, (248, 248, 252))
    for row in range(3):
        for col in range(4):
            px = min(toe, heel) + col * 9
            py = ground - 18 + row * 5
            color = BURBERRY_TAN if (row + col) % 2 == 0 else BURBERRY_BLACK
            if (row + col) % 3 == 0:
                color = BURBERRY_RED
            draw.rectangle((px, py, px + 8, py + 4), fill=color)


def draw_nikita_body(draw, cx: float, body_top: float, ground: float, frame: int):
    bx, by, punch = punch_offset(frame)

    # Jeans
    draw_round_rect(draw, (cx - 46 + bx, body_top + 88 + by, cx + 46 + bx, ground - 22 + by), 10, JEANS, outline=JEANS_SHADE)
    draw.line([(cx + bx, body_top + 92 + by), (cx + bx, ground - 24 + by)], fill=JEANS_SHADE, width=2)
    # Gucci-style buckle
    draw_round_rect(draw, (cx - 16 + bx, body_top + 84 + by, cx + 16 + bx, body_top + 96 + by), 4, (180, 160, 90))
    draw.ellipse((cx - 8 + bx, body_top + 86 + by, cx + 8 + bx, body_top + 94 + by), outline=(220, 200, 120), width=2)

    # BAPE tee
    draw_round_rect(draw, (cx - 50 + bx, body_top + 38 + by, cx + 50 + bx, body_top + 90 + by), 12, TEE)
    ape_cy = body_top + 58 + by
    draw_ellipse(draw, (cx - 22 + bx, ape_cy - 18, cx + 22 + bx, ape_cy + 18), BAPE_BROWN)
    draw_ellipse(draw, (cx - 14 + bx, ape_cy - 10, cx - 4 + bx, ape_cy), (252, 252, 252))
    draw.ellipse((cx + 4 + bx, ape_cy - 10, cx + 14 + bx, ape_cy), (252, 252, 252))
    draw.arc((cx - 10 + bx, ape_cy + 2, cx + 10 + bx, ape_cy + 14), 10, 170, fill=BAPE_DARK, width=3)

    # Open hoodie
    draw_round_rect(draw, (cx - 56 + bx, body_top + 28 + by, cx + 56 + bx, body_top + 98 + by), 14, HOODIE, outline=HOODIE_SHINE)
    draw_round_rect(draw, (cx - 18 + bx, body_top + 34 + by, cx + 18 + bx, body_top + 94 + by), 6, TEE)
    draw_round_rect(draw, (cx - 62 + bx, body_top + 30 + by, cx - 44 + bx, body_top + 88 + by), 10, HOODIE, outline=HOODIE_SHINE)
    draw_round_rect(draw, (cx + 44 + bx, body_top + 30 + by, cx + 62 + bx, body_top + 88 + by), 10, HOODIE, outline=HOODIE_SHINE)

    # Left arm — phone
    draw_round_rect(draw, (cx - 78 + bx, body_top + 42 + by, cx - 54 + bx, body_top + 78 + by), 8, HOODIE)
    draw_ellipse(draw, (cx - 70 + bx, body_top + 74 + by, cx - 54 + bx, body_top + 88 + by), SKIN)
    phone_x = cx - 68 + bx
    phone_y = body_top + 48 + by
    draw_round_rect(draw, (phone_x, phone_y, phone_x + 14, phone_y + 24), 3, (30, 30, 34), outline=(80, 80, 88))
    draw.line([(phone_x + 4, phone_y - 6), (phone_x + 6, phone_y)], fill=(200, 200, 205), width=2)

    # Right arm — punch
    arm_len = 34 + punch * 48
    ax0 = cx + 48 + bx
    ay0 = body_top + 46 + by
    ax1 = ax0 + arm_len
    ay1 = ay0 - punch * 28
    draw.line([(ax0, ay0), (ax1, ay1)], fill=HOODIE, width=18)
    fist_r = 14 + punch * 10
    draw_ellipse(draw, (ax1 - fist_r, ay1 - fist_r, ax1 + fist_r, ay1 + fist_r), SKIN, outline=(180, 140, 110))
    if punch > 0.5:
        for ring in range(3):
            rr = fist_r + 8 + ring * 10
            draw.ellipse(
                (ax1 - rr, ay1 - rr, ax1 + rr, ay1 + rr),
                outline=(255, 220, 120, int(120 - ring * 30)),
                width=2,
            )

    draw_burberry_sneaker(draw, cx - 24 + bx, ground + by)
    draw_burberry_sneaker(draw, cx + 24 + bx, ground + by, flip=True)


def draw_nikita_head(draw, cx: float, head_cy: float, frame: int):
    bx, by, punch = punch_offset(frame)
    cx += bx
    head_cy += by - punch * 6

    head_r = 80
    draw_ellipse(draw, (cx - head_r, head_cy - head_r, cx + head_r, head_cy + head_r - 4), SKIN, outline=(170, 130, 100))

    # Beanie
    draw_ellipse(draw, (cx - head_r + 4, head_cy - head_r - 8, cx + head_r - 4, head_cy - 18), BEANIE)
    draw_round_rect(draw, (cx - head_r + 8, head_cy - head_r - 4, cx + head_r - 8, head_cy - 28), 10, BEANIE)
    draw_round_rect(draw, (cx - 28, head_cy - head_r + 2, cx + 28, head_cy - head_r + 22), 4, SUPREME_RED)
    draw.text((cx - 22, head_cy - head_r + 5), "SUP", fill=(255, 255, 255))

    # Sunglasses
    draw_round_rect(draw, (cx - 58, head_cy - 8, cx - 8, head_cy + 18), 6, LENS)
    draw_round_rect(draw, (cx + 8, head_cy - 8, cx + 58, head_cy + 18), 6, LENS)
    draw_round_rect(draw, (cx - 10, head_cy - 2, cx + 10, head_cy + 8), 3, SHADE_BLACK)
    draw.line([(cx - 58, head_cy + 4), (cx - 72, head_cy + 2)], fill=SHADE_BLACK, width=3)
    draw.ellipse((cx - 48, head_cy - 2, cx - 38, head_cy + 4), LENS_GLINT)
    draw.ellipse((cx + 38, head_cy - 2, cx + 48, head_cy + 4), LENS_GLINT)

    # Earbuds
    draw.ellipse((cx - head_r + 6, head_cy + 8, cx - head_r + 16, head_cy + 18), (240, 240, 244))


def draw_funko_frame(frame_idx: int) -> Image.Image:
    img = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    bx, by, _ = punch_offset(frame_idx)
    cx = FRAME_W * 0.5 + bx
    ground = FRAME_H - 14 + by
    body_top = ground - 198 + by
    head_cy = body_top - 96 + by

    draw_ellipse(draw, (cx - 54, ground - 8, cx + 54, ground + 10), BASE)
    draw_ellipse(draw, (cx - 40, ground - 18, cx + 40, ground - 2), (26, 26, 32))

    draw_nikita_body(draw, FRAME_W * 0.5, body_top, ground, frame_idx)
    draw_nikita_head(draw, FRAME_W * 0.5, head_cy, frame_idx)

    crack_layer = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    crack_draw = ImageDraw.Draw(crack_layer)
    draw_screen_cracks(crack_draw, crack_intensity(frame_idx))
    img = Image.alpha_composite(img, crack_layer)

    return img.filter(ImageFilter.SHARPEN)


def strip_bottom_white(frame: Image.Image, threshold: int = 238) -> Image.Image:
    out = frame.copy()
    arr = out.load()
    w, h = out.size
    for y in range(int(h * 0.88), h):
        for x in range(w):
            r, g, b, a = arr[x, y]
            if a > 10 and r >= threshold and g >= threshold and b >= threshold:
                arr[x, y] = (0, 0, 0, 0)
    return out


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    frames = [strip_bottom_white(draw_funko_frame(i)) for i in range(FRAMES)]
    sheet = Image.new("RGBA", (FRAME_W * FRAMES, FRAME_H), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * FRAME_W, 0), frame)

    sheet.save(SHEET_PATH, optimize=True)
    frames[0].save(IDLE_PATH, optimize=True)
    preview = frames[3].resize((640, 1800), Image.Resampling.LANCZOS)
    preview.save(PREVIEW_PATH, optimize=True)
    preview.save(PREVIEW_DIR / "nikita-preview.png", optimize=True)

    ref = ROOT / "assets" / "c__Users_cocoi_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_photo_2026-06-10_16-24-20-e6ac6de8-cc07-4b46-b73b-44ed32d208c3.png"
    if ref.exists():
        Image.open(ref).save(PREVIEW_DIR / "nikita-reference.jpg", quality=92)

    print(f"Wrote {SHEET_PATH} ({sheet.size}), {IDLE_PATH}")


if __name__ == "__main__":
    main()
