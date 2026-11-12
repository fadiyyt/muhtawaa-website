#!/usr/bin/env python3
"""Generate source-controlled Arabic Open Graph PNGs from the tool registry."""
from pathlib import Path
import re

from PIL import Image, ImageDraw, ImageFont, features

WIDTH, HEIGHT = 1200, 630
SITE_NAME = "محتوى أدوات"
PALETTE = {
    "calculators": (24, 166, 115),
    "dates": (21, 133, 151),
    "text": (89, 98, 186),
    "images": (195, 126, 44),
    "documents": (34, 118, 180),
}


def _font(path, size):
    return ImageFont.truetype(str(path), size, layout_engine=ImageFont.Layout.RAQM)


def _measure(draw, text, font):
    return draw.textbbox((0, 0), text, font=font, direction="rtl", language="ar")


def _wrap(draw, text, font, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and (_measure(draw, candidate, font)[2] - _measure(draw, candidate, font)[0]) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines or [""]


def _draw_wrapped(draw, text, font, right, top, max_width, fill, gap=12, max_lines=3):
    lines = _wrap(draw, text, font, max_width)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(" ،؛:.") + "…"
    y = top
    for line in lines:
        draw.text((right, y), line, font=font, fill=fill, anchor="ra", direction="rtl", language="ar")
        box = _measure(draw, line, font)
        y += max(1, box[3] - box[1]) + gap
    return y


def _arabic_digits(value):
    return str(value).translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))


def _display_title(tool):
    value = tool.get("shortName") or tool.get("name", SITE_NAME)
    replacements = {
        "QR Code": "رمز الاستجابة السريعة",
        "QR": "الرمز السريع",
        "BMI": "",
        "JSON": "البيانات",
    }
    for old, new in replacements.items():
        value = re.sub(re.escape(old), new, value, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", value).strip(" —-") or tool.get("name", SITE_NAME)


def _draw_card(path, title, category, subtitle, color, arabic_font):
    regular = _font(arabic_font, 29)
    medium = _font(arabic_font, 34)
    bold = _font(arabic_font, 66)
    image = Image.new("RGB", (WIDTH, HEIGHT), "#f4f8f6")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((34, 34, 1166, 596), radius=34, fill="#ffffff", outline="#d9e7e0", width=2)
    draw.rounded_rectangle((34, 34, 1166, 50), radius=8, fill=color)

    # Brand mark, drawn as geometry so it is independent of icon fonts.
    draw.ellipse((1016, 86, 1128, 198), fill="#e2f6ee")
    cx, cy = 1072, 142
    draw.polygon([(cx, cy - 25), (cx + 8, cy - 8), (cx + 25, cy), (cx + 8, cy + 8),
                  (cx, cy + 25), (cx - 8, cy + 8), (cx - 25, cy), (cx - 8, cy - 8)], fill=color)
    draw.text((986, 144), SITE_NAME, font=medium, fill="#102a43", anchor="ra", direction="rtl", language="ar")

    label = category or "أدوات عربية مجانية"
    draw.rounded_rectangle((848, 222, 1110, 272), radius=22, fill="#edf7f2")
    draw.text((1088, 231), label, font=regular, fill="#087f5b", anchor="ra", direction="rtl", language="ar")

    title_font = bold
    lines = _wrap(draw, title, title_font, 1010)
    if len(lines) > 2:
        title_font = _font(arabic_font, 56)
        lines = _wrap(draw, title, title_font, 1010)
    y = 312
    y = _draw_wrapped(draw, title, title_font, 1100, y, 1010, "#102a43", gap=20, max_lines=3)

    if subtitle:
        draw.text((1100, min(496, y + 16)), subtitle, font=regular, fill="#486581", anchor="ra", direction="rtl", language="ar")
    draw.line((94, 526, 1100, 526), fill="#e3ece7", width=2)
    draw.text((1100, 540), "أدوات واضحة، ونتائج مباشرة", font=regular, fill="#486581", anchor="ra", direction="rtl", language="ar")
    image.save(path, format="PNG", optimize=True, compress_level=9)


def generate_og_images(data, root):
    """Write a general share card plus one 1200x630 card per tool and category."""
    if not features.check("raqm"):
        raise RuntimeError("Pillow must include libraqm to shape Arabic text correctly.")
    font_path = root / "assets" / "fonts" / "Cairo-Arabic.woff2"
    if not font_path.exists():
        raise FileNotFoundError(f"Missing local Arabic Cairo font: {font_path}")

    base = root / "assets" / "images" / "og"
    (base / "tools").mkdir(parents=True, exist_ok=True)
    (base / "categories").mkdir(parents=True, exist_ok=True)
    generic = PALETTE["calculators"]
    _draw_card(base / "site.png", "أدوات وحاسبات عربية", "مجانًا وبلا تسجيل", "أدوات عملية من محتوى أدوات", generic, font_path)

    categories = {item["slug"]: item["name"] for item in data.get("categories", [])}
    for tool in data.get("tools", []):
        category = categories.get(tool.get("category"), "أدوات عربية")
        color = PALETTE.get(tool.get("category"), generic)
        title = _display_title(tool)
        subtitle = "أداة عربية مجانية من محتوى أدوات"
        _draw_card(base / "tools" / f"{tool['slug']}.png", title, category, subtitle, color, font_path)

    for category in data.get("categories", []):
        color = PALETTE.get(category["slug"], generic)
        count = sum(1 for tool in data.get("tools", []) if tool.get("category") == category["slug"])
        subtitle = "أداة عربية عملية" if count == 1 else f"{_arabic_digits(count)} أدوات عربية عملية"
        _draw_card(base / "categories" / f"{category['slug']}.png", category["name"], "تصنيف الأدوات", subtitle, color, font_path)
    return 1 + len(data.get("tools", [])) + len(data.get("categories", []))
