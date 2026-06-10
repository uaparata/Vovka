"""Jackon — DJI FPV goggles + drone launch (7 frames).

Procedural Funko-style sheet until a photo-based pose row is available.
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from pokemon_sprite_common import build_sheet, place_on_canvas

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "pokemon"
PREVIEW_DIR = ROOT / "Pokemons" / "jackon-funko"
SHEET_PATH = OUT_DIR / "jackon-sheet.png"
IDLE_PATH = OUT_DIR / "jackon-idle.png"
RAW_PATH = PREVIEW_DIR / "jackon-poses-raw.png"
FRAMES = 7
FRAME_W = 320
FRAME_H = 900

SKIN = (228, 196, 168)
SKIN_SHADE = (196, 158, 132)
HAIR = (186, 152, 98)
HAIR_LIGHT = (214, 182, 128)
HAIR_DARK = (142, 108, 68)
SHIRT = (72, 78, 88)
SHIRT_SHADE = (48, 52, 60)
PANTS = (36, 40, 48)
GOGGLE_BODY = (58, 60, 66)
GOGGLE_LENS = (24, 26, 30)
GOGGLE_ANT = (40, 42, 48)
GOGGLE_STRAP = (28, 30, 34)
CONTROLLER = (44, 46, 52)
CONTROLLER_ACCENT = (249, 115, 22)
DRONE_BODY = (52, 54, 60)
DRONE_ARM = (68, 70, 76)
DRONE_PROP = (180, 190, 200, 140)
PROP_BLUR = (200, 210, 220, 90)
BASE = (14, 16, 20)
EYE = (120, 138, 118)
BROW = (150, 118, 82)


def draw_round_rect(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline)


def draw_head(draw, cx, cy, hair_shift=0):
    draw.ellipse((cx - 52, cy - 58, cx + 52, cy + 48), fill=SKIN)
    draw.ellipse((cx - 46, cy - 52, cx + 46, cy + 40), fill=SKIN_SHADE, outline=None)
    draw.ellipse((cx - 46, cy - 30, cx + 46, cy + 42), fill=SKIN)

    for side, dx in ((-1, -28), (1, 28)):
        draw.polygon(
            [
                (cx + dx * 0.2, cy - 52),
                (cx + dx * 1.1 + hair_shift * side, cy - 78),
                (cx + dx * 1.35 + hair_shift * side, cy - 18),
                (cx + dx * 0.55, cy - 8),
            ],
            fill=HAIR,
        )
        draw.polygon(
            [
                (cx + dx * 0.35, cy - 48),
                (cx + dx * 0.95 + hair_shift * side * 0.5, cy - 68),
                (cx + dx * 1.05 + hair_shift * side * 0.5, cy - 28),
                (cx + dx * 0.45, cy - 12),
            ],
            fill=HAIR_LIGHT,
        )

    draw.arc((cx - 34, cy - 62, cx + 34, cy - 18), 200, 340, fill=HAIR_DARK, width=4)
    draw.line([(cx - 8, cy - 58), (cx + 8, cy - 58)], fill=HAIR_DARK, width=3)

    draw.ellipse((cx - 22, cy - 8, cx - 8, cy + 6), fill=EYE)
    draw.ellipse((cx + 8, cy - 8, cx + 22, cy + 6), fill=EYE)
    draw.ellipse((cx - 18, cy - 4, cx - 12, cy + 2), fill=(240, 248, 240))
    draw.ellipse((cx + 12, cy - 4, cx + 18, cy + 2), fill=(240, 248, 240))
    draw.arc((cx - 10, cy - 18, cx + 10, cy - 6), 200, 340, fill=BROW, width=3)
    draw.line([(cx - 6, cy + 18), (cx + 6, cy + 18)], fill=SKIN_SHADE, width=2)
    draw.arc((cx - 14, cy + 20, cx + 14, cy + 34), 10, 170, fill=(180, 130, 118), width=2)


def draw_body(draw, cx, base_y, arm_l=(0, 0), arm_r=(0, 0)):
    torso_top = base_y - 210
    draw_round_rect(draw, (cx - 58, torso_top, cx + 58, base_y - 28), 26, SHIRT)
    draw_round_rect(draw, (cx - 44, torso_top + 12, cx + 44, base_y - 42), 18, SHIRT_SHADE)
    draw_round_rect(draw, (cx - 34, base_y - 34, cx + 34, base_y - 4), 12, PANTS)

    def arm(side, shift):
        sx = cx + side * 62 + shift[0]
        sy = torso_top + 36 + shift[1]
        ex = sx + side * 28 + shift[0] * 0.4
        ey = sy + 72 + shift[1] * 0.5
        draw.line([(sx, sy), (ex, ey)], fill=SHIRT, width=22)
        draw.ellipse((ex - 14, ey - 14, ex + 14, ey + 14), fill=SKIN)

    arm(-1, arm_l)
    arm(1, arm_r)


def draw_goggles(draw, cx, cy, on_face=False, tilt=0):
    w, h = 118, 54
    box = (cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2)
    body = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    draw_round_rect(bd, box, 16, GOGGLE_BODY)
    draw_round_rect(bd, (cx - 46, cy - 18, cx - 8, cy + 16), 10, GOGGLE_LENS)
    draw_round_rect(bd, (cx + 8, cy - 18, cx + 46, cy + 16), 10, GOGGLE_LENS)
    draw.line([(cx - 36, cy - 4), (cx - 18, cy - 2)], fill=(120, 130, 150), width=2)
    draw.line([(cx + 18, cy - 2), (cx + 36, cy - 4)], fill=(120, 130, 150), width=2)
    for ax in (-52, -36, 36, 52):
        draw.line([(cx + ax, cy - 22), (cx + ax, cy - 38)], fill=GOGGLE_ANT, width=4)
        draw.ellipse((cx + ax - 4, cy - 42, cx + ax + 4, cy - 34), fill=GOGGLE_ANT)
    if on_face:
        draw.arc((cx - 58, cy - 8, cx + 58, cy + 34), 190, 350, fill=GOGGLE_STRAP, width=6)
    if tilt:
        body = body.rotate(tilt, resample=Image.Resampling.BICUBIC, center=(cx, cy))
    return body


def draw_controller(draw, cx, cy):
    draw_round_rect(draw, (cx - 34, cy - 18, cx + 34, cy + 18), 8, CONTROLLER)
    draw.ellipse((cx - 18, cy - 6, cx - 6, cy + 6), fill=CONTROLLER_ACCENT)
    draw.ellipse((cx + 6, cy - 6, cx + 18, cy + 6), fill=(220, 220, 228))
    draw.line([(cx, cy - 22), (cx, cy - 34)], fill=GOGGLE_ANT, width=3)


def draw_drone(draw, cx, cy, spin=0.0, scale=1.0):
    s = scale
    arm = 34 * s
    body_r = 16 * s
    draw.ellipse((cx - body_r, cy - body_r, cx + body_r, cy + body_r), fill=DRONE_BODY)
    for i, (dx, dy) in enumerate([(arm, 0), (-arm, 0), (0, arm), (0, -arm)]):
        px, py = cx + dx, cy + dy
        draw.line([(cx, cy), (px, py)], fill=DRONE_ARM, width=int(5 * s))
        draw.ellipse((px - 10 * s, py - 10 * s, px + 10 * s, py + 10 * s), fill=DRONE_ARM)
        ang = spin + i * (math.pi / 2)
        for k in range(3):
            a = ang + k * (2 * math.pi / 3)
            x1 = px + math.cos(a) * 8 * s
            y1 = py + math.sin(a) * 8 * s
            x2 = px + math.cos(a) * 22 * s
            y2 = py + math.sin(a) * 22 * s
            draw.line([(x1, y1), (x2, y2)], fill=PROP_BLUR, width=int(3 * s))
        draw.ellipse((px - 14 * s, py - 14 * s, px + 14 * s, py + 14 * s), outline=DRONE_PROP, width=2)


def draw_base(draw):
    cx = FRAME_W // 2
    base_y = FRAME_H - 18
    draw.ellipse((cx - 72, base_y - 10, cx + 72, base_y + 10), fill=BASE)
    draw.ellipse((cx - 56, base_y - 6, cx + 56, base_y + 6), fill=(28, 30, 36))


def frame_pose(index: int) -> Image.Image:
    img = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = FRAME_W // 2
    base_y = FRAME_H - 26

    if index == 0:
        draw_body(draw, cx, base_y)
        draw_head(draw, cx, base_y - 228)
    elif index == 1:
        draw_body(draw, cx, base_y, arm_l=(18, -40), arm_r=(-18, -40))
        draw_head(draw, cx, base_y - 228)
        g = draw_goggles(draw, cx, base_y - 120, tilt=-12)
        img = Image.alpha_composite(img, g)
    elif index == 2:
        draw_body(draw, cx, base_y, arm_l=(8, -72), arm_r=(-8, -72))
        draw_head(draw, cx, base_y - 228)
        g = draw_goggles(draw, cx, base_y - 196, tilt=8)
        img = Image.alpha_composite(img, g)
    elif index == 3:
        draw_body(draw, cx, base_y, arm_l=(0, -20), arm_r=(0, -20))
        head_y = base_y - 228
        draw_head(draw, cx, head_y)
        g = draw_goggles(draw, cx, head_y + 4, on_face=True)
        img = Image.alpha_composite(img, g)
        draw_controller(draw, cx + 58, base_y - 96)
    elif index == 4:
        draw_body(draw, cx, base_y, arm_l=(12, -28), arm_r=(-12, -28))
        head_y = base_y - 228
        draw_head(draw, cx, head_y)
        g = draw_goggles(draw, cx, head_y + 4, on_face=True)
        img = Image.alpha_composite(img, g)
        draw_controller(draw, cx, base_y - 108)
        draw_drone(draw, cx + 72, base_y - 150, spin=0.4, scale=0.85)
    elif index == 5:
        draw_body(draw, cx, base_y, arm_l=(24, -48), arm_r=(-6, -36))
        head_y = base_y - 224
        draw_head(draw, cx, head_y, hair_shift=2)
        g = draw_goggles(draw, cx, head_y + 4, on_face=True)
        img = Image.alpha_composite(img, g)
        draw_controller(draw, cx + 36, base_y - 118)
        draw_drone(draw, cx + 10, base_y - 250, spin=1.2, scale=1.0)
    else:
        draw_body(draw, cx, base_y, arm_l=(10, -10), arm_r=(-10, -10))
        head_y = base_y - 220
        draw_head(draw, cx, head_y, hair_shift=-3)
        g = draw_goggles(draw, cx, head_y + 4, on_face=True)
        img = Image.alpha_composite(img, g)
        draw_controller(draw, cx + 48, base_y - 100)
        draw_drone(draw, cx - 20, base_y - 360, spin=2.4, scale=1.05)

    draw_base(draw)
    return img


def build_raw_sheet() -> Image.Image:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (FRAME_W * FRAMES, FRAME_H), (0, 0, 0, 0))
    for i in range(FRAMES):
        frame = frame_pose(i)
        sheet.paste(frame, (i * FRAME_W, 0), frame)
    sheet.save(RAW_PATH, optimize=True)
    return sheet


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    build_raw_sheet()

    lift = {1: -8, 2: -20, 3: -12, 4: -18, 5: -36, 6: -28}
    frames = []
    for i in range(FRAMES):
        raw = frame_pose(i)
        x0, y0, x1, y1 = raw.getbbox() or (0, 0, FRAME_W, FRAME_H)
        cropped = raw.crop((x0, y0, x1 + 1, y1 + 1))
        frames.append(place_on_canvas(cropped, lift_px=lift.get(i, 0)))

    out = build_sheet(frames)
    out.save(SHEET_PATH, optimize=True)
    frames[0].save(IDLE_PATH, optimize=True)
    print(f"Wrote {RAW_PATH}")
    print(f"Wrote {SHEET_PATH} ({out.size}) and {IDLE_PATH}")


if __name__ == "__main__":
    main()
