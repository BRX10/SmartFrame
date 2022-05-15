from flask_jwt_extended import jwt_required
from flask_restful import Resource
from bson.json_util import dumps
from flask import Response
from database.models import EventsLog, User, Pictures, Librarys, Frames
from mongoengine.errors import FieldDoesNotExist, ValidationError
from resources.errors import SchemaValidationError, InternalServerError


class EventsLogAPI(Resource):
    @jwt_required()
    def get(self):
        try:
            eventsLog = EventsLog.objects.order_by('-created_at')

            eventsLog_list = []
            for eventLog in eventsLog:
                eventsLog_dict = eventLog.to_mongo().to_dict()
                eventsLog_dict['created_at'] = eventLog.created_at.isoformat()

                if eventLog.user:
                    eventsLog_dict['user'] = User.objects.only('username').get(id=eventLog.user.id).to_mongo().to_dict()
                
                if eventLog.picture:
                    picture = Pictures.objects.get(id=eventLog.picture.id)
                    eventsLog_dict['picture'] = picture.to_mongo().to_dict()
                    eventsLog_dict['picture']['library'] = Librarys.objects.get(id=picture.library.id).to_mongo().to_dict()

                if eventLog.library:
                    eventsLog_dict['library'] = Librarys.objects.get(id=eventLog.library.id).to_mongo().to_dict()

                if eventLog.frame:
                    eventsLog_dict['frame'] = Frames.objects.get(id=eventLog.frame.id).to_mongo().to_dict()

                eventsLog_list.append(eventsLog_dict)

            users = filter(lambda x: x["type_event"] == "user", eventsLog_list)
            servers = filter(lambda x: x["type_event"] == "server", eventsLog_list)

            rtn_json = {
                "Évenements": eventsLog_list,
                "Utilisateur": users,
                "Serveur": servers
            }

            # On return les frames
            return Response(dumps(rtn_json), mimetype="application/json", status=200)

        except (FieldDoesNotExist, ValidationError):
            raise SchemaValidationError

        except KeyError:
            raise SchemaValidationError

        except SchemaValidationError:
            raise SchemaValidationError

        except Exception as e:
            print(e)
            raise InternalServerError