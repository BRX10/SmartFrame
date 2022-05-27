from database.db import db
from datetime import datetime
from flask_bcrypt import generate_password_hash, check_password_hash


class User(db.Document):
    created_at = db.DateTimeField(required=True, default=datetime.utcnow)
    username = db.StringField(required=True, unique=True, min_length=5)
    password = db.StringField(required=True, min_length=6)

    def hash_password(self):
        self.password = generate_password_hash(self.password).decode('utf8')

    def check_password(self, password):
        return check_password_hash(self.password, password)


class TokenBlacklisted(db.Document):
    jti = db.StringField(required=True)
    created_at = db.DateTimeField(required=True)


class Frames(db.Document):
    created_at = db.DateTimeField(required=True, default=datetime.utcnow)
    name = db.StringField(required=True)
    ip = db.StringField(required=True)
    inch = db.DecimalField(required=True)
    resolution_width = db.DecimalField(required=True)
    resolution_height = db.DecimalField(required=True)
    key = db.StringField(required=True)
    type_frame = db.StringField(required=True)
    is_active = db.BooleanField(required=True, default=True)
    library_display = db.ReferenceField('Librarys')
    orientation = db.StringField(required=True)


class Librarys(db.Document):
    created_at = db.DateTimeField(required=True, default=datetime.utcnow)
    name = db.StringField(required=True)
    delay = db.DecimalField(required=True)
    is_active = db.BooleanField(required=True, default=True)
    

class Pictures(db.Document):
    created_at = db.DateTimeField(required=True, default=datetime.utcnow)
    name = db.StringField(required=True)
    order = db.DecimalField(required=True)
    library = db.ReferenceField('Librarys')
    file_name = db.StringField()
    file = db.FileField(required=True)
    is_active = db.BooleanField(required=True, default=True)


class EventsLog(db.Document):
    created_at = db.DateTimeField(required=True, default=datetime.utcnow)
    type_event = db.StringField(required=True)
    user = db.ReferenceField('User')
    library = db.ReferenceField('Librarys')
    frame = db.ReferenceField('Frames')
    picture = db.ReferenceField('Pictures')
    is_delete = db.BooleanField(required=True, default=False)

class EventsArduinoLog(db.Document):
    created_at = db.DateTimeField(required=True, default=datetime.utcnow)
    type_event = db.StringField(required=True)
    frame = db.ReferenceField('Frames')
    message = db.StringField(required=True)