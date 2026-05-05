"""Endpoints pour le mode musique "Now Playing".

POST /api/frame/<id>/music  — recoit les metadonnees du morceau en cours,
                               genere l'image e-paper et l'envoie au cadre.
DELETE /api/frame/<id>/music — fin de musique, retour a la bibliotheque active.

Le Pi (ou tout client) n'a qu'a relayer les metadonnees Chromecast.
Tout le rendu est fait cote serveur.
"""

from flask_jwt_extended import jwt_required
from flask_restful import Resource
from flask import request
from database.models import Frames, EventsLog
from mongoengine.errors import FieldDoesNotExist, ValidationError
from resources.errors import SchemaValidationError, InternalServerError, ExpiredSignatureError
from resources.music_renderer import render_now_playing, render_now_playing_portrait
from resources.draw_image import convert_image_raspberry
from slugify import slugify
from datetime import datetime
import requests as http_requests
import logging
import json
import os
import io

logger = logging.getLogger(__name__)


class FrameMusicAPI(Resource):

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

            # Recuperer le cadre
            frame = Frames.objects.get(id=id)
            size_frame = (int(frame.resolution_width), int(frame.resolution_height))

            # Generer l'image selon l'orientation
            if frame.orientation == "portrait":
                img = render_now_playing_portrait(
                    title, artist, album, artwork_url,
                    width=size_frame[0], height=size_frame[1]
                )
            else:
                img = render_now_playing(
                    title, artist, album, artwork_url,
                    width=size_frame[0], height=size_frame[1]
                )

            # Convertir pour e-paper (grayscale + RGB)
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
                    logger.info(f"[MUSIC] Now playing: {artist} — {title} → {frame.name}")
                except Exception as e:
                    logger.warning(f"[MUSIC] Erreur envoi cadre: {e}")
                    try: os.remove(name_file)
                    except: pass
                    return {"message": "Cadre injoignable"}, 400

            elif frame.type_frame == "e_paper_arduino":
                # Pour Arduino, on ne peut pas envoyer un BMP genere a la volee
                # car le protocole attend une image stockee en GridFS.
                # On pourrait stocker temporairement — a voir en V2.
                logger.warning("[MUSIC] Mode musique non supporte pour Arduino (pas de GridFS temp)")
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
                    "state": state
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
            logger.info(f"[MUSIC] Fin musique, retour biblio → {frame.name}")
            return {"success": True, "restored": True}, 200
        except Exception as e:
            logger.warning(f"[MUSIC] Erreur restauration biblio: {e}")
            return {"message": "Erreur lors du retour a la bibliotheque"}, 500
