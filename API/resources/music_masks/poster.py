"""Masque "Poster" — style affiche Spotify N&B.

Paysage : pochette a gauche, texte a droite, barre decorative.
Portrait : pochette en haut centree, texte en dessous.
"""

import PIL.Image
import PIL.ImageDraw
from resources.music_masks._common import (
    PADDING, load_font, load_font_regular, truncate_text, paste_artwork
)


def render_landscape(title, artist, album, artwork, width=800, height=480):
    img = PIL.Image.new('RGB', (width, height), (255, 255, 255))
    draw = PIL.ImageDraw.Draw(img)

    art_size = min(height - 2 * PADDING, 340)
    art_x = PADDING
    art_y = (height - art_size) // 2
    text_x = art_x + art_size + PADDING + 10
    text_max_w = width - text_x - PADDING

    paste_artwork(img, draw, artwork, art_x, art_y, art_size)

    ft = load_font(36)
    fa = load_font_regular(24)
    fb = load_font_regular(18)

    lines_h = 36 + 12 + 24 + (12 + 18 if album else 0)
    ty = (height - lines_h) // 2

    draw.text((text_x, ty), truncate_text(draw, title or "Titre inconnu", ft, text_max_w),
              fill=(0, 0, 0), font=ft)
    ty += 48

    draw.text((text_x, ty), truncate_text(draw, artist or "Artiste inconnu", fa, text_max_w),
              fill=(60, 60, 60), font=fa)
    ty += 36

    if album:
        draw.text((text_x, ty), truncate_text(draw, album, fb, text_max_w),
                  fill=(120, 120, 120), font=fb)
        ty += 38

    # Barre decorative
    draw.rectangle([text_x, ty + 10, text_x + text_max_w, ty + 14], fill=(200, 200, 200))
    draw.rectangle([text_x, ty + 10, text_x + int(text_max_w * 0.35), ty + 14], fill=(0, 0, 0))

    # Label
    lf = load_font_regular(12)
    draw.text((width - PADDING, PADDING), "NOW PLAYING", fill=(160, 160, 160), font=lf, anchor="ra")

    return img


def render_portrait(title, artist, album, artwork, width=480, height=800):
    img = PIL.Image.new('RGB', (width, height), (255, 255, 255))
    draw = PIL.ImageDraw.Draw(img)

    art_size = width - 2 * PADDING
    art_x = PADDING
    art_y = PADDING + 30

    paste_artwork(img, draw, artwork, art_x, art_y, art_size)

    ty = art_y + art_size + PADDING
    text_max_w = width - 2 * PADDING
    ft = load_font(36)
    fa = load_font_regular(24)
    fb = load_font_regular(18)

    draw.text((PADDING, ty), truncate_text(draw, title or "Titre inconnu", ft, text_max_w),
              fill=(0, 0, 0), font=ft)
    ty += 46

    draw.text((PADDING, ty), truncate_text(draw, artist or "Artiste inconnu", fa, text_max_w),
              fill=(60, 60, 60), font=fa)
    ty += 34

    if album:
        draw.text((PADDING, ty), truncate_text(draw, album, fb, text_max_w),
                  fill=(120, 120, 120), font=fb)

    lf = load_font_regular(12)
    draw.text((width // 2, PADDING // 2 + 10), "NOW PLAYING", fill=(160, 160, 160), font=lf, anchor="mm")

    return img
