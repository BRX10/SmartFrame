"""Endpoint de configuration Enrichment Engine (V4-F).

GET  /api/settings/enrichment — retourne la config courante
PUT  /api/settings/enrichment — met a jour model, prompt, temperature, cles API
"""

from flask_jwt_extended import jwt_required
from flask_restful import Resource
from flask import request
from database.models import AppSettings
from resources.enrichment import _DEFAULT_SYSTEM_PROMPT, _DEFAULT_GROQ_MODEL
from resources.errors import InternalServerError
import logging

logger = logging.getLogger(__name__)

# Cles autorisees et leurs defauts
_SETTINGS_KEYS = {
    "groq_model_name": _DEFAULT_GROQ_MODEL,
    "groq_system_prompt": _DEFAULT_SYSTEM_PROMPT,
    "groq_temperature": "0.3",
    "groq_api_key": "",
    "lastfm_api_key": "",
}


class EnrichmentSettingsAPI(Resource):

    @jwt_required()
    def get(self):
        """Retourne la configuration enrichissement courante."""
        try:
            config = {}
            for key, default in _SETTINGS_KEYS.items():
                val = AppSettings.get_value(key, default)
                # Ne pas exposer les cles API en clair, juste si elles sont configurees
                if key.endswith("_api_key"):
                    config[key] = "configured" if val else ""
                else:
                    config[key] = val
            return config, 200
        except Exception as e:
            logging.exception(e)
            raise InternalServerError

    @jwt_required()
    def put(self):
        """Met a jour la configuration enrichissement."""
        try:
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form.to_dict()

            updated = []
            for key in _SETTINGS_KEYS:
                if key in data:
                    val = data[key]
                    # Ne pas ecraser une cle API avec "configured"
                    if key.endswith("_api_key") and val == "configured":
                        continue
                    AppSettings.set_value(key, val)
                    updated.append(key)
                    if not key.endswith("_api_key"):
                        logger.info(f"[SETTINGS] {key} = {val}")
                    else:
                        logger.info(f"[SETTINGS] {key} mis a jour")

            return {"success": True, "updated": updated}, 200

        except Exception as e:
            logging.exception(e)
            raise InternalServerError
