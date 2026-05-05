"""Generateur d'images "Now Playing" pour cadres e-paper.

Produit une image BMP noir & blanc optimisee pour Waveshare 7.5" (800x480).
Layout paysage :
  - Pochette album a gauche (carre, dithered N&B)
  - Titre + artiste + barre decorative a droite

Peut etre appele avec ou sans pochette (artwork_url optionnel).
"""

import io
import logging
import requests
import PIL.Image
import PIL.ImageDraw
import PIL.ImageFont

logger = logging.getLogger(__name__)

# Dimensions par defaut (Waveshare 7.5" paysage)
DEFAULT_WIDTH = 800
DEFAULT_HEIGHT = 480

# Marges et dimensions du layout
PADDING = 30
ARTWORK_SIZE = 340  # carre
ARTWORK_X = PADDING
ARTWORK_Y = (DEFAULT_HEIGHT - ARTWORK_SIZE) // 2
TEXT_X = ARTWORK_X + ARTWORK_SIZE + PADDING + 10
TEXT_MAX_WIDTH = DEFAULT_WIDTH - TEXT_X - PADDING

# Taille des polices (PIL default font si pas de TTF)
TITLE_FONT_SIZE = 36
ARTIST_FONT_SIZE = 24
ALBUM_FONT_SIZE = 18


def _load_font(size):
    """Charge une police TTF ou fallback sur la police par defaut PIL."""
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    ]
    for path in font_paths:
        try:
            return PIL.ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    # Fallback : police bitmap par defaut (pas de taille reglable)
    return PIL.ImageFont.load_default()


def _download_artwork(url, timeout=8):
    """Telecharge la pochette depuis une URL. Retourne None si echec."""
    if not url:
        return None
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        return PIL.Image.open(io.BytesIO(resp.content))
    except Exception as e:
        logger.warning(f"[MUSIC] Impossible de telecharger la pochette: {e}")
        return None


def _truncate_text(draw, text, font, max_width):
    """Tronque le texte avec '...' si trop large."""
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


