"""Masque "Minimal" — epure, beaucoup de blanc, optimise e-paper.

Paysage : petite pochette a gauche, texte a droite.
Portrait : petite pochette centree en haut, texte centre en dessous.

Pas d'album dans le mode minimal. Hook phrase si disponible.
Icone play discrète a côté du titre.
Tout en noir pur — pas de gris.
"""

import PIL.Image
import PIL.ImageDraw
from resources.music_masks._common import (
    PADDING, load_font, load_font_regular, load_font_italic,
    wrap_text, truncate_text, text_width,
    draw_text_block, draw_text_block_centered,
    paste_artwork, draw_icon_play, draw_icon_heart
)


def render_landscape(title, artist, album, artwork, width=800, height=480, enrichment=None):
    img = PIL.Image.new('RGB', (width, height), (255, 255, 255))
    draw = PIL.ImageDraw.Draw(img)

    art_size = min(180, height - 2 * PADDING)
    art_x = PADDING * 2
    art_y = (height - art_size) // 2
    text_x = art_x + art_size + PADDING * 2
    text_max_w = width - text_x - PADDING * 2

    paste_artwork(img, draw, artwork, art_x, art_y, art_size)

    # Fonts
    ft = load_font(34)
    fa = load_font_regular(22)
    fh = load_font_italic(16)

    # Titre (2 lignes max)
    title_lines = wrap_text(draw, title or "Titre inconnu", ft, text_max_w - 24, max_lines=2)
    hook = enrichment.get("hook_phrase", "") if enrichment else ""
    hook_lines = wrap_text(draw, f"« {hook} »", fh, text_max_w, max_lines=2) if hook else []

    title_h = len(title_lines) * 48
    artist_h = 32
    hook_h = len(hook_lines) * 24 + 12 if hook_lines else 0
    total_h = title_h + 12 + artist_h + hook_h

    ty = (height - total_h) // 2

    # Icone play a gauche du titre
    draw_icon_play(draw, text_x + 6, ty + 18, size=12)

    ty = draw_text_block(draw, title_lines, ft, text_x + 22, ty, fill=(0, 0, 0), line_height=48)
    ty += 12

    draw.text((text_x, ty), truncate_text(draw, artist or "Artiste inconnu", fa, text_max_w),
              fill=(0, 0, 0), font=fa)
    ty += artist_h

    # Hook phrase (italic, 2 lignes max)
    if hook_lines:
        ty += 12
        draw_text_block(draw, hook_lines, fh, text_x, ty, fill=(0, 0, 0), line_height=24)

    # Ligne fine separatrice + icones
    line_y = height - PADDING * 2
    draw.line([(PADDING * 2, line_y), (width - PADDING * 2, line_y)], fill=(0, 0, 0), width=1)

    # Coeur discret en bas a droite
    draw_icon_heart(draw, width - PADDING * 2 - 8, line_y + 12, size=12)

    return img


def render_portrait(title, artist, album, artwork, width=480, height=800, enrichment=None):
    img = PIL.Image.new('RGB', (width, height), (255, 255, 255))
    draw = PIL.ImageDraw.Draw(img)

    art_size = min(240, width - 4 * PADDING)
    art_x = (width - art_size) // 2
    art_y = height // 3 - art_size // 2

    paste_artwork(img, draw, artwork, art_x, art_y, art_size)

    text_max_w = width - 2 * PADDING
    ft = load_font(34)
    fa = load_font_regular(22)
    fh = load_font_italic(16)

    ty = art_y + art_size + PADDING * 2
    center_x = width // 2

    # Icone play centree au-dessus du titre
    draw_icon_play(draw, center_x, ty - 10, size=12)
    ty += 6

    # Titre centre (2 lignes max)
    title_lines = wrap_text(draw, title or "Titre inconnu", ft, text_max_w, max_lines=2)
    ty = draw_text_block_centered(draw, title_lines, ft, center_x, ty, fill=(0, 0, 0), line_height=48)
    ty += 10

    # Artiste centre
    a_text = truncate_text(draw, artist or "Artiste inconnu", fa, text_max_w)
    aw = text_width(draw, a_text, fa)
    draw.text((center_x - aw // 2, ty), a_text, fill=(0, 0, 0), font=fa)
    ty += 32

    # Hook phrase centree (2 lignes max)
    hook = enrichment.get("hook_phrase", "") if enrichment else ""
    if hook:
        ty += 8
        hook_lines = wrap_text(draw, f"« {hook} »", fh, text_max_w, max_lines=2)
        draw_text_block_centered(draw, hook_lines, fh, center_x, ty, fill=(0, 0, 0), line_height=24)

    # Coeur discret en bas centre
    draw_icon_heart(draw, center_x, height - PADDING - 8, size=12)

    return img
