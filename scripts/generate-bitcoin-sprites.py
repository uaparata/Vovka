"""BITCOIN Funko Pop — gold coin head, human eyes, black bunny suit (no ears), blue saber."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "pokemon"
PREVIEW_DIR = ROOT / "Pokemons" / "bitcoin-bts-funko"
SHEET_PATH = OUT_DIR / "bitcoin-sheet.png"
IDLE_PATH = OUT_DIR / "bitcoin-idle.png"
PREVIEW_PATH = OUT_DIR / "bitcoin-preview.png"
FRAMES = 7
FRAME_W = 320
FRAME_H = 900

# Palette
COIN_GOLD = (242, 178, 48)
COIN_SHADOW = (184, 120, 22)
COIN_HIGHLIGHT = (255, 220, 120)
SUIT_BLACK = (14, 14, 18)
SUIT_SHINE = (42, 42, 50)
SUIT_WHITE = (248, 248, 252)
SKIN = (198, 158, 128)
EYE_WHITE = (252, 254, 255)
EYE_IRIS = (118, 148, 178)
EYE_PUPIL = (28, 32, 42)
SABER_CORE = (200, 240, 255)
SABER_GLOW = (56, 189, 248)
SABER_HALO = (125, 211, 252)
BASE = (12, 12, 16)


def draw_ellipse(draw, box, fill, outline=None):
    draw.ellipse(box, fill=fill, outline=outline)


def draw_round_rect(draw, box, radius, fill, outline=None):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline)


def saber_angle(frame: int) -> float:
    angles_deg = [-80, -48, -10, 32, 58, 22, -70]
    return math.radians(angles_deg[frame % FRAMES])


def saber_grip(frame: int) -> tuple[float, float]:
    grips = [(46, 108), (52, 96), (56, 82), (60, 72), (54, 84), (48, 98), (44, 112)]
    return grips[frame % FRAMES]


def body_bob(frame: int) -> float:
    return [0, -2, -6, -10, -7, -3, 0][frame % FRAMES]


def draw_lightsaber(draw, gx: float, gy: float, angle: float, length: float = 128):
    hx = gx + math.cos(angle) * length
    hy = gy + math.sin(angle) * length
    for w, color in [(16, SABER_HALO), (9, SABER_GLOW), (4, SABER_CORE)]:
        draw.line([(gx, gy), (hx, hy)], fill=color, width=w)
    draw.ellipse((gx - 8, gy - 8, gx + 8, gy + 8), fill=(55, 58, 66), outline=(130, 135, 145))


def draw_bunny_suit(draw, cx: float, body_top: float, ground: float):
    # Shiny black shorts with hip cutouts + white bow
    draw_round_rect(draw, (cx - 50, body_top + 44, cx + 50, ground - 18), 14, SUIT_BLACK, outline=SUIT_SHINE)
    draw.polygon(
        [(cx - 50, body_top + 58), (cx - 34, body_top + 72), (cx - 50, body_top + 86)],
        fill=(0, 0, 0, 0),
    )
    draw.polygon(
        [(cx + 50, body_top + 58), (cx + 34, body_top + 72), (cx + 50, body_top + 86)],
        fill=(0, 0, 0, 0),
    )
    draw_round_rect(draw, (cx - 12, body_top + 46, cx + 12, body_top + 58), 4, SUIT_WHITE)

    # Crop top — black with white center strip + collar
    draw_round_rect(draw, (cx - 54, body_top, cx + 54, body_top + 52), 16, SUIT_BLACK, outline=SUIT_SHINE)
    draw_round_rect(draw, (cx - 16, body_top + 4, cx + 16, body_top + 48), 6, SUIT_WHITE)
    for i, yy in enumerate(range(int(body_top + 14), int(body_top + 40), 8)):
        draw.ellipse((cx - 4, yy, cx + 4, yy + 6), fill=SUIT_BLACK if i % 2 == 0 else SUIT_SHINE)
    draw_round_rect(draw, (cx - 22, body_top - 6, cx + 22, body_top + 8), 6, SUIT_WHITE, outline=SUIT_SHINE)

    # Muscular arms in suit sleeves
    draw_round_rect(draw, (cx - 78, body_top + 6, cx - 50, body_top + 58), 12, SUIT_BLACK, outline=SUIT_SHINE)
    draw_round_rect(draw, (cx + 50, body_top + 2, cx + 78, body_top + 54), 12, SUIT_BLACK, outline=SUIT_SHINE)
    draw_ellipse(draw, (cx - 66, body_top + 56, cx - 50, body_top + 72), SKIN)
    draw_ellipse(draw, (cx + 50, body_top + 52, cx + 66, body_top + 68), SKIN)

    # Boots
    draw_round_rect(draw, (cx - 40, ground - 24, cx - 6, ground - 6), 8, SUIT_BLACK, outline=SUIT_SHINE)
    draw_round_rect(draw, (cx + 6, ground - 24, cx + 40, ground - 6), 8, SUIT_BLACK, outline=SUIT_SHINE)


def draw_bitcoin_head(draw, cx: float, head_cy: float):
    head_r = 82
    head_box = (cx - head_r, head_cy - head_r, cx + head_r, head_cy + head_r - 6)
    draw_ellipse(draw, head_box, COIN_GOLD, outline=COIN_SHADOW)
    draw_ellipse(
        draw,
        (cx - head_r + 10, head_cy - head_r + 8, cx + head_r - 28, head_cy + head_r - 24),
        COIN_HIGHLIGHT,
    )

    # B symbol
    draw.arc((cx - 26, head_cy - 30, cx + 10, head_cy + 34), 70, 290, fill=COIN_SHADOW, width=10)
    draw.line([(cx - 8, head_cy - 30), (cx - 8, head_cy + 34)], fill=COIN_SHADOW, width=8)
    draw.arc((cx - 24, head_cy - 30, cx + 8, head_cy + 2), 300, 70, fill=COIN_SHADOW, width=7)
    draw.arc((cx - 24, head_cy - 6, cx + 8, head_cy + 30), 300, 70, fill=COIN_SHADOW, width=7)

    # Human eyes on coin head
    eye_y = head_cy + 2
    for ex in (cx - 30, cx + 2):
        draw_ellipse(draw, (ex, eye_y, ex + 30, eye_y + 22), EYE_WHITE)
        draw_ellipse(draw, (ex + 5, eye_y + 4, ex + 24, eye_y + 18), EYE_IRIS)
        draw_ellipse(draw, (ex + 12, eye_y + 7, ex + 18, eye_y + 14), EYE_PUPIL)
        draw_ellipse(draw, (ex + 8, eye_y + 5, ex + 12, eye_y + 9), (255, 255, 255))

    draw.arc((cx - 24, head_cy - 18, cx - 2, head_cy - 2), 200, 340, fill=COIN_SHADOW, width=3)
    draw.arc((cx + 2, head_cy - 18, cx + 24, head_cy - 2), 200, 340, fill=COIN_SHADOW, width=3)


def draw_funko_frame(frame_idx: int) -> Image.Image:
    img = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    bob = body_bob(frame_idx)
    cx = FRAME_W * 0.5
    ground = FRAME_H - 14 + bob
    body_top = ground - 198 + bob
    head_cy = body_top - 98 + bob

    draw_ellipse(draw, (cx - 54, ground - 8, cx + 54, ground + 10), BASE)
    draw_ellipse(draw, (cx - 40, ground - 18, cx + 40, ground - 2), (26, 26, 32))

    draw_bunny_suit(draw, cx, body_top, ground)

    # Right arm rotation for saber swing
    arm_rot = [-8, 6, 22, 42, 58, 30, -6][frame_idx % FRAMES]
    arm_layer = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    arm_draw = ImageDraw.Draw(arm_layer)
    arm_draw.rounded_rectangle(
        (cx + 48, body_top + 2, cx + 80, body_top + 56),
        radius=12,
        fill=SUIT_BLACK,
        outline=SUIT_SHINE,
    )
    arm_layer = arm_layer.rotate(
        -arm_rot, center=(cx + 64, body_top + 28), resample=Image.Resampling.BICUBIC
    )
    img = Image.alpha_composite(img, arm_layer)
    draw = ImageDraw.Draw(img)

    draw_bitcoin_head(draw, cx, head_cy)

    ox, oy = saber_grip(frame_idx)
    draw_lightsaber(draw, cx + ox, body_top + oy, saber_angle(frame_idx))

    return img.filter(ImageFilter.SHARPEN)


def place_frame(frame: Image.Image, index: int) -> Image.Image:
    canvas = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    bob = body_bob(index)
    x = (FRAME_W - frame.width) // 2
    if index in {2, 3, 4}:
        y = max(0, int(8 + bob * 0.4))
    else:
        y = FRAME_H - frame.height - 14
    canvas.paste(frame, (x, y), frame)
    return canvas


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    frames = [place_frame(draw_funko_frame(i), i) for i in range(FRAMES)]
    sheet = Image.new("RGBA", (FRAME_W * FRAMES, FRAME_H), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * FRAME_W, 0), frame)

    sheet.save(SHEET_PATH, optimize=True)
    frames[0].save(IDLE_PATH, optimize=True)

    preview = frames[0].resize((640, 1800), Image.Resampling.LANCZOS)
    preview.save(PREVIEW_PATH, optimize=True)
    preview.save(PREVIEW_DIR / "bitcoin-preview.png", optimize=True)

    print(f"Wrote {SHEET_PATH} ({sheet.size}), {IDLE_PATH}, {PREVIEW_PATH}")


if __name__ == "__main__":
    main()
