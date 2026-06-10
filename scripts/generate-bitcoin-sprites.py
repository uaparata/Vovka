"""Generate BITCOIN (B.T.S.) Funko Pop sprite sheet — blue eyes, blue lightsaber."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "pokemon"
SHEET_PATH = OUT_DIR / "bitcoin-sheet.png"
IDLE_PATH = OUT_DIR / "bitcoin-idle.png"
FRAMES = 6
FRAME_W = 320
FRAME_H = 900

# Funko palette
SKIN = (235, 198, 168)
SKIN_SHADOW = (205, 160, 130)
HAIR = (228, 205, 120)
HAIR_DARK = (175, 145, 75)
EYE_BLUE = (45, 130, 220)
EYE_WHITE = (250, 252, 255)
SHIRT = (248, 248, 252)
SHIRT_SHADOW = (210, 212, 220)
PANTS = (28, 32, 42)
BOOT = (18, 18, 22)
SABER_CORE = (186, 230, 255)
SABER_GLOW = (56, 189, 248)
SABER_HALO = (125, 211, 252)
BASE = (16, 16, 20)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def draw_ellipse(draw, box, fill, outline=None):
    draw.ellipse(box, fill=fill, outline=outline)


def draw_round_rect(draw, box, radius, fill, outline=None):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline)


def saber_angle(frame: int) -> float:
    """Degrees: 0=down, 90=horizontal right, -45=up-right slash."""
    angles = [-72, -35, 18, 55, 28, -72]
    return math.radians(angles[frame % FRAMES])


def saber_origin(frame: int) -> tuple[float, float]:
    """Hand grip position relative to body center."""
    grips = [
        (42, 118),
        (48, 108),
        (52, 92),
        (58, 78),
        (50, 88),
        (42, 118),
    ]
    return grips[frame % FRAMES]


def body_bob(frame: int) -> float:
    bobs = [0, -4, -10, -14, -8, 0]
    return bobs[frame % FRAMES]


def arm_pose(frame: int) -> tuple[float, float]:
    """Right arm rotation degrees."""
    poses = [12, 28, 48, 62, 40, 12]
    return poses[frame % FRAMES], poses[frame % FRAMES] * 0.35


def draw_lightsaber(draw, cx: float, cy: float, angle: float, length: float = 118):
    gx = cx + math.cos(angle) * 8
    gy = cy + math.sin(angle) * 8
    hx = gx + math.cos(angle) * length
    hy = gy + math.sin(angle) * length

    for w, color in [(14, SABER_HALO), (8, SABER_GLOW), (4, SABER_CORE)]:
        draw.line([(gx, gy), (hx, hy)], fill=color, width=w)

    draw.ellipse(
        (gx - 7, gy - 7, gx + 7, gy + 7),
        fill=(60, 65, 72),
        outline=(120, 125, 135),
    )


def draw_funko_frame(frame_idx: int) -> Image.Image:
    img = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    bob = body_bob(frame_idx)
    cx = FRAME_W * 0.5
    ground = FRAME_H - 18 + bob

    # Display base (Funko stand)
    draw_ellipse(draw, (cx - 52, ground - 8, cx + 52, ground + 10), BASE)
    draw_ellipse(draw, (cx - 38, ground - 18, cx + 38, ground - 2), (28, 28, 34))

    body_top = ground - 200 + bob
    head_cy = body_top - 95 + bob

    # Legs / boots
    draw_round_rect(draw, (cx - 34, body_top + 52, cx - 8, ground - 14), 8, PANTS)
    draw_round_rect(draw, (cx + 8, body_top + 52, cx + 34, ground - 14), 8, PANTS)
    draw_round_rect(draw, (cx - 38, ground - 22, cx - 4, ground - 6), 6, BOOT)
    draw_round_rect(draw, (cx + 4, ground - 22, cx + 38, ground - 6), 6, BOOT)

    # Torso — white tee
    draw_round_rect(draw, (cx - 48, body_top, cx + 48, body_top + 78), 16, SHIRT, outline=SHIRT_SHADOW)
    draw.line([(cx, body_top + 8), (cx, body_top + 62)], fill=SHIRT_SHADOW, width=2)

    # Left arm (down)
    draw_round_rect(draw, (cx - 72, body_top + 8, cx - 48, body_top + 62), 10, SHIRT, outline=SHIRT_SHADOW)

    # Right arm — raised for saber
    arm_rot, _ = arm_pose(frame_idx)
    arm_box = (cx + 44, body_top + 4, cx + 72, body_top + 58)
    arm_layer = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    arm_draw = ImageDraw.Draw(arm_layer)
    arm_draw.rounded_rectangle(arm_box, radius=10, fill=SHIRT, outline=SHIRT_SHADOW)
    arm_layer = arm_layer.rotate(-arm_rot, center=(cx + 58, body_top + 30), resample=Image.Resampling.BICUBIC)
    img = Image.alpha_composite(img, arm_layer)
    draw = ImageDraw.Draw(img)

    # Head — big Funko sphere
    head_r = 78
    head_box = (cx - head_r, head_cy - head_r, cx + head_r, head_cy + head_r - 8)
    draw_ellipse(draw, head_box, SKIN, outline=SKIN_SHADOW)

    # Hair — messy blonde bowl cut
    hair_layer = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hair_layer)
    hd.ellipse((cx - 82, head_cy - 98, cx + 82, head_cy + 18), fill=HAIR)
    for i in range(9):
        spike_x = cx - 60 + i * 15
        spike_y = head_cy - 88 + (i % 3) * 4
        hd.polygon(
            [
                (spike_x, spike_y + 28),
                (spike_x + 7, spike_y),
                (spike_x + 14, spike_y + 24),
            ],
            fill=HAIR if i % 2 == 0 else HAIR_DARK,
        )
    hd.rectangle((cx - 80, head_cy - 20, cx + 80, head_cy + 30), fill=HAIR)
    hair_layer = hair_layer.filter(ImageFilter.GaussianBlur(0.6))
    img = Image.alpha_composite(img, hair_layer)
    draw = ImageDraw.Draw(img)

    # Blue Funko eyes
    eye_y = head_cy + 6
    for ex in (cx - 28, cx + 12):
        draw_ellipse(draw, (ex, eye_y, ex + 32, eye_y + 32), EYE_WHITE)
        draw_ellipse(draw, (ex + 6, eye_y + 6, ex + 26, eye_y + 26), EYE_BLUE)
        draw_ellipse(draw, (ex + 14, eye_y + 10, ex + 20, eye_y + 16), (255, 255, 255))

    # Nose + brow
    draw.polygon([(cx - 4, head_cy + 34), (cx + 4, head_cy + 34), (cx, head_cy + 42)], fill=SKIN_SHADOW)
    draw.arc((cx - 30, head_cy - 8, cx - 4, head_cy + 10), 200, 340, fill=(90, 60, 40), width=3)
    draw.arc((cx + 4, head_cy - 8, cx + 30, head_cy + 10), 200, 340, fill=(90, 60, 40), width=3)

    # Nostril ring (subtle)
    draw.arc((cx + 18, head_cy + 30, cx + 28, head_cy + 40), 270, 90, fill=(160, 160, 170), width=2)

    # Lightsaber from right hand
    ox, oy = saber_origin(frame_idx)
    draw_lightsaber(draw, cx + ox, body_top + oy + bob * 0.2, saber_angle(frame_idx))

    return img


def place_frame(frame: Image.Image, index: int) -> Image.Image:
    canvas = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    bob = body_bob(index)
    x = (FRAME_W - frame.width) // 2
    if index in {2, 3, 4}:
        y = max(0, int(12 + bob * 0.5))
    else:
        y = FRAME_H - frame.height - 2
    canvas.paste(frame, (x, y), frame)
    return canvas


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    frames = [place_frame(draw_funko_frame(i), i) for i in range(FRAMES)]

    sheet = Image.new("RGBA", (FRAME_W * FRAMES, FRAME_H), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * FRAME_W, 0), frame)

    sheet.save(SHEET_PATH, optimize=True)
    frames[0].save(IDLE_PATH, optimize=True)
    print(f"Wrote {SHEET_PATH} ({sheet.size}) and {IDLE_PATH}")


if __name__ == "__main__":
    main()
