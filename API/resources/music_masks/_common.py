"""Utilitaires partages entre les masques."""

import PIL.ImageFont
import PIL.ImageDraw

PADDING = 30


def load_font(size):
    """Charge DejaVuSans ou fallback PIL default."""
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    ]:
        try:
            return PIL.ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    return PIL.ImageFont.load_default()


def load_font_regular(size):
    """Charge DejaVuSans regular (pas bold)."""
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
    ]:
        try:
            return PIL.ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    return PIL.ImageFont.load_default()


def truncate_text(draw, text, font, max_width):
    """Tronque avec '...' si trop large."""
    if not text:
        return ""
    bbox = draw.textbbox((0, 0), text, font=font)
    if (bbox[2] - bbox[0]) <= max_width:
        return text
    while len(text) > 3:
        text = text[:-1]
        bbox = draw.textbbox((0, 0), text + "...", font=font)
        if (bbox[2] - bbox[0]) <= max_width:
            return text + "..."
    return text[:3] + "..."


def draw_placeholder(draw, x, y, size):
    """Dessine un placeholder carre gris avec note de musique."""
    draw.rectangle(
        [x, y, x + size, y + size],
        fill=(230, 230, 230), outline=(180, 180, 180), width=2
    )
    note_font = load_font(min(80, size // 4))
    draw.text(
        (x + size // 2, y + size // 2),
        "♪", fill=(180, 180, 180), font=note_font, anchor="mm"
    )


def paste_artwork(img, draw, artwork, x, y, size, border=True):
    """Redimensionne, grayscale, colle la pochette. Placeholder si None."""
    if artwork:
        art = artwork.resize((size, size), PIL.Image.LANCZOS).convert('L')
        if border:
            draw.rectangle(
                [x - 2, y - 2, x + size + 1, y + size + 1],
                outline=(0, 0, 0), width=2
            )
        img.paste(art.convert('RGB'), (x, y))
    else:
        draw_placeholder(draw, x, y, size)
