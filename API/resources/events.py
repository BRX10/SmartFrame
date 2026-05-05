from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_restful import Resource
from flask import request
from database.models import Librarys, EventsLog, Frames, Pictures, User
from mongoengine.errors import FieldDoesNotExist, ValidationError
from resources.errors import SchemaValidationError, InternalServerError, ExpiredSignatureError, classify_frame_error
from datetime import datetime
from resources.draw_image import convert_image_raspberry
from slugify import slugify
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import random
import json
import os
import time
import logging



MAX_RETRIES = 2
RETRY_DELAY = 5  # secondes entre chaque retry


class Post_To_Frame(Resource):
    @jwt_required()
    def post(self):
        try:
            form = request.form

            # Récupération du cadre et de la library
            frame = Frames.objects.get(id=form.get("frame"))
            size_frame = (int(frame.resolution_width), int(frame.resolution_height))
            library = Librarys.objects.get(id=form.get("library"))
            pictures = Pictures.objects(library=form.get("library"),is_active=True).order_by('order')
            
            picture = ""
            image_read = ""

            if library.action == "random":
                ## Génération d'un nombre aléatoire
                random_picture = random.randint(0,len(pictures)-1)
                picture =  pictures[random_picture]
                image_read = pictures[random_picture].file.read()

            elif library.action == "order":
                ## Récupération du dernier event pour en déterminer la derniere image de la library donc le chiffre de l'ordre
                try:
                    event = EventsLog.objects(frame=frame.id,library=library.id).order_by('-created_at').first()
                    order = int(event.picture.order)
                    if order >= len(pictures):
                        picture =  pictures[0]
                        image_read = pictures[0].file.read()
                    else:
                        picture =  pictures[order]
                        image_read = pictures[order].file.read()
                except:
                    # Il n'y a jamais eu d'event...
                    picture =  pictures[0]
                    image_read = pictures[0].file.read()


            if frame.type_frame == "e_paper_raspbery":
                name_file = "tmp/" +slugify("tmp_" + frame.name + "_" + library.name + "_" + picture.name) + ".bmp"
                im = convert_image_raspberry(image_read, size_frame)
                im.save(name_file)

                last_exception = None
                for attempt in range(MAX_RETRIES + 1):
                    try:
                        ## Envoie de la requete au client/server
                        payload = {'key': frame.key}
                        file_picture = {"bmp": open(name_file,'rb')}
                        requests.post("http://"+frame.ip+"/picture", files=file_picture, data=payload, timeout=(5, 25))

                        ## On envoie le log + statut frame OK
                        EventsLog(type_event="server", frame=frame, library=library, picture=picture, is_delete=False).save()
                        frame.update(last_success_at=datetime.utcnow(), last_seen_at=datetime.utcnow(), last_picture_id=str(picture.id))
                        last_exception = None
                        break

                    except Exception as e:
                        last_exception = e
                        if attempt < MAX_RETRIES:
                            time.sleep(RETRY_DELAY)

                if last_exception:
                    code = classify_frame_error(last_exception)
                    EventsLog(type_event="server-error", frame=frame, library=library, picture=picture, is_delete=False).save()
                    frame.update(last_error_at=datetime.utcnow(), last_error_code=code, last_error_message=str(last_exception)[:200])
                    try: os.remove(name_file)
                    except: pass
                    return {'error': {'code': code, 'message': 'Cadre injoignable'}, 'status': 400}, 400

                # Suppresion de l'image tampon
                try: os.remove(name_file)
                except: pass

            elif frame.type_frame == "e_paper_arduino":
                last_exception = None
                for attempt in range(MAX_RETRIES + 1):
                    try:
                        ## Envoie de la requete au client/server
                        payload = json.dumps({
                            "key": frame.key,
                            "host": os.getenv("HOST_SERVER"),
                            "port": os.getenv("PORT_SERVER"),
                            "path": "/api/picturefileframe/" + str(int(frame.resolution_width)) +'/'+ str(int(frame.resolution_height)) +'/',
                            "filename": str(picture.id),
                            "token": os.getenv("AUTH").replace("Bearer ", "")
                        })
                        requests.post("http://"+frame.ip+"/post", data=payload, timeout=(5, 25))

                        EventsLog(type_event="server", frame=frame, library=library, picture=picture, is_delete=False).save()
                        frame.update(last_success_at=datetime.utcnow(), last_seen_at=datetime.utcnow(), last_picture_id=str(picture.id))
                        last_exception = None
                        break

                    except Exception as e:
                        last_exception = e
                        if attempt < MAX_RETRIES:
                            time.sleep(RETRY_DELAY)

                if last_exception:
                    code = classify_frame_error(last_exception)
                    EventsLog(type_event="server-error", frame=frame, library=library, picture=picture, is_delete=False).save()
                    frame.update(last_error_at=datetime.utcnow(), last_error_code=code, last_error_message=str(last_exception)[:200])
                    return {'error': {'code': code, 'message': 'Cadre injoignable'}, 'status': 400}, 400


            return {'success': True, 'status': 200}, 200

        except (FieldDoesNotExist, ValidationError):
            raise SchemaValidationError

        except KeyError:
            raise SchemaValidationError

        except SchemaValidationError:
            raise SchemaValidationError

        except ExpiredSignatureError:
            raise ExpiredSignatureError

        except Exception as e:
            logging.exception(e)
            raise InternalServerError



