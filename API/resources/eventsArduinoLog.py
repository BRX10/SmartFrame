from mongoengine.errors import FieldDoesNotExist, ValidationError
from resources.errors import SchemaValidationError, InternalServerError, ExpiredSignatureError
from database.models import EventsArduinoLog
from flask_jwt_extended import jwt_required
from flask import request, Response
from flask_restful import Resource


class EventsArduinoLogAPI(Resource):
    @jwt_required()
    def post(self):
        try:
            form = request.form

            arduino_log = EventsArduinoLog(
                type_event = form.get("type"),
                frame = form.get("frame"),
                message = form.get("message")
            )
            
            arduino_log.save()

            # On return l'id
            return {'result': str(arduino_log.id)}, 200

        except (FieldDoesNotExist, ValidationError):
            raise SchemaValidationError

        except KeyError:
            raise SchemaValidationError

        except SchemaValidationError:
            raise SchemaValidationError
        
        except ExpiredSignatureError:
            raise ExpiredSignatureError

        except Exception as e:
            print(e)
            raise InternalServerError


    def get(self):
        try:
            arduino_log = EventsArduinoLog.objects.order_by('-created_at').to_json()

            return Response(arduino_log, mimetype="application/json", status=200)
        except (FieldDoesNotExist, ValidationError):
            raise SchemaValidationError

        except KeyError:
            raise SchemaValidationError

        except SchemaValidationError:
            raise SchemaValidationError
        
        except ExpiredSignatureError:
            raise ExpiredSignatureError

        except Exception as e:
            print(e)
            raise InternalServerError