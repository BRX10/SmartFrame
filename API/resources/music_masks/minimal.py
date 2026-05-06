"""Masque "Minimal" — epure, beaucoup de blanc.

Paysage : petite pochette a gauche, texte centre a droite.
Portrait : petite pochette centree en haut, texte centre en dessous.
"""

import PIL.Image
import PIL.ImageDraw
from resources.music_masks._common import (
    PADDING, load_font, load_font_regular, truncate_text, paste_artwork
)


def render_landscape(title, artist, album, artwork, width=800, height=480):
    img = PIL.Image.new('RGB', (width, height), (255, 255, 255))
    draw = PIL.ImageDraw.Draw(img)

    art_size = min(180, height - 2 * PADDING)
    art_x = PADDING * 2
    art_y = (height - art_size) // 2
    text_x = art_x + art_size + PADDING * 2
    text_max_w = width - text_x - PADDING * 2

    paste_artwork(img, draw, artwork, art_x, art_y, art_size)

    ft = load_font(28)
    fa = load_font_regular(20)

    # Centrage vertical titre + artiste
    ty = (height - 28 - 12 - 20) // 2

    draw.text((text_x, ty), truncate_text(draw, title or "Titre inconnu", ft, text_max_w),
              fill=(0, 0, 0), font=ft)
    ty += 40

    draw.text((text_x, ty), truncate_text(draw, artist or "Artiste inconnu", fa, text_max_w),
              fill=(100, 100, 100), font=fa)

    # Ligne fine separatrice sous le texte
    line_y = height - PADDING * 2
    draw.line([(PADDING * 2, line_y), (width - PADDING * 2, line_y)], fill=(220, 220, 220), width=1)

    # Label discret
    lf = load_font_regular(10)
    draw.text((width - PADDING * 2, line_y + 8), "NOW PLAYING", fill=(200, 200, 200), font=lf, anchor="ra")

    return img


def render_portrait(title, artist, album, artwork, width=480, height=800):
    img = PIL.Image.new('RGB', (width, height), (255, 255, 255))
    draw = PIL.ImageDraw.Draw(img)

    art_size = min(240, width - 4 * PADDING)
    art_x = (width - art_size) // 2
    art_y = height // 3 - art_size // 2

    paste_artwork(img, draw, artwork, art_x, art_y, art_size)

    text_max_w = width - 2 * PADDING
    ft = load_font(28)
    fa = load_font_regular(20)

    ty = art_y + art_size + PADDING * 2

    t = truncate_text(draw, title or "Titre inconnu", ft, text_max_w)
    tw = draw.textbbox((0, 0), t, font=ft)[2]
    draw.text(((width - tw) // 2, ty), t, fill=(0, 0, 0), font=ft)
    ty += 40

    a = truncate_text(draw, artist or "Artiste inconnu", fa, text_max_w)
    aw = draw.textbbox((0, 0), a, font=fa)[2]
    draw.text(((width - aw) // 2, ty), a, fill=(100, 100, 100), font=fa)

    lf = load_font_regular(10)
    draw.text((width // 2, PADDING), "NOW PLAYING", fill=(200, 200, 200), font=lf, anchor="mm")

    return img
