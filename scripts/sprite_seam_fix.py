"""Remove vertical center seam artifacts from AI-generated sprite frames."""
from __future__ import annotations

from PIL import Image


def fix_center_seam(frame: Image.Image, half_width: int = 22) -> Image.Image:
    out = frame.copy()
    w, h = out.size
    cx = w // 2
    arr = out.load()
    left_x = max(0, cx - half_width - 10)
    right_x = min(w - 1, cx + half_width + 10)

    for y in range(h):
        left = arr[left_x, y]
        right = arr[right_x, y]
        for dx in range(-half_width, half_width + 1):
            x = cx + dx
            if x < 0 or x >= w:
                continue
            t = (dx + half_width) / max(1, 2 * half_width)
            arr[x, y] = (
                int(left[0] * (1 - t) + right[0] * t),
                int(left[1] * (1 - t) + right[1] * t),
                int(left[2] * (1 - t) + right[2] * t),
                int(left[3] * (1 - t) + right[3] * t),
            )

    return out
