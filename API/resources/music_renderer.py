"""Dispatcher pour le rendu "Now Playing".

Delegue au masque choisi (poster, minimal, fullart...) selon l'orientation
du cadre et le masque configure. Telecharge la pochette une seule fois.
"""

import io
import logging
import requests
import PIL.Image
from resources.music_masks import MASKS, DEFAULT_MASK

logger = logging.getLogger(__name__)


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


def render_now_playing(title, artist, album=None, artwork_url=None,
                       width=800, height=480, mask=None, display_scale=100):
    """Point d'entree unique pour generer une image Now Playing.

    Args:
        title, artist, album: metadonnees du morceau
        artwork_url: URL de la pochette (telechargee ici)
        width, height: dimensions du cadre
        mask: id du masque (defaut: "poster")
        display_scale: % de l'ecran utilise (50-100, defaut 100)

    Returns:
        PIL.Image en mode RGB
    """
    mask_id = mask or DEFAULT_MASK
    mask_module = MASKS.get(mask_id)
    if not mask_module:
        logger.warning(f"[MUSIC] Masque inconnu '{mask_id}', fallback poster")
        mask_module = MASKS[DEFAULT_MASK]

    artwork = _download_artwork(artwork_url)
    orientation = "landscape" if width >= height else "portrait"

    # Appliquer le scale : rendre a une taille reduite puis centrer
    scale = max(50, min(100, display_scale or 100))

    if scale < 100:
        scaled_w = int(width * scale / 100)
        scaled_h = int(height * scale / 100)

        if orientation == "portrait":
            inner = mask_module.render_portrait(title, artist, album, artwork, scaled_w, scaled_h)
        else:
            inner = mask_module.render_landscape(title, artist, album, artwork, scaled_w, scaled_h)

        # Centrer sur un canvas blanc pleine taille
        canvas = PIL.Image.new("RGB", (width, height), (255, 255, 255))
        offset_x = (width - scaled_w) // 2
        offset_y = (height - scaled_h) // 2
        canvas.paste(inner, (offset_x, offset_y))
        return canvas
    else:
        if orientation == "portrait":
            return mask_module.render_portrait(title, artist, album, artwork, width, height)
        else:
            return mask_module.render_landscape(title, artist, album, artwork, width, height)
