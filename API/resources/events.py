from flask_jwt_extended import jwt_required
from flask_restful import Resource
from flask import request
from database.models import Librarys, EventsLog, Frames, Pictures
from mongoengine.errors import FieldDoesNotExist, ValidationError
from resources.errors import SchemaValidationError, InternalServerError, ExpiredSignatureError
from resources.draw_image import convert_image_raspberry
from slugify import slugify
import requests
import random
import json
import os



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
            
            ## Génération d'un nombre aléatoire
            random_picture = random.randint(0,len(pictures)-1)
            picture =  pictures[random_picture]
            image_read = pictures[random_picture].file.read()

            if frame.type_frame == "e_paper_raspbery":
                name_file = "tmp/" +slugify("tmp_" + frame.name + "_" + library.name + "_" + picture.name) + ".bmp"
                im = convert_image_raspberry(image_read, size_frame)
                im.save(name_file)

                try:
                    ## Envoie de la requete au client/server
                    payload = {'key': frame.key}
                    file_picture = {"bmp": open(name_file,'rb')}
                    requests.post("http://"+frame.ip+"/picture", files = file_picture, data=payload)

                    ## On envoie le log 
                    EventsLog(
                        type_event = "server",
                        frame = frame,
                        library = library,
                        picture = picture,
                        is_delete = False
                    ).save()

                except Exception as e:
                    print(e)
                    EventsLog(
                        type_event = "server-error",
                        frame = frame,
                        library = library,
                        picture = picture,
                        is_delete = False
                    ).save()
                    os.remove(name_file)
                    return {'message': 'Le cadre ne répond pas', 'status': 400}, 400

                # Suppresion de l'image tampon
                os.remove(name_file)
            
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
                    requests.post("http://"+frame.ip+"/post", data=payload)

                    ## On envoie le log 
                    EventsLog(
                        type_event = "server",
                        frame = frame,
                        library = library,
                        picture = picture,
                        is_delete = False
                    ).save()

                except Exception as e:
                    print(e)
                    EventsLog(
                        type_event = "server-error",
                        frame = frame,
                        library = library,
                        picture = picture,
                        is_delete = False
                    ).save()

                    return {'message': 'Le cadre ne répond pas', 'status': 400}, 400


            return {'message': 'success', 'status': 200}, 200

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