"""Service d'enrichissement de metadonnees musicales (V4-F).

Pipeline : cache MongoDB → collecte multi-sources → inference Groq → cache.

Sources externes :
  - LRCLIB : paroles (gratuit, sans cle)
  - Last.fm : tags + listeners (cle API gratuite)
  - TheAudioDB : annee de sortie (gratuit)
  - Groq : extraction de la phrase cle (modele choisi parmi ceux disponibles)

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
_FETCH_TIMEOUT = (5, 15)
_GROQ_TIMEOUT = (5, 30)


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
    """LRCLIB : paroles en texte brut. Strategie : artiste+titre d'abord, puis titre nettoyé."""
    import re
    clean_title = re.sub(r'\s*[\(\[].*?[\)\]]', '', title).strip()
    clean_title = re.sub(r'\s*-\s*(Remaster|Live|Remix|Deluxe|Bonus|Radio).*$', '', clean_title, flags=re.IGNORECASE).strip() or title

    headers = {"User-Agent": "SmartFrame/1.0 (github.com/BRX10/SmartFrame)"}

    for attempt_params in [
        {"artist_name": artist, "track_name": title},
        {"artist_name": artist, "track_name": clean_title},
    ]:
        try:
            resp = requests.get("https://lrclib.net/api/get", params=attempt_params,
                                headers=headers, timeout=_FETCH_TIMEOUT)
            logger.info(f"[ENRICH] LRCLIB: '{attempt_params['track_name']}' by '{artist}' → {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                lyrics = data.get("plainLyrics") or ""
                if lyrics.strip():
                    logger.info(f"[ENRICH] LRCLIB: paroles trouvees ({len(lyrics)} chars)")
                    return {"lyrics": lyrics.strip(), "available": True}
                else:
                    logger.info(f"[ENRICH] LRCLIB: 200 mais plainLyrics vide")
        except Exception as e:
            logger.info(f"[ENRICH] LRCLIB echoue: {e}")
            continue

    logger.info(f"[ENRICH] LRCLIB: aucune parole trouvee pour '{title}' by '{artist}'")
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
#
# Le modele n'est plus fige : on lit la liste des modeles du compte (/models),
# on essaie d'abord celui configure, puis les preferes, puis tout modele de chat
# assez grand. Un modele retire (404) ou bloque (403) est ecarte pour 6 h.
# Le LLM repond en JSON (theme + 3 lignes candidates + choix) ; on ne garde
# qu'une ligne presente mot pour mot dans les paroles.

_DEFAULT_SYSTEM_PROMPT = (
    "Tu es un curateur musical. On te donne les paroles completes d'une chanson.\n"
    "Ta tache : trouver la ligne qui resume le mieux ce que la chanson raconte, "
    "pour l'afficher seule, en citation, sur un cadre photo.\n\n"
    "Methode :\n"
    "1. Lis toutes les paroles et resume en une phrase courte le theme ou l'histoire "
    "de la chanson (dans la langue des paroles).\n"
    "2. Choisis 3 lignes candidates qui expriment ce theme. Recopie-les MOT POUR MOT "
    "depuis les paroles : n'invente rien, ne reformule pas, ne traduis pas. "
    "Tu peux reunir deux lignes consecutives si elles forment une seule idee.\n"
    "3. Choisis la meilleure : celle qui a du sens seule, sans contexte, et qui "
    "capture l'emotion ou le propos de la chanson. Le refrain n'est pas un choix "
    "automatique : prefere-le seulement s'il porte vraiment le sens.\n\n"
    "Contraintes : 60 caracteres maximum par candidate, langue originale des paroles, "
    "pas de guillemets, pas d'onomatopees (oh, yeah, na na...), pas de ligne qui ne "
    "veut rien dire hors contexte."
)

# Ajoute par le code (non modifiable depuis l'UI) pour garantir un JSON exploitable
_JSON_INSTRUCTIONS = (
    "\n\nReponds UNIQUEMENT avec un objet JSON de la forme :\n"
    '{"theme": "...", "candidates": ["...", "...", "..."], "choice": "..."}\n'
    "ou choice est l'une des candidates."
)

_DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
_PREFERRED_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"]
_NON_CHAT_MARKERS = ("whisper", "orpheus", "guard", "tts", "embed")
_MIN_CONTEXT = 16000
_MAX_HOOK_LEN = 80          # = max_length de TrackMetadata.hook_phrase
_MAX_LYRICS_CHARS = 8000
_MODELS_TTL = 6 * 3600

_models_cache = {"at": 0, "ids": []}
_rejected_models = {}       # model -> timestamp du rejet (404/403)


def _available_models(api_key):
    """Modeles de chat actifs du compte, tries par contexte decroissant (cache 6 h)."""
    import time
    if time.time() - _models_cache["at"] < _MODELS_TTL and _models_cache["ids"]:
        return _models_cache["ids"]
    try:
        resp = requests.get("https://api.groq.com/openai/v1/models",
                            headers={"Authorization": f"Bearer {api_key}"}, timeout=_FETCH_TIMEOUT)
        resp.raise_for_status()
        models = [
            m for m in resp.json().get("data", [])
            if m.get("active", True)
            and (m.get("context_window") or 0) >= _MIN_CONTEXT
            and not any(x in m["id"].lower() for x in _NON_CHAT_MARKERS)
        ]
        models.sort(key=lambda m: m.get("context_window") or 0, reverse=True)
        _models_cache.update(at=time.time(), ids=[m["id"] for m in models])
        logger.info(f"[ENRICH] Groq: modeles disponibles {_models_cache['ids']}")
    except Exception as e:
        logger.warning(f"[ENRICH] Groq: liste des modeles indisponible ({e})")
    return _models_cache["ids"]


def _candidate_models(api_key, configured):
    """Ordre d'essai : configure, preferes, puis le reste ; sans les modeles rejetes."""
    import time
    available = _available_models(api_key)
    order = [configured] + _PREFERRED_MODELS + available
    if available:
        order = [m for m in order if m in available]
    now = time.time()
    seen, result = set(), []
    for m in order:
        if m and m not in seen and now - _rejected_models.get(m, 0) > _MODELS_TTL:
            seen.add(m)
            result.append(m)
    return result


def _prepare_lyrics(lyrics):
    """Retire les balises [Chorus]... et les lignes repetees, garde l'ordre."""
    import re
    seen, lines = set(), []
    for line in lyrics.splitlines():
        line = line.strip()
        if not line or re.fullmatch(r'[\(\[].*[\)\]]', line):
            continue
        if line.lower() in seen:
            continue
        seen.add(line.lower())
        lines.append(line)
    return "\n".join(lines)[:_MAX_LYRICS_CHARS]


def _normalize(text):
    """Minuscules, sans accents ni ponctuation, espaces compactes."""
    import re
    import unicodedata
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return " ".join(text.split())


def _parse_json(text):
    import json
    import re
    text = (text or "").strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return json.loads(match.group(0) if match else text)


def _tidy(hook):
    """Retire les apartés entre parentheses et les interjections finales (oh, yeah...)."""
    import re
    hook = re.sub(r"\s*[\(\[][^\)\]]*[\)\]]", "", hook)
    hook = re.sub(r"[\s,]+(oh+|ooh+|yeah|yeah yeah|na+|la+|hey|uh)[\s!.,]*$", "", hook, flags=re.IGNORECASE)
    return hook.strip(" ,;-") or hook


def _pick_verified(result, lyrics):
    """Premiere ligne (choix puis candidates) retrouvee dans les paroles -> (hook, verifie)."""
    norm_lyrics = _normalize(lyrics.replace("\n", " "))
    options = [result.get("choice", "")] + list(result.get("candidates") or [])
    options = [o.strip().strip('"\'«»“”').strip() for o in options if isinstance(o, str) and o.strip()]
    for option in options:
        if len(option) <= _MAX_HOOK_LEN and _normalize(option) and _normalize(option) in norm_lyrics:
            return _tidy(option), True
    # Aucune ligne verifiee : on garde le choix (coupe proprement) mais on le signale
    if options:
        hook = options[0]
        if len(hook) > _MAX_HOOK_LEN:
            hook = hook[:_MAX_HOOK_LEN - 1].rsplit(" ", 1)[0] + "…"
        return hook, False
    return None, False


def current_prompt_version():
    """Hash court du prompt : un changement de prompt relance l'extraction des morceaux en cache."""
    import hashlib
    prompt = AppSettings.get_value("groq_system_prompt") or _DEFAULT_SYSTEM_PROMPT
    return hashlib.sha1(prompt.encode("utf-8")).hexdigest()[:10]


def _call_groq(api_key, model, system_prompt, user_msg, temperature):
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg},
        ],
        "temperature": temperature,
        "max_completion_tokens": 2048,
        "response_format": {"type": "json_object"},
    }
    if model.startswith("openai/gpt-oss"):
        payload["reasoning_effort"] = "low"
    return requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        timeout=_GROQ_TIMEOUT,
    )


