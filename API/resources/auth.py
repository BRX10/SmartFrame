from flask import Response, request
from flask_jwt_extended import create_access_token, get_jwt, jwt_required
from database.models import User, TokenBlacklisted
from flask_restful import Resource
import datetime
from mongoengine.errors import FieldDoesNotExist, NotUniqueError, DoesNotExist
from resources.errors import SchemaValidationError, UsernameAlreadyExistsError, UnauthorizedError, InternalServerError


class SignupAPI(Resource):
    def post(self):
        try:
            body = request.get_json()
            user = User(**body)
            user.hash_password()
            user.save()
            id = user.id
            return {'id': str(id)}, 200
        except FieldDoesNotExist:
            raise SchemaValidationError
        except NotUniqueError:
            raise UsernameAlreadyExistsError
        except Exception as e:
            raise InternalServerError


class LoginAPI(Resource):
    def post(self):
        try:
            body = request.get_json()
            user = User.objects.get(username=body.get('username'))
            authorized = user.check_password(body.get('password'))
            if not authorized:
                raise UnauthorizedError

            expires = datetime.timedelta(days=1000)
            access_token = create_access_token(identity=str(user.id), expires_delta=expires)
            return {'token': access_token}, 200
        except (UnauthorizedError, DoesNotExist):
            raise UnauthorizedError
        except Exception as e:
            raise InternalServerError


class LogoutAPI(Resource):
    @jwt_required()
    def delete(self):
        jti = get_jwt()["jti"]
        TokenBlacklisted(jti=jti, created_at=datetime.datetime.today()).save()
        return {'result': 'token revoked'}, 200