class Post_To_Frame_ImageUser(Resource):
    @jwt_required()
    def post(self):        
        try:
            form = request.form

            # Récupération du cadre et de la library
            frame = Frames.objects.get(id=form.get("frame"))
            size_frame = (int(frame.resolution_width), int(frame.resolution_height))

            picture = Pictures.objects().get(id=form.get("picture"))
            image_read = picture.file.read()
            
           
            if frame.type_frame == "e_paper_raspbery":
                name_file = "tmp/" +slugify("tmp_" + frame.name + "_" + picture.name) + ".bmp"
                im = convert_image_raspberry(image_read, size_frame)
                im.save(name_file)

                try:
                    ## Envoie de la requete au client/server
                    payload = {'key': frame.key}
                    file_picture = {"bmp": open(name_file,'rb')}
                    requests.post("http://"+frame.ip+"/picture", files = file_picture, data=payload, timeout=30)

                    ## On envoie le log
                    EventsLog(
                        type_event = "user",
                        user = User.objects.get(id=get_jwt_identity()),
                        frame = frame,
                        picture = picture,
                        library = picture.library.id,
                        is_delete = False
                    ).save()
                    frame.update(last_success_at=datetime.utcnow(), last_seen_at=datetime.utcnow(), last_picture_id=str(picture.id))

                except Exception as e:
                    try: os.remove(name_file)
                    except: pass
                    return {'message': 'Le cadre ne répond pas', 'status': 400}, 400

                # Suppresion de l'image tampon
                try: os.remove(name_file)
                except: pass
            
            elif frame.type_frame == "e_paper_arduino":
                try:
                    ## Envoie de la requete au client/server
                    payload = json.dumps({
                        "key": frame.key,
                        "host": os.getenv("HOST_SERVER"),
                        "port": os.getenv("PORT_SERVER"),
                        "path": "/api/picturefileframe/" + str(int(frame.resolution_width)) +'/'+ str(int(frame.resolution_height)) +'/',
                        "filename": str(picture.id),
                        "token": os.getenv("AUTH").replace("Bearer ", "")
                    })
                    requests.post("http://"+frame.ip+"/post", data=payload, timeout=30)

                    ## On envoie le log
                    EventsLog(
                        type_event = "user",
                        user = User.objects.get(id=get_jwt_identity()),
                        frame = frame,
                        picture = picture,
                        library = picture.library.id,
                        is_delete = False
                    ).save()
                    frame.update(last_success_at=datetime.utcnow(), last_seen_at=datetime.utcnow(), last_picture_id=str(picture.id))

                except Exception as e:
                    return {'message': 'Le cadre ne répond pas', 'status': 400}, 400


            return {'success': True, 'status': 200}, 200

        except (FieldDoesNotExist, ValidationError):
            raise SchemaValidationError

        except KeyError:
            raise SchemaValidationError

        except SchemaValidationError:
            raise SchemaValidationError

        except ExpiredSignatureError:
            raise ExpiredSignatureError

        except Exception as e:
            logging.exception(e)
            raise InternalServerError