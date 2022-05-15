from flask import Flask
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager

from resources.routes import initialize_routes
from database.db import initialize_db
from database.models import TokenBlacklisted
from flask_restful import Api
from resources.errors import errors
import os


# Initialisation de l'API
app = Flask(__name__)
app.config['MONGODB_SETTINGS'] = { 'host': os.getenv("DATABASE_URI") }
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY")

api = Api(app, errors=errors)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

initialize_db(app)
initialize_routes(api, app)


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    token = TokenBlacklisted.objects(jti=jti)
    return len(token) > 0