def _extract_hook(lyrics, title, artist):
    """Extrait la phrase cle. Retourne (hook, theme, model) ou (None, None, model)."""
    import time
    api_key = AppSettings.get_value("groq_api_key")
    if not api_key:
        logger.warning("[ENRICH] Groq API key non configuree")
        return None, None, None

    configured = AppSettings.get_value("groq_model_name") or _DEFAULT_GROQ_MODEL
    system_prompt = (AppSettings.get_value("groq_system_prompt") or _DEFAULT_SYSTEM_PROMPT) + _JSON_INSTRUCTIONS
    temperature = float(AppSettings.get_value("groq_temperature", "0.3"))
    clean_lyrics = _prepare_lyrics(lyrics)
    user_msg = f"Artiste : {artist}\nTitre : {title}\n\nParoles :\n{clean_lyrics}"

    model = None
    for model in _candidate_models(api_key, configured):
        try:
            resp = _call_groq(api_key, model, system_prompt, user_msg, temperature)
            if resp.status_code in (403, 404):
                # Modele retire ou bloque sur le compte -> on passe au suivant
                _rejected_models[model] = time.time()
                logger.warning(f"[ENRICH] Groq {resp.status_code} sur {model}, modele suivant")
                continue
            if resp.status_code != 200:
                logger.warning(f"[ENRICH] Groq {resp.status_code} ({model}): {resp.text[:200]}")
                continue
            result = _parse_json(resp.json()["choices"][0]["message"]["content"])
            hook, verified = _pick_verified(result, clean_lyrics)
            if not hook:
                logger.warning(f"[ENRICH] Groq ({model}): reponse sans phrase: {result}")
                continue
            theme = (result.get("theme") or "").strip()[:200]
            if not verified:
                logger.warning(f"[ENRICH] Hook non retrouve mot pour mot dans les paroles: {hook}")
            if model != configured:
                logger.warning(f"[ENRICH] Modele configure '{configured}' indisponible, utilise: {model}")
            logger.info(f"[ENRICH] Hook: {hook} | theme: {theme} (model={model})")
            return hook, theme, model
        except Exception as e:
            logger.warning(f"[ENRICH] Groq echoue ({model}): {e}")

    logger.warning("[ENRICH] Aucun modele Groq n'a pu extraire de hook")
    return None, None, model


