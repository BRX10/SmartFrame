"""Utilitaires partages entre les masques.

Bonnes pratiques e-paper appliquees :
  - Contraste max : texte noir pur (#000) sur blanc pur (#FFF)
  - Pas de gris pour le texte (ratio e-paper ~10:1 vs LCD ~1000:1)
  - Hierarchie par taille + graisse : titre bold > artiste regular > album light
  - Espacement genereux (line-height 1.4x minimum)
  - Troncature au mot (pas au caractere)
  - Pochettes : rehaussement contraste + nettete pour compenser les mid-tones e-paper
"""

import PIL.Image
import PIL.ImageFont
import PIL.ImageDraw
from PIL import ImageEnhance

PADDING = 24


def load_font(size):
    """Charge DejaVuSans Bold."""
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    ]:
        try:
            return PIL.ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    return PIL.ImageFont.load_default()


def load_font_regular(size):
    """Charge DejaVuSans Regular."""
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
    ]:
        try:
            return PIL.ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    return PIL.ImageFont.load_default()


def load_font_italic(size):
    """Charge DejaVuSans Oblique (italic). Fallback sur regular."""
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Oblique.ttf",
    ]:
        try:
            return PIL.ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    return load_font_regular(size)


def text_width(draw, text, font):
    """Largeur d'un texte en pixels."""
    if not text:
        return 0
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def text_height(draw, text, font):
    """Hauteur d'un texte en pixels."""
    if not text:
        return 0
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[3] - bbox[1]


def wrap_text(draw, text, font, max_width, max_lines=2):
    """Decoupe le texte en lignes, coupure au mot, ellipsis sur la derniere.

    Returns:
        list[str] — lignes (1 a max_lines)
    """
    if not text:
        return [""]

    # Si ca tient sur une ligne, retour direct
    if text_width(draw, text, font) <= max_width:
        return [text]

    words = text.split()
    lines = []
    current = ""

    for word in words:
        test = f"{current} {word}".strip() if current else word
        if text_width(draw, test, font) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word

            if len(lines) >= max_lines - 1:
                # Derniere ligne : ajouter le reste avec ellipsis
                remaining = " ".join(words[words.index(word):])
                truncated = _truncate_word(draw, remaining, font, max_width)
                lines.append(truncated)
                return lines[:max_lines]

    if current:
        lines.append(current)

    return lines[:max_lines]


def _truncate_word(draw, text, font, max_width):
    """Tronque un texte avec '...' en coupant au mot."""
    if text_width(draw, text, font) <= max_width:
        return text

    words = text.split()
    while len(words) > 1:
        words = words[:-1]
        candidate = " ".join(words) + "..."
        if text_width(draw, candidate, font) <= max_width:
            return candidate

    # Un seul mot trop long : tronquer au caractere
    while len(text) > 3:
        text = text[:-1]
        if text_width(draw, text + "...", font) <= max_width:
            return text + "..."
    return text[:3] + "..."


def truncate_text(draw, text, font, max_width):
    """Tronque avec '...' si trop large (retro-compatible, 1 ligne)."""
    if not text:
        return ""
    if text_width(draw, text, font) <= max_width:
        return text
    return _truncate_word(draw, text, font, max_width)


def draw_text_block(draw, lines, font, x, y, fill=(0, 0, 0), line_height=None):
    """Dessine plusieurs lignes de texte. Retourne y apres le bloc."""
    if line_height is None:
        line_height = int(text_height(draw, "Ag", font) * 1.4)
    for line in lines:
        draw.text((x, y), line, fill=fill, font=font)
        y += line_height
    return y


def draw_text_block_centered(draw, lines, font, center_x, y, fill=(0, 0, 0), line_height=None):
    """Dessine plusieurs lignes centrees horizontalement."""
    if line_height is None:
        line_height = int(text_height(draw, "Ag", font) * 1.4)
    for line in lines:
        w = text_width(draw, line, font)
        draw.text((center_x - w // 2, y), line, fill=fill, font=font)
        y += line_height
    return y


def draw_placeholder(draw, x, y, size):
    """Dessine un placeholder carre avec note de musique."""
    draw.rectangle(
        [x, y, x + size, y + size],
        fill=(240, 240, 240), outline=(200, 200, 200), width=2
    )
    note_font = load_font(min(80, size // 4))
    draw.text(
        (x + size // 2, y + size // 2),
        "♪", fill=(200, 200, 200), font=note_font, anchor="mm"
    )


def paste_artwork(img, draw, artwork, x, y, size, border=True):
    """Redimensionne, rehausse contraste, grayscale, colle la pochette."""
    if artwork:
        art = artwork.resize((size, size), PIL.Image.LANCZOS)
        # Rehaussement pour e-paper : contraste + nettete
        art = ImageEnhance.Contrast(art).enhance(1.4)
        art = ImageEnhance.Sharpness(art).enhance(1.2)
        art = art.convert('L')
        if border:
            draw.rectangle(
                [x - 2, y - 2, x + size + 1, y + size + 1],
                outline=(0, 0, 0), width=2
            )
        img.paste(art.convert('RGB'), (x, y))
    else:
        draw_placeholder(draw, x, y, size)


def format_album_year(album, enrichment=None):
    """Combine album + annee si disponible. Ex: 'Night Swim (2014)'."""
    if not album:
        return ""
    year = ""
    if enrichment and enrichment.get("year"):
        year = enrichment["year"]
    if year:
        return f"{album} ({year})"
    return album


def format_tags(enrichment, max_tags=3):
    """Retourne les tags Last.fm formattés. Ex: 'indie · pop · rock'."""
    if not enrichment:
        return ""
    tags = enrichment.get("tags", [])
    if not tags:
        return ""
    return " · ".join(tags[:max_tags])


# ── Icones decoratives (shapes PIL, pas de font icon) ──────────────────────

def draw_icon_play(draw, cx, cy, size=16):
    """Triangle play rempli noir. cx,cy = centre."""
    h = size
    w = int(size * 0.85)
    draw.polygon([
        (cx - w // 2, cy - h // 2),
        (cx - w // 2, cy + h // 2),
        (cx + w // 2, cy),
    ], fill=(0, 0, 0))


def draw_icon_heart(draw, cx, cy, size=14):
    """Coeur vide (outline noir). cx,cy = centre."""
    s = size / 2
    # Dessiner avec des arcs et lignes — approximation polygonale
    import math
    pts = []
    # Lobe gauche
    for a in range(0, 180, 10):
        rad = math.radians(a)
        pts.append((
            cx - s / 2 + (s / 2) * math.cos(rad),
            cy - s / 3 - (s / 2) * math.sin(rad)
        ))
    # Lobe droit
    for a in range(0, 180, 10):
        rad = math.radians(a)
        pts.append((
            cx + s / 2 + (s / 2) * math.cos(rad),
            cy - s / 3 - (s / 2) * math.sin(rad)
        ))
    # Pointe basse
    pts.append((cx, cy + s))
    draw.polygon(pts, outline=(0, 0, 0), fill=None)


def draw_icon_row(draw, x, y, size=14, gap=12):
    """Dessine la rangee d'icones decoratives : ▶  ♡. Retourne x apres."""
    draw_icon_play(draw, x + size // 2, y + size // 2, size)
    x += size + gap
    draw_icon_heart(draw, x + size // 2, y + size // 2, size)
    return x + size
