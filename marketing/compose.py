#!/usr/bin/env python3
"""Compose App Store screenshots.

Reads raw/6.9/*.png, outputs final/6.9/*.png at 1290x2796.
Also generates 6.5" variants at 1284x2778.

Layout per screen:
- Solid tinted background (per-screen accent).
- Large bold caption centered at top.
- Screenshot below, rounded corners, subtle drop shadow.
- Screenshot is gently zoomed/cropped to remove dead space.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).parent
RAW = ROOT / "raw" / "6.9"
FINAL_69 = ROOT / "final" / "6.9"
FINAL_65 = ROOT / "final" / "6.5"

INK = (26, 26, 26)
INK_SOFT = (58, 58, 58)
CORNER_RADIUS = 96

FONT_BOLD = "/Library/Fonts/SF-Pro-Display-Bold.otf"
FONT_SEMI = "/Library/Fonts/SF-Pro-Display-Semibold.otf"
FONT_REG = "/Library/Fonts/SF-Pro-Display-Regular.otf"

# (source, caption, output, background hex, crop_top_pct, crop_bottom_pct)
SCREENS = [
    ("01-main-list.png",          "All your moments\nin one place",        "01-hero.png",        "#FFE8D6", 0.00, 0.00),
    ("02-homescreen-widgets.png", "See what matters\nat a glance",         "02-widgets.png",     "#DCEBFF", 0.00, 0.00),
    ("03-widget-styles.png",      "Widgets, your way",                     "03-styles.png",      "#E6F4DF", 0.00, 0.00),
    ("04-calendar-import.png",    "Import birthdays\nfrom Calendar",       "04-calendar.png",    "#FFDEE0", 0.00, 0.00),
    ("05-add-edit.png",           "Create countdowns\nin a few taps",      "05-add.png",         "#FCE2E8", 0.00, 0.00),
    ("06-lock-screen.png",        "Right on your\nLock Screen",            "06-lockscreen.png",  "#DED4F5", 0.00, 0.00),
]


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    h = hex_str.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [(0, 0), (size[0] - 1, size[1] - 1)], radius=radius, fill=255
    )
    return mask


def crop_shot(img: Image.Image, top_pct: float, bottom_pct: float) -> Image.Image:
    w, h = img.size
    top = int(h * top_pct)
    bottom = h - int(h * bottom_pct)
    return img.crop((0, top, w, bottom))


def compose(
    src: Path,
    caption: str,
    out: Path,
    bg_hex: str,
    crop_top_pct: float,
    crop_bottom_pct: float,
    width: int = 1290,
    height: int = 2796,
) -> None:
    bg = hex_to_rgb(bg_hex)
    canvas = Image.new("RGB", (width, height), bg)

    # Caption — bold, dark on tint, 2 lines max (split on \n)
    caption_font = load_font(FONT_BOLD, 108)
    line_height = int(108 * 1.08)
    lines = caption.split("\n")

    caption_top = 180
    draw = ImageDraw.Draw(canvas)
    for i, line in enumerate(lines):
        w_line = caption_font.getlength(line)
        x = (width - w_line) / 2
        y = caption_top + i * line_height
        draw.text((x, y), line, font=caption_font, fill=INK)

    caption_bottom = caption_top + len(lines) * line_height

    # Screenshot area
    top_gap = 80
    bottom_margin = 100
    screenshot_top = caption_bottom + top_gap
    max_h = height - screenshot_top - bottom_margin
    target_w = 1050

    shot = Image.open(src).convert("RGB")
    shot = crop_shot(shot, crop_top_pct, crop_bottom_pct)
    # Fit by width; shrink if too tall
    ratio = target_w / shot.width
    new_w = target_w
    new_h = int(shot.height * ratio)
    if new_h > max_h:
        new_h = max_h
        new_w = int(shot.width * (new_h / shot.height))
    shot = shot.resize((new_w, new_h), Image.LANCZOS)

    # Rounded corners
    mask = rounded_mask(shot.size, CORNER_RADIUS)
    rounded = Image.new("RGBA", shot.size, (0, 0, 0, 0))
    rounded.paste(shot, (0, 0), mask)

    shot_x = (width - new_w) // 2
    shot_y = screenshot_top

    # Drop shadow (soft, offset down)
    shadow_pad = 90
    shadow = Image.new("RGBA", (new_w + shadow_pad * 2, new_h + shadow_pad * 2), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle(
        [(shadow_pad, shadow_pad), (shadow_pad + new_w - 1, shadow_pad + new_h - 1)],
        radius=CORNER_RADIUS,
        fill=(0, 0, 0, 40),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=40))

    out_rgba = canvas.convert("RGBA")
    out_rgba.alpha_composite(shadow, (shot_x - shadow_pad, shot_y - shadow_pad + 30))
    out_rgba.alpha_composite(rounded, (shot_x, shot_y))
    out_rgba.convert("RGB").save(out, "PNG", optimize=True)


def main() -> None:
    FINAL_69.mkdir(parents=True, exist_ok=True)
    FINAL_65.mkdir(parents=True, exist_ok=True)

    for src_name, caption, out_name, bg, top, bottom in SCREENS:
        src = RAW / src_name
        if not src.exists():
            print(f"skip (missing): {src}")
            continue

        out69 = FINAL_69 / out_name
        compose(src, caption, out69, bg, top, bottom, width=1290, height=2796)
        print(f"wrote {out69.relative_to(ROOT)}")

        out65 = FINAL_65 / out_name
        Image.open(out69).resize((1284, 2778), Image.LANCZOS).save(out65, "PNG", optimize=True)
        print(f"wrote {out65.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
