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
    # Statut runtime — alimentés par /eventtoframe et /heartbeat
    last_seen_at = db.DateTimeField()         # heartbeat ou ping reussi
    last_success_at = db.DateTimeField()      # dernier envoi image OK
    last_error_at = db.DateTimeField()
    last_error_code = db.StringField()        # FRAME_TIMEOUT, FRAME_REFUSED, FRAME_HW, ...
    last_error_message = db.StringField()
    last_picture_id = db.StringField()        # ID de la derniere image envoyee
    # Mode musique (V4-E)
    music_mode_enabled = db.BooleanField(default=False)
    music_idle_timeout = db.IntField(default=120)   # secondes avant retour photo
    music_mask = db.StringField(default="poster")   # masque visuel Now Playing
    music_chromecast_name = db.StringField()        # nom du Chromecast a ecouter (ex: "Nest Mini salon")
    music_display_scale = db.IntField(default=100)   # % de l'ecran utilise pour le rendu musique (50-100)


class Librarys(db.Document):
    created_at = db.DateTimeField(required=True, default=datetime.utcnow)
    name = db.StringField(required=True)
    delay = db.DecimalField(required=True)
    is_active = db.BooleanField(required=True, default=True)
    action = db.StringField(required=True)
    

class Pictures(db.Document):
    created_at = db.DateTimeField(required=True, default=datetime.utcnow)
    name = db.StringField(required=True)
    order = db.DecimalField(required=True)
    library = db.ReferenceField('Librarys')
    file_name = db.StringField()
    file = db.FileField(required=True)
    is_active = db.BooleanField(required=True, default=True)
    display_count = db.IntField(default=0)


class TrackMetadata(db.Document):
    """Cache d'enrichissement des morceaux (V4-F Enrichment Engine)."""
    slug = db.StringField(required=True, unique=True)   # artist__title__album
    title = db.StringField()
    artist = db.StringField()
    album = db.StringField()
    # Enrichissement
    year = db.StringField()
    tags = db.ListField(db.StringField())               # Last.fm top tags (max 5)
    listeners = db.IntField()                            # Last.fm listeners
    hook_phrase = db.StringField(max_length=80)          # Groq-extracted hook
    lyrics_available = db.BooleanField(default=False)
    # Tracabilite
    model_used = db.StringField()                        # ex: llama3-8b-8192
    prompt_version = db.StringField()                    # hash du prompt utilise
    created_at = db.DateTimeField(default=datetime.utcnow)
    enriched_at = db.DateTimeField()
    is_complete = db.BooleanField(default=False)         # True si enrichissement termine (ou rien a enrichir)

    meta = {'collection': 'tracks_metadata'}


class AppSettings(db.Document):
    """Configuration cle-valeur (Groq, Last.fm, etc.)."""
    key = db.StringField(required=True, unique=True)
    value = db.StringField()

    meta = {'collection': 'app_settings'}

    @staticmethod
    def get_value(key, default=None):
        doc = AppSettings.objects(key=key).first()
        return doc.value if doc else default

    @staticmethod
    def set_value(key, value):
        AppSettings.objects(key=key).update_one(set__value=str(value), upsert=True)


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