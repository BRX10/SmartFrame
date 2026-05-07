"""Masque "Full Art" — pochette plein ecran, texte en overlay.

La pochette remplit tout l'ecran en niveaux de gris avec rehaussement contraste.
Un bandeau blanc semi-opaque (80%) en bas porte le texte.
Texte noir pur. Pas de "NOW PLAYING".
"""

import PIL.Image
import PIL.ImageDraw
from PIL import ImageEnhance
from resources.music_masks._common import (
    PADDING, load_font, load_font_regular, load_font_italic,
    wrap_text, truncate_text, draw_text_block, format_album_year
)


def _render(title, artist, album, artwork, width, height, enrichment=None):
    img = PIL.Image.new('RGB', (width, height), (240, 240, 240))
    draw = PIL.ImageDraw.Draw(img)

    if artwork:
        # Crop et resize pour couvrir tout l'ecran
        art = artwork.copy()
        ratio_target = width / height
        ratio_art = art.width / art.height
        if ratio_art > ratio_target:
            new_w = int(art.height * ratio_target)
            left = (art.width - new_w) // 2
            art = art.crop((left, 0, left + new_w, art.height))
        else:
            new_h = int(art.width / ratio_target)
            top = (art.height - new_h) // 2
            art = art.crop((0, top, art.width, top + new_h))
        art = art.resize((width, height), PIL.Image.LANCZOS)
        # Rehaussement pour e-paper
        art = ImageEnhance.Contrast(art).enhance(1.4)
        art = ImageEnhance.Sharpness(art).enhance(1.2)
        art = art.convert('L')
        img.paste(art.convert('RGB'), (0, 0))
        draw = PIL.ImageDraw.Draw(img)
    else:
        note_font = load_font(min(200, height // 3))
        draw.text((width // 2, height // 2 - 40), "♪",
                  fill=(210, 210, 210), font=note_font, anchor="mm")

    # Bandeau bas : fond blanc semi-opaque (80%)
    hook = enrichment.get("hook_phrase", "") if enrichment else ""
    album_year = format_album_year(album, enrichment)

    # Calculer la hauteur du bandeau selon le contenu
    band_lines = 2  # titre + artiste minimum
    if album_year:
        band_lines += 1
    if hook:
        band_lines += 1
    band_h = max(90, PADDING * 2 + band_lines * 36)
    band_y = height - band_h

    overlay = PIL.Image.new('RGB', (width, band_h), (255, 255, 255))
    band_region = img.crop((0, band_y, width, height))
    blended = PIL.Image.blend(band_region, overlay, 0.8)
    img.paste(blended, (0, band_y))
    draw = PIL.ImageDraw.Draw(img)

    # Fonts
    ft = load_font(32)
    fa = load_font_regular(22)
    fb = load_font_regular(16)
    fh = load_font_italic(14)
    text_max_w = width - 2 * PADDING

    ty = band_y + PADDING // 2

    # Titre (2 lignes max)
    title_lines = wrap_text(draw, title or "Titre inconnu", ft, text_max_w, max_lines=2)
    ty = draw_text_block(draw, title_lines, ft, PADDING, ty, fill=(0, 0, 0), line_height=44)
    ty += 4

    # Artiste
    draw.text((PADDING, ty), truncate_text(draw, artist or "Artiste inconnu", fa, text_max_w),
              fill=(0, 0, 0), font=fa)
    ty += 30

    # Album + annee
    if album_year:
        draw.text((PADDING, ty), truncate_text(draw, album_year, fb, text_max_w),
                  fill=(0, 0, 0), font=fb)
        ty += 24

    # Hook phrase
    if hook:
        ty += 4
        draw.text((PADDING, ty), truncate_text(draw, f"« {hook} »", fh, text_max_w),
                  fill=(0, 0, 0), font=fh)

    return img


def render_landscape(title, artist, album, artwork, width=800, height=480, enrichment=None):
    return _render(title, artist, album, artwork, width, height, enrichment=enrichment)


def render_portrait(title, artist, album, artwork, width=480, height=800, enrichment=None):
    return _render(title, artist, album, artwork, width, height, enrichment=enrichment)
