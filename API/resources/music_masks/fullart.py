"""Masque "Full Art" — pochette plein ecran, texte en overlay.

La pochette remplit tout l'ecran en niveaux de gris.
Un bandeau semi-transparent en bas porte le titre et l'artiste.
Si pas de pochette, fond gris avec note de musique geante.
"""

import PIL.Image
import PIL.ImageDraw
from resources.music_masks._common import (
    PADDING, load_font, load_font_regular, truncate_text
)


def _render(title, artist, album, artwork, width, height):
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
        art = art.resize((width, height), PIL.Image.LANCZOS).convert('L')
        img.paste(art.convert('RGB'), (0, 0))
        draw = PIL.ImageDraw.Draw(img)
    else:
        note_font = load_font(min(200, height // 3))
        draw.text((width // 2, height // 2 - 40), "♪",
                  fill=(210, 210, 210), font=note_font, anchor="mm")

    # Bandeau bas : fond gris clair semi-opaque (simule via rectangle)
    band_h = max(90, height // 5)
    band_y = height - band_h
    overlay = PIL.Image.new('RGB', (width, band_h), (255, 255, 255))
    # Blending simple 70% blanc
    band_region = img.crop((0, band_y, width, height))
    blended = PIL.Image.blend(band_region, overlay, 0.7)
    img.paste(blended, (0, band_y))
    draw = PIL.ImageDraw.Draw(img)

    # Texte dans le bandeau
    ft = load_font(30)
    fa = load_font_regular(20)
    text_max_w = width - 2 * PADDING

    ty = band_y + PADDING // 2

    draw.text((PADDING, ty), truncate_text(draw, title or "Titre inconnu", ft, text_max_w),
              fill=(0, 0, 0), font=ft)
    ty += 38

    draw.text((PADDING, ty), truncate_text(draw, artist or "Artiste inconnu", fa, text_max_w),
              fill=(60, 60, 60), font=fa)

    # Label discret en haut
    lf = load_font_regular(10)
    draw.text((width - PADDING, PADDING // 2 + 5), "NOW PLAYING",
              fill=(180, 180, 180), font=lf, anchor="ra")

    return img


def render_landscape(title, artist, album, artwork, width=800, height=480):
    return _render(title, artist, album, artwork, width, height)


def render_portrait(title, artist, album, artwork, width=480, height=800):
    return _render(title, artist, album, artwork, width, height)
