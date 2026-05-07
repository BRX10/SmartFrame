"""Masque "Poster" — style affiche N&B optimise e-paper.

Paysage : pochette a gauche, texte a droite, barre decorative.
Portrait : pochette en haut centree, texte en dessous.

Hierarchie visuelle :
  Titre (bold 40px, 2 lignes max) > Artiste (regular 26px) >
  Album + annee (regular 18px) > Tags (regular 14px) >
  Hook phrase (italic 16px, citation)

Icones decoratives : play ▶ + coeur ♡ en bas.
Tout le texte en noir pur pour contraste max sur e-paper.
"""

import PIL.Image
import PIL.ImageDraw
from resources.music_masks._common import (
    PADDING, load_font, load_font_regular, load_font_italic,
    wrap_text, truncate_text, draw_text_block, paste_artwork,
    format_album_year, format_tags, draw_icon_row
)


def render_landscape(title, artist, album, artwork, width=800, height=480, enrichment=None):
    img = PIL.Image.new('RGB', (width, height), (255, 255, 255))
    draw = PIL.ImageDraw.Draw(img)

    # Pochette a gauche
    art_size = min(height - 2 * PADDING, 340)
    art_x = PADDING
    art_y = (height - art_size) // 2
    text_x = art_x + art_size + PADDING + 10
    text_max_w = width - text_x - PADDING

    paste_artwork(img, draw, artwork, art_x, art_y, art_size)

    # Fonts
    ft = load_font(40)
    fa = load_font_regular(26)
    fb = load_font_regular(18)
    ftags = load_font_regular(14)
    fh = load_font_italic(16)

    # Preparer le contenu
    title_lines = wrap_text(draw, title or "Titre inconnu", ft, text_max_w, max_lines=2)
    album_year = format_album_year(album, enrichment)
    tags = format_tags(enrichment, max_tags=3)
    hook = enrichment.get("hook_phrase", "") if enrichment else ""
    hook_lines = wrap_text(draw, f"« {hook} »", fh, text_max_w, max_lines=2) if hook else []

    # Calcul hauteurs pour centrage vertical
    title_h = len(title_lines) * 56
    artist_h = 36
    album_h = 28 if album_year else 0
    tags_h = 22 if tags else 0
    hook_h = len(hook_lines) * 24 + 12 if hook_lines else 0
    icons_h = 24

    total_h = title_h + 14 + artist_h + (14 + album_h if album_year else 0) + (8 + tags_h if tags else 0) + hook_h + 16 + icons_h
    ty = max(PADDING, (height - total_h) // 2)

    # Titre (bold, noir, 2 lignes max)
    ty = draw_text_block(draw, title_lines, ft, text_x, ty, fill=(0, 0, 0), line_height=56)
    ty += 14

    # Artiste (regular, noir)
    draw.text((text_x, ty), truncate_text(draw, artist or "Artiste inconnu", fa, text_max_w),
              fill=(0, 0, 0), font=fa)
    ty += artist_h + 14

    # Album + annee
    if album_year:
        draw.text((text_x, ty), truncate_text(draw, album_year, fb, text_max_w),
                  fill=(0, 0, 0), font=fb)
        ty += album_h

    # Tags Last.fm
    if tags:
        ty += 8
        draw.text((text_x, ty), truncate_text(draw, tags, ftags, text_max_w),
                  fill=(0, 0, 0), font=ftags)
        ty += tags_h

    # Hook phrase (italic, citation)
    if hook_lines:
        ty += 12
        ty = draw_text_block(draw, hook_lines, fh, text_x, ty, fill=(0, 0, 0), line_height=24)

    # Icones decoratives + barre
    icons_y = height - PADDING - 16
    draw_icon_row(draw, text_x, icons_y, size=14, gap=12)

    bar_y = height - PADDING - 4
    bar_start = text_x + 50
    draw.rectangle([bar_start, bar_y, text_x + text_max_w, bar_y + 3], fill=(200, 200, 200))
    draw.rectangle([bar_start, bar_y, bar_start + int((text_max_w - 50) * 0.35), bar_y + 3], fill=(0, 0, 0))

    return img


def render_portrait(title, artist, album, artwork, width=480, height=800, enrichment=None):
    img = PIL.Image.new('RGB', (width, height), (255, 255, 255))
    draw = PIL.ImageDraw.Draw(img)

    # Pochette en haut centree
    art_size = width - 2 * PADDING
    art_x = PADDING
    art_y = PADDING

    paste_artwork(img, draw, artwork, art_x, art_y, art_size)

    ty = art_y + art_size + PADDING
    text_max_w = width - 2 * PADDING

    # Fonts
    ft = load_font(36)
    fa = load_font_regular(24)
    fb = load_font_regular(18)
    ftags = load_font_regular(13)
    fh = load_font_italic(16)

    # Titre (bold, 2 lignes max)
    title_lines = wrap_text(draw, title or "Titre inconnu", ft, text_max_w, max_lines=2)
    ty = draw_text_block(draw, title_lines, ft, PADDING, ty, fill=(0, 0, 0), line_height=50)
    ty += 10

    # Artiste
    draw.text((PADDING, ty), truncate_text(draw, artist or "Artiste inconnu", fa, text_max_w),
              fill=(0, 0, 0), font=fa)
    ty += 34

    # Album + annee
    album_year = format_album_year(album, enrichment)
    if album_year:
        draw.text((PADDING, ty), truncate_text(draw, album_year, fb, text_max_w),
                  fill=(0, 0, 0), font=fb)
        ty += 28

    # Tags
    tags = format_tags(enrichment, max_tags=3)
    if tags:
        ty += 4
        draw.text((PADDING, ty), truncate_text(draw, tags, ftags, text_max_w),
                  fill=(0, 0, 0), font=ftags)
        ty += 20

    # Hook phrase
    hook = enrichment.get("hook_phrase", "") if enrichment else ""
    if hook:
        ty += 10
        hook_lines = wrap_text(draw, f"« {hook} »", fh, text_max_w, max_lines=2)
        draw_text_block(draw, hook_lines, fh, PADDING, ty, fill=(0, 0, 0), line_height=24)

    # Icones decoratives en bas
    icons_y = height - PADDING - 16
    draw_icon_row(draw, PADDING, icons_y, size=14, gap=12)

    return img
