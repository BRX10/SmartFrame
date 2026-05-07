#!/usr/bin/env python3
"""SmartFrame Music Listener — Chromecast → e-paper Now Playing.

Ecoute un Chromecast via pychromecast (mDNS/zeroconf).
Quand un morceau joue, envoie les metadonnees a l'API SmartFrame
qui genere l'image Now Playing et l'affiche sur le cadre e-paper.

Usage:
    python3 smartframe_music_listener.py

Configuration via variables d'environnement (ou fichier .env) :
    SMARTFRAME_API_URL   — ex: https://smartframe.knowhere.click
    SMARTFRAME_API_TOKEN — JWT Bearer token
    SMARTFRAME_FRAME_ID  — ID du cadre cible (ObjectId Mongo)
    CHROMECAST_NAME      — nom exact du Chromecast (ex: "Nest Mini salon")
    POLL_INTERVAL        — secondes entre deux verifications (defaut: 5)
    IDLE_TIMEOUT         — secondes avant de signaler IDLE (defaut: 120)
    LOG_LEVEL            — DEBUG, INFO, WARNING (defaut: INFO)

Dependances:
    pip install pychromecast requests python-dotenv
"""

import os
import sys
import time
import signal
import logging
import threading
from dataclasses import dataclass, field
from typing import Optional

import requests
from dotenv import load_dotenv

# Charger .env s'il existe (a cote du script ou dans /home/pi)
load_dotenv()
load_dotenv(os.path.expanduser("~/.smartframe.env"))

# ── Configuration ────────────────────────────────────────────────────────────

