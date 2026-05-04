from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_restful import Resource
from bson.json_util import dumps
from flask import request, Response
from database.models import Frames, EventsLog, User, Librarys
from mongoengine.errors import FieldDoesNotExist, ValidationError
from resources.errors import SchemaValidationError, InternalServerError, ExpiredSignatureError
from crontab import CronTab
from datetime import datetime, timedelta
import requests
import os
import threading


def compute_frame_status(frame):
    """Calcule un statut runtime du cadre base sur les timestamps stockes.
    online   : last_success_at < 5min  ou  last_seen_at < 2min
    error    : last_error_at plus recent que last_success_at  ET  < 10min
    offline  : sinon
    unknown  : aucun timestamp
    """
    now = datetime.utcnow()
    last_ok = frame.last_success_at
    last_err = frame.last_error_at
    last_seen = frame.last_seen_at

    if last_seen and (now - last_seen) < timedelta(minutes=2):
        return "online"
    if last_ok and (now - last_ok) < timedelta(minutes=5):
        return "online"
    if last_err and (now - last_err) < timedelta(minutes=10):
        if not last_ok or last_err > last_ok:
            return "error"
    if not (last_ok or last_err or last_seen):
        return "unknown"
    return "offline"


def _send_to_frame_async(frame_id, library_id, auth_header):
    """Envoie l'image au cadre en background pour ne pas bloquer le PUT."""
    try:
        requests.post(
            'http://127.0.0.1:8080/api/eventtoframe',
            headers={'Authorization': auth_header},
            data={'frame': frame_id, 'library': library_id},
            timeout=(3, 30)
        )
    except Exception:
        pass  # erreurs deja loggees dans events.py via last_error_at


class New_FrameAPI(Resource):
    @jwt_required()
    def post(self):        
        try:
            # Récupération des élements du posts
            form = request.form

            new_frame = Frames(
                    name = form.get("name"),
                    ip = form.get("ip"),
                    inch = form.get("inch"),
                    resolution_width = form.get("rWidth"),
                    resolution_height = form.get("rHeight"),
                    key = form.get("key"),
                    type_frame = form.get("type"),
                    orientation = form.get("orientation")
                )

            # On envoie la frame
            new_frame.save()

            # Tentative de configuration du Pi (non-bloquant)
            # Si le Pi est injoignable, le Frame est quand même créé
            pi_configured = False
            try:
                payload = {
                    'key': form.get("key"), 
                    'config': True, 
                    'frame': str(new_frame.id),
                    'token': os.getenv("AUTH").replace("Bearer ", ""),
                    'host': os.getenv("HOST_SERVER")
                }
                response_json = requests.post("http://"+form.get("ip")+"/config", data=payload, timeout=8).json()
                if response_json.get("success"):
                    pi_configured = True
            except:
                pass  # Pi injoignable ou timeout — on continue quand meme

            # Log dans tous les cas
            EventsLog(
                type_event = "user",
                user = User.objects.get(id=get_jwt_identity()),
                frame = new_frame
            ).save()

            return {'result': str(new_frame.id), 'pi_configured': pi_configured}, 200

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
            frame_dict["status"] = compute_frame_status(frame)

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

            # Mise a jour des proprietes du cadre (nom, ip)
            if form.get("name"):
                put_frame.update(name=form.get("name"))
            if form.get("ip"):
                put_frame.update(ip=form.get("ip"))

            # Si pas de changement de bibliotheque, retourner directement
            if not form.get("idLibrary") and (form.get("name") or form.get("ip")):
                put_frame.reload()
                frame_dict = put_frame.to_mongo().to_dict()
                return Response(dumps(frame_dict), mimetype="application/json", status=200)

            if put_frame.library_display:
                library_old = Librarys.objects.get(id=put_frame.library_display.id)
                EventsLog(
                    type_event = "user",
                    user = User.objects.get(id=get_jwt_identity()),
                    frame = put_frame,
                    library = library_old,
                    is_delete = True
                ).save()


            cron = CronTab(user='root')
            # Suppresion du cron si il existe
            for job in cron:
                if job.comment == id:
                    cron.remove(job)


            if form.get("idLibrary") == "disable_library_frame":
                put_frame.update(unset__library_display=True)
            else:
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

                # Ajout du cron
                job = cron.new(command='python3 /API/resources/cron_post_to_frame.py '+id+' '+form.get("idLibrary")+' '+os.getenv("AUTH"), comment=id)
                job.minute.every(int(library_new.delay))

                # Actualisation du frame en BACKGROUND (n'attend pas la reponse du Pi)
                threading.Thread(
                    target=_send_to_frame_async,
                    args=(id, form.get("idLibrary"), os.getenv("AUTH")),
                    daemon=True
                ).start()

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

            # Tentative de reset du Pi (non-bloquant — on supprime même si injoignable)
            try:
                payload = {
                    'key': delete_frame.key,
                    'config': False,
                }
                requests.post("http://"+delete_frame.ip+"/reset", data=payload, timeout=8)
            except Exception:
                pass  # Pi hors ligne ou timeout — on continue quand même

            delete_frame.update(is_active=False)

            cron = CronTab(user='root')
            # Suppression du cron si il existe
            for job in cron:
                if job.comment == id:
                    cron.remove(job)
            cron.write()

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
                frame_dict['status'] = compute_frame_status(frame)

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