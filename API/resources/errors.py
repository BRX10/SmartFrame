class InternalServerError(Exception):
    pass


class SchemaValidationError(Exception):
    pass


class MovieAlreadyExistsError(Exception):
    pass


class TreeViewAlreadyExistsError(Exception):
    pass


class UpdatingMovieError(Exception):
    pass


class DeletingMovieError(Exception):
    pass


class MovieNotExistsError(Exception):
    pass


class UsernameAlreadyExistsError(Exception):
    pass


class UnauthorizedError(Exception):
    pass


class UsernameDoesnotExistsError(Exception):
    pass


class BadTokenError(Exception):
    pass


class ExpiredSignatureError(Exception):
    pass


class RevokedTokenError(Exception):
    pass


class InvalidHeaderError(Exception):
    pass


class WrongTokenError(Exception):
    pass


# ── Erreurs cadre structurees ────────────────────────────────────────────────
# Codes machine-readable utilises par le frontend pour mapper en messages clairs.
FRAME_ERROR_CODES = {
    "FRAME_OFFLINE":   "Le cadre est injoignable sur le reseau",
    "FRAME_TIMEOUT":   "Le cadre n'a pas repondu dans le temps imparti",
    "FRAME_REFUSED":   "Le cadre a refuse la connexion",
    "FRAME_KEY":       "La cle du cadre est invalide",
    "FRAME_HW":        "Le cadre a recu la commande mais l'ecran n'a pas pu etre mis a jour",
    "FRAME_UNKNOWN":   "Erreur inconnue lors de la communication avec le cadre",
    "LIBRARY_EMPTY":   "La bibliotheque ne contient aucune image",
    "LIBRARY_MISSING": "Aucune bibliotheque assignee a ce cadre",
}


# Envoi d'une image au Pi : (phase connexion + envoi du fichier, attente reponse).
# - 1er terme : urllib3 l'applique a la connexion ET a chaque ecriture pendant
#   l'envoi du BMP (~1,15 Mo). Sur ligne domestique saturee (~1 Mbit/s, latence
#   jusqu'a 450 ms le 2026-11-05) l'envoi calait > 5 s -> echec. 30 s.
# - 2e terme : le Pi ne repond qu'apres le rafraichissement e-paper. 45 s.
# Pire cas cadre injoignable (3 essais) : 3 x 30 + 2 x 5 = 100 s < 120 s des
# appels internes vers /api/eventtoframe.
PI_PICTURE_TIMEOUT = (30, 45)

_UNREACHABLE_MARKERS = ("NewConnectionError", "Failed to establish", "Connection refused",
                        "No route to host", "Name or service not known", "Network is unreachable")


def frame_unreachable(exc):
    """True si la connexion au cadre n'a pas pu etre etablie (renvoi utile).

    False si la connexion etait etablie (cadre lent, coupure en cours de reponse) :
    le cadre est peut-etre encore en train d'afficher, un renvoi lancerait un
    second affichage concurrent sur l'e-paper (risque de blocage, cf. 2026-11-05).
    """
    import requests
    if isinstance(exc, requests.exceptions.ConnectTimeout):
        return True
    if isinstance(exc, requests.exceptions.ReadTimeout):
        return False
    if isinstance(exc, requests.exceptions.ConnectionError):
        return any(m in str(exc) for m in _UNREACHABLE_MARKERS)
    return False


def classify_frame_error(exc):
    """Mappe une exception requests vers un code d'erreur structure."""
    import requests
    if isinstance(exc, requests.exceptions.ConnectTimeout):
        return "FRAME_OFFLINE"
    if isinstance(exc, requests.exceptions.ReadTimeout):
        return "FRAME_TIMEOUT"
    if isinstance(exc, requests.exceptions.ConnectionError):
        if frame_unreachable(exc):
            return "FRAME_REFUSED"
        if "timed out" in str(exc):
            return "FRAME_TIMEOUT"
        return "FRAME_REFUSED"
    return "FRAME_UNKNOWN"


errors = {
    "InternalServerError": {
        "message": "Quelque chose s'est mal passé",
        "status": 500
    },
    "SchemaValidationError": {
        "message": "Il manque des champs obligatoires à la demande",
        "status": 400
    },
    "UsernameAlreadyExistsError": {
        "message": "L'utilisateur avec l'adresse e-mail indiquée existe déjà",
        "status": 400
    },
    "TreeViewAlreadyExistsError": {
        "message": "Le TreeView existe déjà",
        "status": 400
    },
    "UnauthorizedError": {
        "message": "Nom d'utilisateur ou mot de passe invalide",
        "status": 401
    },
    "UsernameDoesnotExistsError": {
        "message": "Impossible de trouver l'utilisateur avec le nom d'utilisateur donnée",
        "status": 400
    },
    "BadTokenError": {
        "message": "Jeton invalide",
        "status": 403
    },
    "ExpiredSignatureError": {
        "message": "Le token a expiré",
        "status": 401
    },
    "RevokedTokenError": {
        "message": "Le token a expiré",
        "status": 401
    },
    "InvalidHeaderError": {
        "message": "Header Invalid",
        "status": 500
    },
    "WrongTokenError": {
         "message": "Le token a expiré",
        "status": 401
    }
}