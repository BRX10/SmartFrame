from dbm.ndbm import library
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask.helpers import send_file
from flask_restful import Resource
from bson.json_util import dumps
from flask import request, Response
from database.models import Pictures, Librarys, User, EventsLog
from mongoengine.errors import FieldDoesNotExist, ValidationError
from resources.errors import SchemaValidationError, InternalServerError, ExpiredSignatureError
from resources.draw_image import convert_image_arduino
from werkzeug.utils import secure_filename
import io


class PictureAPI(Resource):
    @jwt_required()
    def post(self, id):        
        try:
            form = request.form
            file = request.files['image']

            library = Librarys.objects.get(id=id).id

            new_picture = Pictures(
                name = form.get("name"),
                order = form.get("order"),
                library = library,
                file_name = secure_filename(file.filename),
                file = file
            )

            new_picture.save()


            # On envoie le log 
            EventsLog(
                type_event = "user",
                user = User.objects.get(id=get_jwt_identity()),
                library = library,
                picture = new_picture
            ).save()

            return {'result': str(new_picture.id)}, 200

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
    def get(self, id):
        try:
            picture = Pictures.objects.get(id=id)

            return Response(picture.to_json(), mimetype="application/json", status=200)

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
            delete_picture = Pictures.objects.get(id=id)
            delete_picture.update(is_active=False)

            # On envoie le log 
            EventsLog(
                type_event = "user",
                user = User.objects.get(id=get_jwt_identity()),
                picture = delete_picture,
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



class PictureFileFrameAPI(Resource):
    @jwt_required()
    def get(self, width, height, id):
        try:
            picture = Pictures.objects.get(id=id)
            image_read = picture.file.read()

            im = convert_image_arduino(image_read, (int(width), int(height)))

            img_io = io.BytesIO()
            im.save(img_io, 'bmp', quality=100)
            img_io.seek(0)

            return send_file(img_io, as_attachment=True, attachment_filename='file.bmp', mimetype='image/bmp')

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



class PictureFileAPI(Resource):
    @jwt_required()
    def get(self, id):
        try:
            picture = Pictures.objects.get(id=id)

            return send_file(picture.file, as_attachment=True, attachment_filename=picture.file_name)

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


class PicturesAPI(Resource):
    @jwt_required()
    def get(self, id):
        try:
            pictures = Pictures.objects(library=id,is_active=True).order_by('order')

            pictures_list = []
            for picture in pictures:
                picture_dict = picture.to_mongo().to_dict()
                picture_dict['created_at'] = picture.created_at.isoformat()
                pictures_list.append(picture_dict)

            librarys_json = dumps(pictures_list)

            return Response(librarys_json, mimetype="application/json", status=200)

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