# ── Pipeline principal ──────────────────────────────────────────────────────

def enrich_track(title, artist, album=None):
    """Enrichit un morceau. Retourne un dict avec les donnees disponibles.

    Strategie :
      1. Cache hit avec hook_phrase (meme version de prompt) → retour immediat
      2. Cache hit SANS hook_phrase ou prompt modifie → re-tenter l'enrichissement
      3. Cache miss → collecte parallele + Groq → cache

    Returns:
        dict avec year, tags, listeners, hook_phrase, song_theme, lyrics_available, model_used
        ou dict vide si rien n'est disponible
    """
    slug = _make_slug(artist, title, album)

    # 1. Cache lookup — retour immediat seulement si hook_phrase est remplie
    prompt_version = current_prompt_version()
    cached = TrackMetadata.objects(slug=slug).first()
    if cached and cached.is_complete and cached.hook_phrase and cached.prompt_version == prompt_version:
        logger.debug(f"[ENRICH] Cache hit (avec hook): {slug}")
        return {
            "year": cached.year or "",
            "tags": cached.tags or [],
            "listeners": cached.listeners or 0,
            "hook_phrase": cached.hook_phrase or "",
            "song_theme": cached.song_theme or "",
            "lyrics_available": cached.lyrics_available or False,
            "model_used": cached.model_used or "",
        }

    # 2. Collecte parallele
    if cached:
        logger.info(f"[ENRICH] Retry (hook vide ou prompt modifie), re-enrichissement: {artist} — {title}")
    else:
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

    # 3. Groq : extraction de la phrase cle si paroles disponibles
    hook_phrase = None
    song_theme = None
    model_used = None
    is_complete = True

    if lyrics_available and lyrics:
        hook_phrase, song_theme, model_used = _extract_hook(lyrics, title, artist)
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
            set__song_theme=song_theme or "",
            set__prompt_version=prompt_version,
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
        "song_theme": song_theme or "",
        "lyrics_available": lyrics_available,
        "model_used": model_used or "",
    }
