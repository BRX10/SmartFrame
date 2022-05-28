from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_restful import Resource
from bson.json_util import dumps
from flask import request, Response
from database.models import Librarys, EventsLog, User
from mongoengine.errors import FieldDoesNotExist, ValidationError
from resources.errors import SchemaValidationError, InternalServerError, ExpiredSignatureError


class New_LibraryAPI(Resource):
    @jwt_required()
    def post(self):        
        try:
            form = request.form

            new_library = Librarys(
                name = form.get("name"),
                delay = form.get("delay"),
                action = form.get("action")
            )

            # On envoie la frame
            new_library.save()

            # On envoie le log 
            EventsLog(
                type_event = "user",
                user = User.objects.get(id=get_jwt_identity()),
                library = new_library
            ).save()

            # On return l'id
            return {'result': str(new_library.id)}, 200

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


class LibraryAPI(Resource):
    @jwt_required()
    def get(self, id):
        try:
            librarys = Librarys.objects.get(id=id).to_json()

            return Response(librarys, mimetype="application/json", status=200)

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
            library = Librarys.objects.get(id=id)

            if form.get("library"):
                library.update(name=form.get("library"))

            if form.get("delay"):
                library.update(delay=form.get("delay"))

            if form.get("action"):
                library.update(action=form.get("action"))

            library = Librarys.objects.get(id=id).to_json()
            

            return Response(library, mimetype="application/json", status=200)

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
            delete_librarys = Librarys.objects.get(id=id)
            delete_librarys.update(is_active=False)

            # On envoie le log 
            EventsLog(
                type_event = "user",
                user = User.objects.get(id=get_jwt_identity()),
                library = delete_librarys,
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


class LibrarysAPI(Resource):
    @jwt_required()
    def get(self):
        try:
            librarys = Librarys.objects(is_active=True).order_by('-created_at')

            librarys_list = []
            for idx, library in enumerate(librarys):
                library_dict = library.to_mongo().to_dict()
                library_dict['created_at'] = library.created_at.isoformat()
                library_dict['idx'] = idx+1
                librarys_list.append(library_dict)
            
            librarys_json = dumps(librarys_list)

            # On return les frames
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