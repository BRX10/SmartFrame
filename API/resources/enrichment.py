"""Service d'enrichissement de metadonnees musicales (V4-F).

Pipeline : cache MongoDB → collecte multi-sources → inference Groq → cache.

Sources externes :
  - LRCLIB : paroles (gratuit, sans cle)
  - Last.fm : tags + listeners (cle API gratuite)
  - TheAudioDB : annee de sortie (gratuit)
  - Groq : extraction de hook phrase via LLM leger

Usage :
    from resources.enrichment import enrich_track
    data = enrich_track("Open Season", "Josef Salvat", "Night Swim")
    # -> {"year": "2014", "tags": ["indie", "pop"], "hook_phrase": "...", ...}
"""

import logging
import requests
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from slugify import slugify
from database.models import TrackMetadata, AppSettings

logger = logging.getLogger(__name__)

# Timeouts reseau (connect, read) en secondes
_FETCH_TIMEOUT = (3, 5)
_GROQ_TIMEOUT = (3, 10)


# ── Slug ────────────────────────────────────────────────────────────────────

def _make_slug(artist, title, album):
    """Genere un slug unique artist__title__album."""
    parts = [
        slugify(artist or "", lowercase=True),
        slugify(title or "", lowercase=True),
        slugify(album or "", lowercase=True),
    ]
    return "__".join(parts)


# ── Sources externes ────────────────────────────────────────────────────────

