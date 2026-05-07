"""Endpoint unifie pour le tracker d'activite.

GET /api/activity?page=1&limit=50&type=all

Fusionne EventsLog + EventsArduinoLog, trie par date decroissante.
Filtrable par type : all, image, music, esp, error.
"""

from flask_jwt_extended import jwt_required
from flask_restful import Resource
from flask import request
from database.models import EventsLog, EventsArduinoLog, Frames, Librarys, Pictures
from resources.errors import InternalServerError, ExpiredSignatureError
import logging

logger = logging.getLogger(__name__)

# Mapping type_event → categorie pour le filtre
_EVENT_CATEGORY = {
    "server": "image",
    "user": "image",
    "server-error": "error",
    "music": "music",
    "music-end": "music",
}


def _categorize(type_event):
    return _EVENT_CATEGORY.get(type_event, "other")


class ActivityAPI(Resource):

    @jwt_required()
    def get(self):
        """Retourne l'activite fusionnee, paginee, filtrable."""
        try:
            page = int(request.args.get("page", 1))
            limit = int(request.args.get("limit", 50))
            type_filter = request.args.get("type", "all")

            offset = limit * (page - 1)
            items = []

            # 1. EventsLog — images + musique + erreurs
            events_query = EventsLog.objects.order_by('-created_at')

            if type_filter == "image":
                events_query = events_query.filter(type_event__in=["server", "user"])
            elif type_filter == "music":
                events_query = events_query.filter(type_event__in=["music", "music-end"])
            elif type_filter == "error":
                events_query = events_query.filter(type_event="server-error")
            elif type_filter == "esp":
                events_query = events_query.none()  # Pas d'ESP dans EventsLog

            if type_filter != "esp":
                for ev in events_query:
                    item = {
                        "id": str(ev.id),
                        "created_at": ev.created_at.isoformat(),
                        "type_event": ev.type_event,
                        "category": _categorize(ev.type_event),
                        "source": "events",
                        "message": ev.message or "",
                    }

                    # Frame
                    if ev.frame:
                        try:
                            f = Frames.objects.only('name').get(id=ev.frame.id)
                            item["frame_name"] = f.name
                        except:
                            item["frame_name"] = "?"

                    # Picture + Library
                    if ev.picture:
                        try:
                            p = Pictures.objects.only('name', 'library').get(id=ev.picture.id)
                            item["picture_name"] = p.name or ""
                            if p.library:
                                lib = Librarys.objects.only('name').get(id=p.library.id)
                                item["library_name"] = lib.name
                        except:
                            pass
                    elif ev.library:
                        try:
                            lib = Librarys.objects.only('name').get(id=ev.library.id)
                            item["library_name"] = lib.name
                        except:
                            pass

                    # Message auto pour images si pas de message explicite
                    if not item["message"] and ev.type_event in ("server", "user"):
                        parts = []
                        if item.get("picture_name"):
                            parts.append(item["picture_name"])
                        if item.get("library_name"):
                            parts.append(f"→ {item['library_name']}")
                        item["message"] = " ".join(parts) if parts else "Image envoyée"

                    if not item["message"] and ev.type_event == "server-error":
                        item["message"] = "Erreur d'envoi"

                    items.append(item)

            # 2. EventsArduinoLog — ESP/hardware
            if type_filter in ("all", "esp"):
                arduino_query = EventsArduinoLog.objects.order_by('-created_at')
                for al in arduino_query:
                    item = {
                        "id": str(al.id),
                        "created_at": al.created_at.isoformat(),
                        "type_event": al.type_event,
                        "category": "esp",
                        "source": "arduino",
                        "message": al.message or "",
                    }
                    if al.frame:
                        try:
                            f = Frames.objects.only('name').get(id=al.frame.id)
                            item["frame_name"] = f.name
                        except:
                            item["frame_name"] = "?"
                    items.append(item)

            # 3. Tri global par date decroissante + pagination
            items.sort(key=lambda x: x["created_at"], reverse=True)
            page_items = items[offset:offset + limit]

            return {
                "items": page_items,
                "page": page,
                "limit": limit,
                "total": len(items),
                "has_more": (offset + limit) < len(items),
            }, 200

        except ExpiredSignatureError:
            raise ExpiredSignatureError
        except Exception as e:
            logger.exception(f"[ACTIVITY] Erreur: {e}")
            raise InternalServerError
