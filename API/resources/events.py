from flask_jwt_extended import jwt_required
from flask_restful import Resource
from flask import request
from database.models import Librarys, EventsLog, Frames, Pictures
from mongoengine.errors import FieldDoesNotExist, ValidationError
from resources.errors import SchemaValidationError, InternalServerError, ExpiredSignatureError
from PIL import Image
from flask.helpers import send_file
import requests
import random
import io 
import os

def calculate_crop_area(size_in, size):
    wi, hi = size_in
    w, h = size
    ratio_in = wi/hi
    ratio_out = w/h
    x = 0
    y = 0
    wo = None
    ho = None
    if ratio_in > ratio_out:
        wo = hi*ratio_out
        ho = hi
        x = (wi-wo)/2
    else:
        wo = wi
        ho = wi/ratio_out
        y = (hi-ho)/2
    return (x, y, x+wo, y+ho)


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

            name_file = "tmp_" + frame.name + "_" + library.name + "_" + picture.name + ".bmp"
            
            image = Image.open(io.BytesIO(image_read))
            crop = calculate_crop_area(image.size, size_frame)
            im = image.resize(size_frame, resample=Image.LANCZOS, box=crop)
            ## grayscale. this mainly prevents image artifacts
            im = im.convert('I')
            ## remove alpha channel to enable conversion to palette
            im = im.convert('RGB')
            im.save(name_file)

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

            os.remove(name_file)

            # On return l'id
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