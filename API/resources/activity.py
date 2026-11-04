"""Endpoint unifie pour le tracker d'activite.

GET /api/activity?page=1&limit=50&type=all

Fusionne EventsLog + EventsArduinoLog, trie par date decroissante.
Filtrable par type : all, image, music, esp, error.

Perf (2026-11-04) : tri + limite faits par MongoDB (index created_at),
on ne lit que les (offset + limit) plus recents de chaque collection,
et les noms (cadre, image, bibliotheque) sont resolus en une requete
groupee par collection pour la seule page renvoyee (plus de N+1).
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

_EVENT_FILTERS = {
    "image": {"type_event__in": ["server", "user"]},
    "music": {"type_event__in": ["music", "music-end"]},
    "error": {"type_event": "server-error"},
}

MAX_LIMIT = 200


def _categorize(type_event):
    return _EVENT_CATEGORY.get(type_event, "other")


def _ref_id(value):
    """ReferenceField brut (as_pymongo) : ObjectId, DBRef ou dict → ObjectId."""
    if value is None:
        return None
    if isinstance(value, dict):
        return value.get("$id") or value.get("_id")
    return getattr(value, "id", value)


def _names(model, ids, fields=("name",)):
    """Charge en une requete {id: doc brut} pour une liste d'ids."""
    ids = [i for i in set(ids) if i is not None]
    if not ids:
        return {}
    return {d["_id"]: d for d in model.objects(id__in=ids).only(*fields).as_pymongo()}


def build_activity(page=1, limit=50, type_filter="all"):
    page = max(1, int(page))
    limit = max(1, min(int(limit), MAX_LIMIT))
    offset = limit * (page - 1)
    need = offset + limit

    raw = []
    total = 0

    # 1. EventsLog — images + musique + erreurs
    if type_filter != "esp":
        q = EventsLog.objects(**_EVENT_FILTERS.get(type_filter, {}))
        total += q.count()
        for d in (q.order_by('-created_at')
                   .only('id', 'created_at', 'type_event', 'message', 'frame', 'picture', 'library')
                   .limit(need).as_pymongo()):
            raw.append(("events", d))

    # 2. EventsArduinoLog — ESP/hardware
    if type_filter in ("all", "esp"):
        q = EventsArduinoLog.objects
        total += q.count()
        for d in (q.order_by('-created_at')
                   .only('id', 'created_at', 'type_event', 'message', 'frame')
                   .limit(need).as_pymongo()):
            raw.append(("arduino", d))

    # 3. Tri global + page, puis resolution groupee des noms
    raw.sort(key=lambda x: x[1]["created_at"], reverse=True)
    page_raw = raw[offset:offset + limit]

    frames = _names(Frames, [_ref_id(d.get("frame")) for _, d in page_raw])
    pictures = _names(Pictures, [_ref_id(d.get("picture")) for s, d in page_raw if s == "events"],
                      fields=("name", "library"))
    lib_ids = [_ref_id(d.get("library")) for s, d in page_raw if s == "events" and not d.get("picture")]
    lib_ids += [_ref_id(p.get("library")) for p in pictures.values()]
    librarys = _names(Librarys, lib_ids)

    items = []
    for source, d in page_raw:
        item = {
            "id": str(d["_id"]),
            "created_at": d["created_at"].isoformat(),
            "type_event": d.get("type_event"),
            "category": _categorize(d.get("type_event")) if source == "events" else "esp",
            "source": source,
            "message": d.get("message") or "",
        }

        frame_id = _ref_id(d.get("frame"))
        if frame_id is not None:
            f = frames.get(frame_id)
            item["frame_name"] = f.get("name") if f else "?"

        if source == "events":
            pic_id = _ref_id(d.get("picture"))
            if pic_id is not None:
                p = pictures.get(pic_id)
                if p:
                    item["picture_name"] = p.get("name") or ""
                    lib = librarys.get(_ref_id(p.get("library")))
                    if lib:
                        item["library_name"] = lib.get("name")
            else:
                lib = librarys.get(_ref_id(d.get("library")))
                if lib:
                    item["library_name"] = lib.get("name")

            # Message auto si pas de message explicite
            if not item["message"] and item["type_event"] in ("server", "user"):
                parts = []
                if item.get("picture_name"):
                    parts.append(item["picture_name"])
                if item.get("library_name"):
                    parts.append(f"→ {item['library_name']}")
                item["message"] = " ".join(parts) if parts else "Image envoyée"

            if not item["message"] and item["type_event"] == "server-error":
                item["message"] = "Erreur d'envoi"

        items.append(item)

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "has_more": (offset + limit) < total,
    }


class ActivityAPI(Resource):

    @jwt_required()
    def get(self):
        """Retourne l'activite fusionnee, paginee, filtrable."""
        try:
            return build_activity(
                request.args.get("page", 1),
                request.args.get("limit", 50),
                request.args.get("type", "all"),
            ), 200

        except ExpiredSignatureError:
            raise ExpiredSignatureError
        except Exception as e:
            logger.exception(f"[ACTIVITY] Erreur: {e}")
            raise InternalServerError