API_URL = os.getenv("SMARTFRAME_API_URL", "").rstrip("/")
API_TOKEN = os.getenv("SMARTFRAME_API_TOKEN", "")
FRAME_ID = os.getenv("SMARTFRAME_FRAME_ID", "")
CHROMECAST_NAME = os.getenv("CHROMECAST_NAME", "")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "5"))
IDLE_TIMEOUT = int(os.getenv("IDLE_TIMEOUT", "120"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("smartframe-music")


# ── Data ─────────────────────────────────────────────────────────────────────

@dataclass
class TrackInfo:
    """Metadonnees d'un morceau en cours de lecture."""
    title: str = ""
    artist: str = ""
    album: str = ""
    artwork_url: str = ""
    state: str = "IDLE"  # PLAYING, PAUSED, IDLE, BUFFERING

    def is_playing(self) -> bool:
        return self.state in ("PLAYING", "BUFFERING")

    def is_idle(self) -> bool:
        return self.state == "IDLE"

    def fingerprint(self) -> str:
        """Identifiant unique du morceau (evite les envois dupliques)."""
        return f"{self.artist}|{self.title}|{self.album}"


# ── API Client ───────────────────────────────────────────────────────────────

class SmartFrameClient:
    """Client HTTP vers l'API SmartFrame /api/frame/<id>/music."""

    def __init__(self, api_url: str, token: str, frame_id: str):
        self.url = f"{api_url}/api/frame/{frame_id}/music"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def send_now_playing(self, track: TrackInfo) -> bool:
        """POST les metadonnees du morceau. Retourne True si succes."""
        try:
            resp = self.session.post(self.url, json={
                "title": track.title,
                "artist": track.artist,
                "album": track.album,
                "artwork_url": track.artwork_url,
                "state": track.state,
            }, timeout=30)

            if resp.status_code == 200:
                log.info(f">> Now Playing: {track.artist} — {track.title}")
                return True
            elif resp.status_code == 403:
                log.warning("Mode musique desactive sur ce cadre")
                return False
            else:
                log.warning(f"API {resp.status_code}: {resp.text[:200]}")
                return False

        except requests.RequestException as e:
            log.error(f"Erreur API: {e}")
            return False

    def send_idle(self) -> bool:
        """DELETE pour signaler la fin de musique."""
        try:
            resp = self.session.delete(self.url, timeout=15)
            if resp.status_code == 200:
                log.info(">> Fin musique, retour a la bibliotheque")
                return True
            else:
                log.warning(f"API DELETE {resp.status_code}: {resp.text[:200]}")
                return False
        except requests.RequestException as e:
            log.error(f"Erreur API DELETE: {e}")
            return False

    def get_config(self) -> Optional[dict]:
        """GET la config musique du cadre."""
        try:
            resp = self.session.get(self.url, timeout=10)
            if resp.status_code == 200:
                return resp.json()
            return None
        except requests.RequestException:
            return None


# ── Chromecast Listener ──────────────────────────────────────────────────────

class ChromecastListener:
    """Ecoute un Chromecast et envoie les changements de piste a l'API."""

    def __init__(self, chromecast_name: str, client: SmartFrameClient):
        self.chromecast_name = chromecast_name
        self.client = client
        self._last_fingerprint: str = ""
        self._last_state: str = "IDLE"
        self._idle_since: Optional[float] = None
        self._idle_sent: bool = False
        self._running: bool = False
        self._cast = None
        self._browser = None

    def start(self):
        """Demarre la decouverte et l'ecoute du Chromecast."""
        try:
            import pychromecast
        except ImportError:
            log.error("pychromecast non installe. pip install pychromecast")
            sys.exit(1)

        self._running = True
        log.info(f"Recherche du Chromecast '{self.chromecast_name}'...")

        # Decouverte via zeroconf
        chromecasts, self._browser = pychromecast.get_listed_chromecasts(
            friendly_names=[self.chromecast_name]
        )

        if not chromecasts:
            log.error(f"Chromecast '{self.chromecast_name}' introuvable sur le reseau")
            log.info("Chromecasts detectes: aucun avec ce nom")
            self._browser.stop_discovery()
            sys.exit(1)

        self._cast = chromecasts[0]
        self._cast.wait()
        log.info(f"Connecte a '{self._cast.name}' ({self._cast.cast_type})")

        # Boucle de polling (plus fiable que les callbacks pour e-paper)
        try:
            while self._running:
                self._poll()
                time.sleep(POLL_INTERVAL)
        except KeyboardInterrupt:
            log.info("Arret demande (Ctrl+C)")
        finally:
            self.stop()

    def stop(self):
        """Arrete proprement le listener."""
        self._running = False
        if self._browser:
            self._browser.stop_discovery()
            log.debug("Decouverte zeroconf arretee")
        # Envoyer un IDLE final si on etait en lecture
        if self._last_state in ("PLAYING", "BUFFERING", "PAUSED"):
            self.client.send_idle()

    def _poll(self):
        """Verifie l'etat du media controller et reagit aux changements."""
        if not self._cast:
            return

        mc = self._cast.media_controller
        track = self._extract_track(mc)

        # ── Transition vers IDLE ──
        if track.is_idle() or (not track.title and not track.artist):
            if self._last_state in ("PLAYING", "BUFFERING", "PAUSED"):
                # Demarrer le timer idle
                if self._idle_since is None:
                    self._idle_since = time.time()
                    log.debug(f"Idle detecte, timeout dans {IDLE_TIMEOUT}s")

                elapsed = time.time() - self._idle_since
                if elapsed >= IDLE_TIMEOUT and not self._idle_sent:
                    self.client.send_idle()
                    self._idle_sent = True
                    self._last_state = "IDLE"
                    self._last_fingerprint = ""
            return

        # ── Reset idle timer si musique reprend ──
        self._idle_since = None
        self._idle_sent = False

        # ── Nouvelle piste ou changement d'etat significatif ──
        fp = track.fingerprint()
        state_changed = track.state != self._last_state
        track_changed = fp != self._last_fingerprint

        if track_changed or (state_changed and track.state == "PAUSED"):
            if track.is_playing() or track.state == "PAUSED":
                self.client.send_now_playing(track)
                self._last_fingerprint = fp
                self._last_state = track.state

        elif state_changed:
            self._last_state = track.state
            log.debug(f"Etat: {track.state}")

    def _extract_track(self, mc) -> TrackInfo:
        """Extrait les metadonnees du media controller."""
        status = mc.status

        if status is None:
            return TrackInfo(state="IDLE")

        # pychromecast player_state: PLAYING, PAUSED, IDLE, BUFFERING, UNKNOWN
        state = getattr(status, 'player_state', 'IDLE') or 'IDLE'

        title = getattr(status, 'title', '') or ''
        artist = getattr(status, 'artist', '') or ''
        album = getattr(status, 'album_name', '') or ''

        # Artwork: premier element de images[] s'il existe
        artwork_url = ""
        images = getattr(status, 'images', None)
        if images and len(images) > 0:
            img = images[0]
            artwork_url = getattr(img, 'url', '') or ''

        # Fallback: parfois l'artiste est dans metadata
        if not artist:
            metadata = getattr(status, 'media_metadata', {}) or {}
            artist = metadata.get('artist', '') or metadata.get('albumArtist', '') or ''

        return TrackInfo(
            title=title.strip(),
            artist=artist.strip(),
            album=album.strip(),
            artwork_url=artwork_url,
            state=state,
        )


# ── Main ─────────────────────────────────────────────────────────────────────

def validate_config():
    """Verifie que toutes les variables requises sont presentes."""
    errors = []
    if not API_URL:
        errors.append("SMARTFRAME_API_URL manquant")
    if not API_TOKEN:
        errors.append("SMARTFRAME_API_TOKEN manquant")
    if not FRAME_ID:
        errors.append("SMARTFRAME_FRAME_ID manquant")
    if not CHROMECAST_NAME:
        errors.append("CHROMECAST_NAME manquant")

    if errors:
        for e in errors:
            log.error(e)
        log.info("Configurez les variables dans .env ou ~/.smartframe.env")
        sys.exit(1)


def main():
    validate_config()

    log.info("=== SmartFrame Music Listener ===")
    log.info(f"API:        {API_URL}")
    log.info(f"Cadre:      {FRAME_ID}")
    log.info(f"Chromecast: {CHROMECAST_NAME}")
    log.info(f"Poll:       {POLL_INTERVAL}s / Idle timeout: {IDLE_TIMEOUT}s")

    client = SmartFrameClient(API_URL, API_TOKEN, FRAME_ID)

    # Verifier la config du cadre
    config = client.get_config()
    if config:
        if not config.get("music_mode_enabled"):
            log.warning("Le mode musique est desactive sur ce cadre !")
            log.warning("Activez-le dans les parametres du cadre avant de lancer le listener.")
        else:
            log.info(f"Mode musique actif, masque: {config.get('music_mask', 'poster')}")
    else:
        log.warning("Impossible de recuperer la config du cadre (verifiez l'URL et le token)")

    listener = ChromecastListener(CHROMECAST_NAME, client)

    # Gestion propre de SIGTERM (systemd)
    def handle_signal(signum, _frame):
        log.info(f"Signal {signum} recu, arret...")
        listener.stop()

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    listener.start()


if __name__ == "__main__":
    main()
