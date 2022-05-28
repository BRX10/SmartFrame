from mongoengine.errors import FieldDoesNotExist, ValidationError
from resources.errors import SchemaValidationError, InternalServerError, ExpiredSignatureError
from database.models import EventsArduinoLog, Frames
from flask_jwt_extended import jwt_required
from flask import request, Response
from flask_restful import Resource
from bson.json_util import dumps


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


class EventsArduinoLogPaginateAPI(Resource):
    def post(self):
        try:
            form = request.form

            page = 1
            if form.get("page"):
                page = int(form.get("page"))
            page_limit = 50
            if form.get("limit"):
                page_limit = int(form.get("limit"))

            arduinoLogs = EventsArduinoLog.objects.order_by('-created_at').skip(page_limit * (page - 1)).limit(page_limit)

            arduinoLog_list = []
            for arduinoLog in arduinoLogs:
                arduinoLog_dict = arduinoLog.to_mongo().to_dict()
                arduinoLog_dict['created_at'] = arduinoLog.created_at.isoformat()

                if arduinoLog.frame:
                    arduinoLog_dict['frame'] = Frames.objects.get(id=arduinoLog.frame.id).to_mongo().to_dict()

                arduinoLog_list.append(arduinoLog_dict)


            return Response(dumps(arduinoLog_list), mimetype="application/json", status=200)
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