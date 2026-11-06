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
    CHROMECAST_NAME      — nom de l'enceinte (ex: "GH Bureau"), casse/espaces ignores
    CHROMECAST_UUID      — UUID Cast de l'enceinte (optionnel, prioritaire, stable au renommage)
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
CHROMECAST_UUID = os.getenv("CHROMECAST_UUID", "")  # prioritaire sur le nom (stable au renommage)
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "5"))
IDLE_TIMEOUT = int(os.getenv("IDLE_TIMEOUT", "120"))
PAUSE_TIMEOUT = int(os.getenv("PAUSE_TIMEOUT", "600"))  # pause plus longue = fin d'ecoute
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
    state: str = "IDLE"  # PLAYING, PAUSED, IDLE, BUFFERING, UNKNOWN

    def is_playing(self) -> bool:
        return self.state in ("PLAYING", "BUFFERING")

    def is_idle(self) -> bool:
        return self.state in ("IDLE", "UNKNOWN")

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

    def put_cast_devices(self, devices: list) -> bool:
        """Publie la liste des appareils Cast vus sur le LAN (choix dans l'app)."""
        try:
            resp = self.session.put(self.url.rsplit("/", 1)[0] + "/cast-devices",
                                    json={"devices": devices}, timeout=15)
            if resp.status_code != 200:
                log.warning(f"API cast-devices {resp.status_code}: {resp.text[:200]}")
            return resp.status_code == 200
        except requests.RequestException as e:
            log.warning(f"Erreur API cast-devices: {e}")
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
    """Ecoute une enceinte Cast ET les groupes qui la contiennent.

    (2026-11-06) En lecture « Toute la maison » (groupe multi-pieces), seul
    le groupe porte les metadonnees (titre, artiste, pochette) : l'enceinte
    membre reste a UNKNOWN. On suit donc l'enceinte + chacun de ses groupes,
    et on retient le premier qui joue (l'enceinte d'abord). Un groupe qui ne
    contient pas l'enceinte (ex. « 1er Etage ») est ignore.
    L'enceinte est identifiee par son UUID Cast (stable si on la renomme) ;
    le nom ne sert qu'a la trouver la premiere fois.
    """

    # Nombre minimum de polls consecutifs en idle avant de demarrer le timer
    IDLE_CONFIRM_POLLS = 3
    # Re-scan des groupes (creation / modification dans Google Home)
    GROUP_REFRESH_S = 600
    # Relance d'une demande d'etat media si une appli tourne sans etat connu
    STATUS_REFRESH_S = 30
    # Lecture du choix d'enceinte fait dans l'app (GET /frame/<id>/music)
    CONFIG_REFRESH_S = 60
    # Ecran d'attente Cast (aucune appli reelle)
    BACKDROP_APP_ID = "E8C28D3C"

    def __init__(self, chromecast_name: str, client: SmartFrameClient, chromecast_uuid: str = ""):
        self.chromecast_name = chromecast_name
        self.target_uuid = chromecast_uuid.strip().lower()
        self.client = client
        self._last_fingerprint: str = ""
        self._last_state: str = "IDLE"
        self._idle_since: Optional[float] = None
        self._idle_sent: bool = False
        self._idle_consecutive: int = 0  # polls consecutifs en idle
        self._running: bool = False
        self._zconf = None
        self._browser = None
        self._casts: dict = {}           # uuid -> Chromecast suivi (enceinte + ses groupes)
        self._mz: dict = {}              # uuid groupe -> MultizoneController (un seul par groupe)
        self._groups_checked_at: float = 0.0
        self._status_asked: dict = {}    # uuid -> derniere demande update_status
        self._source: str = ""           # nom de l'appareil qui fournit le morceau
        self._config_checked_at: float = 0.0
        self._paused_fp: str = ""        # morceau en pause (et depuis quand)
        self._paused_since: float = 0.0
        self._published: list = []       # derniere liste publiee a l'API

    # ── Decouverte ──

    @staticmethod
    def _is_group(info) -> bool:
        if getattr(info, "cast_type", None):
            return info.cast_type == "group"
        return getattr(info, "port", 8009) != 8009  # les groupes ecoutent sur un autre port

    def _devices(self) -> dict:
        return {str(u).lower(): info for u, info in list(self._browser.devices.items())}

    def _resolve_target(self) -> bool:
        """Trouve l'UUID de l'enceinte (par UUID, sinon par nom) et s'y connecte."""
        import pychromecast
        devices = self._devices()
        if not self.target_uuid:
            wanted = self.chromecast_name.strip().lower()
            for u, info in devices.items():
                if (info.friendly_name or "").strip().lower() == wanted and not self._is_group(info):
                    self.target_uuid = u
                    break
        info = devices.get(self.target_uuid) if self.target_uuid else None
        if not info:
            names = sorted((i.friendly_name or "?").strip() for i in devices.values())
            log.error(f"Enceinte '{self.chromecast_name}' {self.target_uuid or ''} introuvable — "
                      f"vues sur le reseau: {', '.join(names) or 'aucune'}")
            return False
        cast = pychromecast.get_chromecast_from_cast_info(info, self._zconf)
        cast.wait(timeout=15)
        self._casts[self.target_uuid] = cast
        log.info(f"Connecte a '{cast.name}' ({cast.cast_type}, uuid {self.target_uuid})")
        return True

    def _refresh_groups(self):
        """Connecte les groupes qui contiennent l'enceinte, lache les autres."""
        import pychromecast
        from pychromecast.controllers.multizone import MultizoneController
        self._groups_checked_at = time.time()
        devices = self._devices()
        keep = {self.target_uuid}
        for u, info in devices.items():
            if not self._is_group(info):
                continue
            cast = self._casts.get(u)
            try:
                if cast is None:
                    cast = pychromecast.get_chromecast_from_cast_info(info, self._zconf)
                    cast.wait(timeout=15)
                mz = self._mz.get(u)
                if mz is None:
                    mz = self._mz[u] = MultizoneController(cast.uuid)
                    cast.register_handler(mz)
                mz.update_members()
                time.sleep(2)
                members = {str(m).lower() for m in mz.members}
            except Exception as e:
                log.debug(f"Groupe {info.friendly_name!r} illisible: {e}")
                members = set()
            if self.target_uuid in members:
                keep.add(u)
                if u not in self._casts:
                    self._casts[u] = cast
                    log.info(f"Groupe suivi: '{(info.friendly_name or '').strip()}'")
            elif cast is not None and u not in self._casts:
                self._mz.pop(u, None)
                cast.disconnect(blocking=False)
        for u in [u for u in self._casts if u not in keep]:
            log.info(f"Groupe abandonne: '{self._casts[u].name}'")
            self._mz.pop(u, None)
            self._casts.pop(u).disconnect(blocking=False)

    def _publish_devices(self):
        """Envoie a l'API la liste des appareils Cast vus (pour la liste de l'app)."""
        devices = sorted(
            ({"uuid": u, "name": (i.friendly_name or "").strip(),
              "type": "group" if self._is_group(i) else (getattr(i, "cast_type", None) or "cast"),
              "host": getattr(i, "host", "") or ""}
             for u, i in self._devices().items()),
            key=lambda d: d["uuid"])
        if not devices:
            return
        # mDNS est capricieux : on fusionne avec la liste precedente pour ne pas
        # faire disparaitre un appareil absent d'un seul scan
        known = {d["uuid"]: d for d in self._published}
        known.update({d["uuid"]: d for d in devices})
        merged = sorted(known.values(), key=lambda d: d["uuid"])
        if self.client.put_cast_devices(merged):
            if merged != self._published:
                log.info(f"Liste des enceintes publiee ({len(merged)} appareils)")
            self._published = merged

    def _check_config(self):
        """Suit le choix d'enceinte fait dans l'app (prioritaire sur le .env)."""
        self._config_checked_at = time.time()
        cfg = self.client.get_config() or {}
        wanted = (cfg.get("music_chromecast_uuid") or "").strip().lower()
        if not wanted or wanted == self.target_uuid:
            return
        log.info(f"Nouvelle enceinte choisie dans l'app: '{cfg.get('music_chromecast_name', '')}' ({wanted})")
        if self._last_state in ("PLAYING", "BUFFERING", "PAUSED"):
            self.client.send_idle()
        for cast in self._casts.values():
            cast.disconnect(blocking=False)
        self._casts.clear()
        self._mz.clear()
        self._last_fingerprint, self._last_state, self._source = "", "IDLE", ""
        self._idle_since, self._idle_sent, self._idle_consecutive = None, False, 0
        self.target_uuid = wanted
        self.chromecast_name = cfg.get("music_chromecast_name") or self.chromecast_name
        if self._resolve_target():
            self._refresh_groups()
        else:
            self._groups_checked_at = 0.0  # on reessaiera au prochain tour

    def start(self):
        """Demarre la decouverte et l'ecoute de l'enceinte + ses groupes."""
        try:
            import zeroconf
            from pychromecast.discovery import CastBrowser, SimpleCastListener
        except ImportError:
            log.error("pychromecast non installe. pip install pychromecast")
            sys.exit(1)

        self._running = True
        log.info(f"Recherche de l'enceinte '{self.chromecast_name}' {self.target_uuid}...")
        self._zconf = zeroconf.Zeroconf()
        self._browser = CastBrowser(SimpleCastListener(), self._zconf)
        self._browser.start_discovery()

        # Boucle de polling (plus fiable que les callbacks pour e-paper)
        try:
            time.sleep(10)  # laisser mDNS remplir la liste
            self._publish_devices()
            # Choix fait dans l'app prioritaire sur le .env
            cfg_uuid = ((self.client.get_config() or {}).get("music_chromecast_uuid") or "").strip().lower()
            if cfg_uuid:
                self.target_uuid = cfg_uuid
            self._config_checked_at = time.time()
            while self._running and self.target_uuid not in self._casts and not self._resolve_target():
                time.sleep(60)  # rester en vie : l'enceinte peut revenir (pas de boucle de restart)
                self._publish_devices()
                self._check_config()
            while self._running:
                if time.time() - self._groups_checked_at > self.GROUP_REFRESH_S:
                    self._refresh_groups()
                    self._publish_devices()
                if time.time() - self._config_checked_at > self.CONFIG_REFRESH_S:
                    self._check_config()
                self._poll()
                time.sleep(POLL_INTERVAL)
        except KeyboardInterrupt:
            log.info("Arret demande (Ctrl+C)")
        finally:
            self.stop()

    def stop(self):
        """Arrete proprement le listener."""
        if not self._running:
            return
        self._running = False
        if self._browser:
            self._browser.stop_discovery()
            log.debug("Decouverte zeroconf arretee")
        # Envoyer un IDLE final si on etait en lecture
        if self._last_state in ("PLAYING", "BUFFERING", "PAUSED"):
            self.client.send_idle()

    def _current_track(self) -> TrackInfo:
        """Premier appareil suivi qui joue (l'enceinte d'abord, puis ses groupes)."""
        paused = None
        order = [self.target_uuid] + [u for u in self._casts if u != self.target_uuid]
        for u in order:
            cast = self._casts.get(u)
            if cast is None:
                continue
            if not cast.app_id or cast.app_id == self.BACKDROP_APP_ID:
                # (2026-11-06) Plus d'appli lancee : pychromecast garde le dernier
                # etat media (PAUSED + titre) -> le cadre restait sur la pochette.
                continue
            track = self._extract_track(cast.media_controller)
            if not track.title and not track.artist:
                # Appli lancee mais etat media pas encore recu : on le redemande
                if cast.app_id and time.time() - self._status_asked.get(u, 0) > self.STATUS_REFRESH_S:
                    self._status_asked[u] = time.time()
                    try:
                        cast.media_controller.update_status()
                    except Exception:
                        pass
                continue
            if track.is_playing():
                self._paused_fp = ""
                self._set_source(cast.name)
                return track
            if track.state == "PAUSED" and paused is None:
                paused = (track, cast.name)
        if paused:
            # Pause prolongee = fin d'ecoute : on la traite comme un arret
            # (le timer idle habituel s'applique ensuite)
            fp = paused[0].fingerprint()
            if self._paused_fp != fp:
                self._paused_fp, self._paused_since = fp, time.time()
            if time.time() - self._paused_since < PAUSE_TIMEOUT:
                self._set_source(paused[1])
                return paused[0]
            return TrackInfo(state="IDLE")
        self._paused_fp = ""
        return TrackInfo(state="IDLE")

    def _set_source(self, name: str):
        if name != self._source:
            self._source = name
            log.info(f"Source musique: '{name}'")

    def _poll(self):
        """Verifie l'etat des appareils suivis et reagit aux changements."""
        if not self._casts:
            return

        track = self._current_track()

        # ── Transition vers IDLE ──
        if track.is_idle() or (not track.title and not track.artist):
            self._idle_consecutive += 1

            if self._last_state in ("PLAYING", "BUFFERING", "PAUSED"):
                # Exiger N polls consecutifs avant de considerer comme vraiment idle
                if self._idle_consecutive < self.IDLE_CONFIRM_POLLS:
                    log.debug(f"Idle poll {self._idle_consecutive}/{self.IDLE_CONFIRM_POLLS}, en attente de confirmation...")
                    return

                # Demarrer le timer idle apres confirmation
                if self._idle_since is None:
                    self._idle_since = time.time()
                    log.info(f"Idle confirme apres {self.IDLE_CONFIRM_POLLS} polls, timeout dans {IDLE_TIMEOUT}s")

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
        self._idle_consecutive = 0

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
    if not CHROMECAST_NAME and not CHROMECAST_UUID:
        errors.append("CHROMECAST_NAME (ou CHROMECAST_UUID) manquant")

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

    listener = ChromecastListener(CHROMECAST_NAME, client, CHROMECAST_UUID)

    # Gestion propre de SIGTERM (systemd)
    def handle_signal(signum, _frame):
        log.info(f"Signal {signum} recu, arret...")
        listener.stop()

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    listener.start()


if __name__ == "__main__":
    main()