def _fetch_lrclib(title, artist, album):
    """LRCLIB : paroles en texte brut."""
    try:
        params = {"artist_name": artist, "track_name": title}
        if album:
            params["album_name"] = album
        resp = requests.get("https://lrclib.net/api/get", params=params, timeout=_FETCH_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            lyrics = data.get("plainLyrics") or ""
            if lyrics.strip():
                return {"lyrics": lyrics.strip(), "available": True}
        return {"lyrics": "", "available": False}
    except Exception as e:
        logger.debug(f"[ENRICH] LRCLIB echoue: {e}")
        return {"lyrics": "", "available": False}


def _fetch_lastfm(title, artist):
    """Last.fm : tags + listeners."""
    api_key = AppSettings.get_value("lastfm_api_key")
    if not api_key:
        return {"tags": [], "listeners": 0}
    try:
        resp = requests.get("https://ws.audioscrobbler.com/2.0/", params={
            "method": "track.getInfo",
            "api_key": api_key,
            "artist": artist,
            "track": title,
            "format": "json",
        }, timeout=_FETCH_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            track = data.get("track", {})
            tags_raw = track.get("toptags", {}).get("tag", [])
            tags = [t["name"] for t in tags_raw[:5] if isinstance(t, dict) and "name" in t]
            listeners = int(track.get("listeners", 0))
            return {"tags": tags, "listeners": listeners}
        return {"tags": [], "listeners": 0}
    except Exception as e:
        logger.debug(f"[ENRICH] Last.fm echoue: {e}")
        return {"tags": [], "listeners": 0}


def _fetch_audiodb(title, artist):
    """TheAudioDB : annee de sortie."""
    try:
        resp = requests.get("https://theaudiodb.com/api/v1/json/2/searchtrack.php", params={
            "s": artist,
            "t": title,
        }, timeout=_FETCH_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            tracks = data.get("track") or []
            if tracks and isinstance(tracks, list):
                year = tracks[0].get("intYearReleased") or ""
                return {"year": str(year).strip() if year else ""}
        return {"year": ""}
    except Exception as e:
        logger.debug(f"[ENRICH] TheAudioDB echoue: {e}")
        return {"year": ""}


# ── Groq LLM ────────────────────────────────────────────────────────────────

_DEFAULT_SYSTEM_PROMPT = (
    "Tu es un curateur musical. On te donne les paroles d'un morceau. "
    "Extrais UNE phrase percutante (hook) de ces paroles. "
    "Contraintes strictes : 60 caracteres max, pas de guillemets, "
    "pas de preambule comme 'Voici la phrase', "
    "respecte la langue originale des paroles. "
    "Reponds UNIQUEMENT avec la phrase extraite."
)


def _extract_hook(lyrics, title, artist):
    """Appelle Groq pour extraire une hook phrase des paroles."""
    api_key = AppSettings.get_value("groq_api_key")
    if not api_key:
        logger.warning("[ENRICH] Groq API key non configuree")
        return None, None

    model = AppSettings.get_value("groq_model_name", "llama3-8b-8192")
    system_prompt = AppSettings.get_value("groq_system_prompt", _DEFAULT_SYSTEM_PROMPT)
    temperature = float(AppSettings.get_value("groq_temperature", "0.3"))

    user_msg = f"Artiste : {artist}\nTitre : {title}\n\nParoles :\n{lyrics[:3000]}"

    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": temperature,
                "max_tokens": 80,
            },
            timeout=_GROQ_TIMEOUT,
        )
        if resp.status_code == 200:
            data = resp.json()
            hook = data["choices"][0]["message"]["content"].strip()
            # Nettoyage : retirer guillemets eventuels
            hook = hook.strip('"').strip("'").strip("«").strip("»")
            if len(hook) > 80:
                hook = hook[:77] + "..."
            logger.info(f"[ENRICH] Hook: {hook} (model={model})")
            return hook, model
        else:
            logger.warning(f"[ENRICH] Groq {resp.status_code}: {resp.text[:200]}")
            return None, model
    except Exception as e:
        logger.warning(f"[ENRICH] Groq echoue: {e}")
        return None, None


# ── Pipeline principal ──────────────────────────────────────────────────────

def enrich_track(title, artist, album=None):
    """Enrichit un morceau. Retourne un dict avec les donnees disponibles.

    Strategie :
      1. Cache hit (is_complete=True) → retour immediat
      2. Cache miss → collecte parallele + Groq → cache
      3. Groq echoue → PAS de cache (is_complete=False) → retry prochain passage

    Returns:
        dict avec year, tags, listeners, hook_phrase, lyrics_available, model_used
        ou dict vide si rien n'est disponible
    """
    slug = _make_slug(artist, title, album)

    # 1. Cache lookup
    cached = TrackMetadata.objects(slug=slug).first()
    if cached and cached.is_complete:
        logger.debug(f"[ENRICH] Cache hit: {slug}")
        return {
            "year": cached.year or "",
            "tags": cached.tags or [],
            "listeners": cached.listeners or 0,
            "hook_phrase": cached.hook_phrase or "",
            "lyrics_available": cached.lyrics_available or False,
            "model_used": cached.model_used or "",
        }

    # 2. Collecte parallele
    logger.info(f"[ENRICH] Cache miss, enrichissement: {artist} — {title}")
    results = {}

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(_fetch_lrclib, title, artist, album): "lrclib",
            executor.submit(_fetch_lastfm, title, artist): "lastfm",
            executor.submit(_fetch_audiodb, title, artist): "audiodb",
        }
        for future in as_completed(futures):
            source = futures[future]
            try:
                results[source] = future.result()
            except Exception as e:
                logger.warning(f"[ENRICH] {source} exception: {e}")
                results[source] = {}

    lrclib = results.get("lrclib", {})
    lastfm = results.get("lastfm", {})
    audiodb = results.get("audiodb", {})

    lyrics = lrclib.get("lyrics", "")
    lyrics_available = lrclib.get("available", False)

    # 3. Groq : extraction de hook phrase si paroles disponibles
    hook_phrase = None
    model_used = None
    is_complete = True

    if lyrics_available and lyrics:
        hook_phrase, model_used = _extract_hook(lyrics, title, artist)
        if hook_phrase is None:
            # Groq a echoue → ne pas cacher, retry au prochain passage
            is_complete = False

    # 4. Cache write (upsert)
    try:
        TrackMetadata.objects(slug=slug).update_one(
            upsert=True,
            set__title=title,
            set__artist=artist,
            set__album=album or "",
            set__year=audiodb.get("year", ""),
            set__tags=lastfm.get("tags", []),
            set__listeners=lastfm.get("listeners", 0),
            set__hook_phrase=hook_phrase or "",
            set__lyrics_available=lyrics_available,
            set__model_used=model_used or "",
            set__enriched_at=datetime.utcnow(),
            set__is_complete=is_complete,
        )
        logger.info(f"[ENRICH] Cache {'complet' if is_complete else 'partiel'}: {slug}")
    except Exception as e:
        logger.error(f"[ENRICH] Erreur cache write: {e}")

    return {
        "year": audiodb.get("year", ""),
        "tags": lastfm.get("tags", []),
        "listeners": lastfm.get("listeners", 0),
        "hook_phrase": hook_phrase or "",
        "lyrics_available": lyrics_available,
        "model_used": model_used or "",
    }
