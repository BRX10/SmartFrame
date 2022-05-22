from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_restful import Resource
from bson.json_util import dumps
from flask import request, Response
from database.models import Frames, EventsLog, User, Librarys
from mongoengine.errors import FieldDoesNotExist, ValidationError
from resources.errors import SchemaValidationError, InternalServerError, ExpiredSignatureError
from crontab import CronTab
import requests
import os


class New_FrameAPI(Resource):
    @jwt_required()
    def post(self):        
        try:
            # Récupération des élements du posts
            form = request.form

            payload = {'key': form.get("key"),'config': True}
            response_json = requests.post("http://"+form.get("ip")+"/config", data=payload).json()

            if response_json.get("success"):
                new_frame = Frames(
                    name = form.get("name"),
                    ip = form.get("ip"),
                    inch = form.get("inch"),
                    resolution_width = form.get("rWidth"),
                    resolution_height = form.get("rHeight"),
                    key = form.get("key"),
                    type_frame = form.get("type")
                )

                # On envoie la frame
                new_frame.save()

                # On envoie le log 
                EventsLog(
                    type_event = "user",
                    user = User.objects.get(id=get_jwt_identity()),
                    frame = new_frame
                ).save()

                # On return l'id
                return {'result': str(new_frame.id)}, 200
            else:
                return {'message': response_json.get("message"), 'status': 400}, 400

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


class FrameAPI(Resource):
    @jwt_required()
    def get(self, id):
        try:
            # Récupération de la frame
            frame = Frames.objects.get(id=id)
            frame_dict = frame.to_mongo().to_dict()

            if frame.library_display:
                frame_dict["library_display"] = Librarys.objects.get(id=frame.library_display.id).to_mongo().to_dict()

            # On return la frame
            return Response(dumps(frame_dict), mimetype="application/json", status=200)

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

    @jwt_required()
    def put(self, id):
        try:
            form = request.form

            put_frame = Frames.objects.get(id=id)

            if put_frame.library_display:
                library_old = Librarys.objects.get(id=put_frame.library_display.id)
                EventsLog(
                    type_event = "user",
                    user = User.objects.get(id=get_jwt_identity()),
                    frame = put_frame,
                    library = library_old,
                    is_delete = True
                ).save()

            library_new = Librarys.objects.get(id=form.get("idLibrary"))
            put_frame.update(library_display=library_new)

            # On envoie le log 
            EventsLog(
                type_event = "user",
                user = User.objects.get(id=get_jwt_identity()),
                frame = put_frame,
                library = library_new,
                is_delete = False
            ).save()


            cron = CronTab(user='root')
            # Suppresion du cron si il existe
            for job in cron:
                if job.comment == id:
                    cron.remove(job)

            # Ajout du cron
            job = cron.new(command='python3 /API/resources/cron_post_to_frame.py '+id+' '+form.get("idLibrary")+' '+os.getenv("AUTH"), comment=id)
            job.minute.every(int(library_new.delay))
            cron.write()

            return {'success': True}, 200

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
    
    @jwt_required()
    def delete(self, id):
        try:
            delete_frame = Frames.objects.get(id=id)
            delete_frame.update(is_active=False)

            # On envoie le log 
            EventsLog(
                type_event = "user",
                user = User.objects.get(id=get_jwt_identity()),
                frame = delete_frame,
                is_delete = True
            ).save()

            return {'success': True}, 200

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


class FramesAPI(Resource):
    @jwt_required()
    def get(self):
        try:
            # Récupération des frames
            frames = Frames.objects(is_active=True).order_by('-created_at')

            frames_list = []
            for idx, frame in enumerate(frames):
                frame_dict = frame.to_mongo().to_dict()
                frame_dict['created_at'] = frame.created_at.isoformat()
                frame_dict['idx'] = idx+1
                
                if frame.library_display:
                    frame_dict['library_display'] = Librarys.objects.get(id=frame.library_display.id).to_mongo().to_dict()

                frames_list.append(frame_dict)
            
            frames_json = dumps(frames_list)

            # On return les frames
            return Response(frames_json, mimetype="application/json", status=200)

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