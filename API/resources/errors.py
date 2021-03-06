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