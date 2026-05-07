"""Endpoints pour le mode musique "Now Playing".

POST /api/frame/<id>/music  — recoit les metadonnees du morceau en cours,
                               genere l'image e-paper et l'envoie au cadre.
DELETE /api/frame/<id>/music — fin de musique, retour a la bibliotheque active.
GET /api/frame/<id>/music   — retourne la config musique du cadre (pour le Pi).

Le Pi (ou tout client) n'a qu'a relayer les metadonnees Chromecast.
Tout le rendu est fait cote serveur.
"""

from flask_jwt_extended import jwt_required
from flask_restful import Resource
from flask import request
from database.models import Frames, EventsLog
from mongoengine.errors import FieldDoesNotExist, ValidationError
from resources.errors import SchemaValidationError, InternalServerError, ExpiredSignatureError
from resources.music_renderer import render_now_playing
from resources.enrichment import enrich_track
from resources.music_masks import get_mask_ids
from resources.draw_image import convert_image_raspberry
from slugify import slugify
from datetime import datetime
import requests as http_requests
import logging
import os
import io

logger = logging.getLogger(__name__)


class FrameMusicAPI(Resource):

    @jwt_required()
    def get(self, id):
        """Retourne la config musique du cadre (pour le listener Pi)."""
        try:
            frame = Frames.objects.get(id=id)
            return {
                "music_mode_enabled": frame.music_mode_enabled or False,
                "music_idle_timeout": frame.music_idle_timeout or 120,
                "music_mask": frame.music_mask or "poster",
                "music_chromecast_name": frame.music_chromecast_name or "",
                "music_display_scale": frame.music_display_scale or 100,
                "available_masks": get_mask_ids()
            }, 200
        except Frames.DoesNotExist:
            return {"message": "Cadre introuvable"}, 404
        except Exception as e:
            logging.exception(e)
            raise InternalServerError

    @jwt_required()
    def post(self, id):
        """Recoit les metadonnees du morceau et affiche sur le cadre.

        Body (JSON ou FormData):
            title (str, requis): titre du morceau
            artist (str, requis): nom de l'artiste
            album (str, optionnel): nom de l'album
            artwork_url (str, optionnel): URL de la pochette
            state (str, optionnel): PLAYING, PAUSED, IDLE
        """
        try:
            frame = Frames.objects.get(id=id)

            # Verifier que le mode musique est active
            if not frame.music_mode_enabled:
                return {"message": "Mode musique desactive pour ce cadre"}, 403

            # Accepter JSON ou FormData
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form.to_dict()

            title = data.get("title")
            artist = data.get("artist")
            album = data.get("album")
            artwork_url = data.get("artwork_url")
            state = data.get("state", "PLAYING")

            if not title or not artist:
                return {"message": "title et artist requis"}, 400

            # Si IDLE → retour a la biblio (meme effet que DELETE)
            if state == "IDLE":
                return self._restore_library(id)

            size_frame = (int(frame.resolution_width), int(frame.resolution_height))

            # Enrichissement (cache-first, synchrone)
            enrichment = enrich_track(title, artist, album)

            # Generer l'image via le dispatcher (masque + orientation auto + scale)
            img = render_now_playing(
                title, artist, album, artwork_url,
                width=size_frame[0], height=size_frame[1],
                mask=frame.music_mask or "poster",
                display_scale=frame.music_display_scale or 100,
                enrichment=enrichment
            )

            # Convertir pour e-paper
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='BMP')
            img_bytes.seek(0)
            img_epaper = convert_image_raspberry(img_bytes.read(), size_frame)

            # Sauvegarder en fichier temporaire
            name_file = f"tmp/music_{slugify(frame.name)}_{slugify(title)}.bmp"
            img_epaper.save(name_file)

            # Envoyer au cadre
            if frame.type_frame == "e_paper_raspbery":
                try:
                    payload = {'key': frame.key}
                    file_picture = {"bmp": open(name_file, 'rb')}
                    http_requests.post(
                        f"http://{frame.ip}/picture",
                        files=file_picture, data=payload, timeout=(5, 25)
                    )
                    frame.update(
                        last_success_at=datetime.utcnow(),
                        last_seen_at=datetime.utcnow()
                    )
                    EventsLog(
                        type_event="music",
                        frame=frame,
                        message=f"{artist} — {title}"
                    ).save()
                    logger.info(f"[MUSIC] Now playing: {artist} — {title} → {frame.name} (mask={frame.music_mask})")
                except Exception as e:
                    logger.warning(f"[MUSIC] Erreur envoi cadre: {e}")
                    try: os.remove(name_file)
                    except: pass
                    return {"message": "Cadre injoignable"}, 400

            elif frame.type_frame == "e_paper_arduino":
                logger.warning("[MUSIC] Mode musique non supporte pour Arduino")
                try: os.remove(name_file)
                except: pass
                return {"message": "Mode musique non supporte pour ce type de cadre"}, 400

            try: os.remove(name_file)
            except: pass

            return {
                "success": True,
                "now_playing": {
                    "title": title,
                    "artist": artist,
                    "album": album,
                    "state": state,
                    "mask": frame.music_mask or "poster"
                }
            }, 200

        except Frames.DoesNotExist:
            return {"message": "Cadre introuvable"}, 404

        except (FieldDoesNotExist, ValidationError):
            raise SchemaValidationError

        except ExpiredSignatureError:
            raise ExpiredSignatureError

        except Exception as e:
            logging.exception(e)
            raise InternalServerError

    @jwt_required()
    def delete(self, id):
        """Fin de musique — retour a la bibliotheque active du cadre."""
        try:
            return self._restore_library(id)
        except Frames.DoesNotExist:
            return {"message": "Cadre introuvable"}, 404
        except Exception as e:
            logging.exception(e)
            raise InternalServerError

    def _restore_library(self, frame_id):
        """Declenche l'envoi de la prochaine image de la biblio active."""
        frame = Frames.objects.get(id=frame_id)

        if not frame.library_display:
            return {"message": "Pas de bibliotheque active, rien a restaurer"}, 200

        try:
            auth = os.getenv("AUTH")
            http_requests.post(
                'http://127.0.0.1:8080/api/eventtoframe',
                headers={'Authorization': auth},
                data={
                    'frame': str(frame.id),
                    'library': str(frame.library_display.id)
                },
                timeout=(5, 30)
            )
            EventsLog(
                        type_event="music-end",
                        frame=frame,
                        message=f"Fin musique, retour biblio"
                    ).save()
            logger.info(f"[MUSIC] Fin musique, retour biblio → {frame.name}")
            return {"success": True, "restored": True}, 200
        except Exception as e:
            logger.warning(f"[MUSIC] Erreur restauration biblio: {e}")
            return {"message": "Erreur lors du retour a la bibliotheque"}, 500
