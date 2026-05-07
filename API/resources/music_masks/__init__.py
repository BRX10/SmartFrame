"""Registry des masques visuels pour le mode musique Now Playing.

Chaque masque est un module avec deux fonctions :
  render_landscape(title, artist, album, artwork, width, height, enrichment=None) -> PIL.Image
  render_portrait(title, artist, album, artwork, width, height, enrichment=None) -> PIL.Image

artwork est un PIL.Image deja telecharge (ou None).
enrichment est un dict optionnel avec year, tags, hook_phrase, etc. (V4-F).
"""

from resources.music_masks import poster, minimal, fullart

MASKS = {
    "poster": poster,
    "minimal": minimal,
    "fullart": fullart,
}

DEFAULT_MASK = "poster"


def get_mask_ids():
    """Retourne la liste des masques disponibles."""
    return list(MASKS.keys())
