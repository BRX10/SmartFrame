from resources.auth import SignupAPI, LoginAPI, LogoutAPI
from resources.frame import New_FrameAPI, FrameAPI, FramesAPI
from resources.library import New_LibraryAPI, LibraryAPI, LibrarysAPI
from resources.picture import PictureAPI, PicturesAPI, PictureFileAPI, PictureFileFrameAPI
from resources.eventsLog import EventsLogAPI
from resources.events import Post_To_Frame


def initialize_routes(api, app):

    api.add_resource(Post_To_Frame, '/api/eventtoframe')

    api.add_resource(EventsLogAPI, '/api/eventslog')

    api.add_resource(PictureFileFrameAPI, '/api/picturefileframe/<width>/<height>/<id>')
    api.add_resource(PictureFileAPI, '/api/picturefile/<id>')
    api.add_resource(PictureAPI, '/api/picture/<id>')
    api.add_resource(PicturesAPI, '/api/pictures/<id>')  

    api.add_resource(New_LibraryAPI, '/api/library')   
    api.add_resource(LibraryAPI, '/api/library/<id>')
    api.add_resource(LibrarysAPI, '/api/librarys')  
    
    api.add_resource(New_FrameAPI, '/api/frame')   
    api.add_resource(FrameAPI, '/api/frame/<id>')
    api.add_resource(FramesAPI, '/api/frames')  

    api.add_resource(SignupAPI, '/api/auth/signup')
    api.add_resource(LoginAPI, '/api/auth/login')
    api.add_resource(LogoutAPI, '/api/auth/logout')