def render_now_playing(title, artist, album=None, artwork_url=None,
                       width=DEFAULT_WIDTH, height=DEFAULT_HEIGHT):
    """Genere une image PIL "Now Playing" prete pour l'ecran e-paper.

    Args:
        title: Titre du morceau
        artist: Nom de l'artiste
        album: Nom de l'album (optionnel)
        artwork_url: URL de la pochette (optionnel)
        width: Largeur de l'image (defaut 800)
        height: Hauteur de l'image (defaut 480)

    Returns:
        PIL.Image en mode RGB, prete a etre convertie et envoyee.
    """
    # Image de fond blanc
    img = PIL.Image.new('RGB', (width, height), (255, 255, 255))
    draw = PIL.ImageDraw.Draw(img)

    # Recalculer les dimensions si la taille est differente du defaut
    artwork_size = min(height - 2 * PADDING, ARTWORK_SIZE)
    artwork_x = PADDING
    artwork_y = (height - artwork_size) // 2
    text_x = artwork_x + artwork_size + PADDING + 10
    text_max_width = width - text_x - PADDING

    # --- Pochette ---
    artwork = _download_artwork(artwork_url)
    if artwork:
        # Redimensionner et convertir en N&B avec dithering
        artwork = artwork.resize((artwork_size, artwork_size), PIL.Image.LANCZOS)
        artwork = artwork.convert('L')  # Niveaux de gris
        # Cadre autour de la pochette
        draw.rectangle(
            [artwork_x - 2, artwork_y - 2, artwork_x + artwork_size + 1, artwork_y + artwork_size + 1],
            outline=(0, 0, 0), width=2
        )
        img.paste(artwork.convert('RGB'), (artwork_x, artwork_y))
    else:
        # Placeholder : rectangle gris avec icone musique
        draw.rectangle(
            [artwork_x, artwork_y, artwork_x + artwork_size, artwork_y + artwork_size],
            fill=(230, 230, 230), outline=(180, 180, 180), width=2
        )
        # Note de musique simplifiee
        note_font = _load_font(80)
        draw.text(
            (artwork_x + artwork_size // 2, artwork_y + artwork_size // 2),
            "♪",
            fill=(180, 180, 180),
            font=note_font,
            anchor="mm"
        )

    # --- Textes ---
    font_title = _load_font(TITLE_FONT_SIZE)
    font_artist = _load_font(ARTIST_FONT_SIZE)
    font_album = _load_font(ALBUM_FONT_SIZE)

    # Centrage vertical des textes
    lines = 2 + (1 if album else 0)
    total_text_height = TITLE_FONT_SIZE + 12 + ARTIST_FONT_SIZE + (12 + ALBUM_FONT_SIZE if album else 0)
    text_y = (height - total_text_height) // 2

    # Titre (gras)
    title_text = _truncate_text(draw, title or "Titre inconnu", font_title, text_max_width)
    draw.text((text_x, text_y), title_text, fill=(0, 0, 0), font=font_title)
    text_y += TITLE_FONT_SIZE + 12

    # Artiste
    artist_text = _truncate_text(draw, artist or "Artiste inconnu", font_artist, text_max_width)
    draw.text((text_x, text_y), artist_text, fill=(60, 60, 60), font=font_artist)
    text_y += ARTIST_FONT_SIZE + 12

    # Album (optionnel)
    if album:
        album_text = _truncate_text(draw, album, font_album, text_max_width)
        draw.text((text_x, text_y), album_text, fill=(120, 120, 120), font=font_album)
        text_y += ALBUM_FONT_SIZE + 20

    # --- Barre decorative ---
    bar_y = text_y + 15
    bar_width = text_max_width
    # Barre de fond
    draw.rectangle(
        [text_x, bar_y, text_x + bar_width, bar_y + 4],
        fill=(200, 200, 200)
    )
    # Barre de progression (decorative, 35%)
    draw.rectangle(
        [text_x, bar_y, text_x + int(bar_width * 0.35), bar_y + 4],
        fill=(0, 0, 0)
    )

    # --- Label "NOW PLAYING" en haut a droite ---
    label_font = _load_font(12)
    draw.text(
        (width - PADDING, PADDING),
        "NOW PLAYING",
        fill=(160, 160, 160),
        font=label_font,
        anchor="ra"
    )

    return img


def render_now_playing_portrait(title, artist, album=None, artwork_url=None,
                                width=480, height=800):
    """Layout portrait : pochette en haut, texte en bas."""
    img = PIL.Image.new('RGB', (width, height), (255, 255, 255))
    draw = PIL.ImageDraw.Draw(img)

    artwork_size = width - 2 * PADDING
    artwork_x = PADDING
    artwork_y = PADDING + 30  # espace pour "NOW PLAYING"

    # Pochette
    artwork = _download_artwork(artwork_url)
    if artwork:
        artwork = artwork.resize((artwork_size, artwork_size), PIL.Image.LANCZOS)
        artwork = artwork.convert('L')
        draw.rectangle(
            [artwork_x - 2, artwork_y - 2, artwork_x + artwork_size + 1, artwork_y + artwork_size + 1],
            outline=(0, 0, 0), width=2
        )
        img.paste(artwork.convert('RGB'), (artwork_x, artwork_y))
    else:
        draw.rectangle(
            [artwork_x, artwork_y, artwork_x + artwork_size, artwork_y + artwork_size],
            fill=(230, 230, 230), outline=(180, 180, 180), width=2
        )
        note_font = _load_font(100)
        draw.text(
            (width // 2, artwork_y + artwork_size // 2),
            "♪", fill=(180, 180, 180), font=note_font, anchor="mm"
        )

    # Textes sous la pochette
    text_y = artwork_y + artwork_size + PADDING
    text_max_width = width - 2 * PADDING
    font_title = _load_font(TITLE_FONT_SIZE)
    font_artist = _load_font(ARTIST_FONT_SIZE)
    font_album = _load_font(ALBUM_FONT_SIZE)

    title_text = _truncate_text(draw, title or "Titre inconnu", font_title, text_max_width)
    draw.text((PADDING, text_y), title_text, fill=(0, 0, 0), font=font_title)
    text_y += TITLE_FONT_SIZE + 10

    artist_text = _truncate_text(draw, artist or "Artiste inconnu", font_artist, text_max_width)
    draw.text((PADDING, text_y), artist_text, fill=(60, 60, 60), font=font_artist)
    text_y += ARTIST_FONT_SIZE + 10

    if album:
        album_text = _truncate_text(draw, album, font_album, text_max_width)
        draw.text((PADDING, text_y), album_text, fill=(120, 120, 120), font=font_album)

    # Label
    label_font = _load_font(12)
    draw.text(
        (width // 2, PADDING // 2 + 10),
        "NOW PLAYING",
        fill=(160, 160, 160),
        font=label_font,
        anchor="mm"
    )

    return img
