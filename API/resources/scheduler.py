"""Scheduler interne pour la rotation automatique des images.

Remplace l'ancien systeme python-crontab qui ecrivait dans la crontab systeme
(non fonctionnel dans Docker sans daemon cron).

Utilise APScheduler en mode BackgroundScheduler — tourne dans le meme processus
que Flask, pas besoin de daemon externe.

Au demarrage, reconstruit les jobs depuis la base (frames actives avec une
bibliotheque assignee). Quand on change la biblio d'un cadre, on met a jour le job.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta, timezone
import requests
import os
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(daemon=True)


# (2026-11-06) Pas de rotation photo pendant la musique : la rotation ecrasait
# l'ecran Now Playing (photo de la bibliotheque affichee entre deux morceaux).
# Garde-fou : si le listener ne signale plus rien depuis MUSIC_HOLD_MIN
# (pause longue, Pi arrete sans DELETE), la rotation reprend.
MUSIC_HOLD_MIN = 30


def _music_is_playing(frame_id):
    from database.models import Frames
    frame = Frames.objects(id=frame_id).only(
        'music_mode_enabled', 'music_now_playing', 'last_success_at').first()
    if not frame or not frame.music_mode_enabled or not frame.music_now_playing:
        return False
    last = frame.last_success_at
    return bool(last and datetime.utcnow() - last < timedelta(minutes=MUSIC_HOLD_MIN))


def _send_image_to_frame(frame_id, library_id):
    """Appelle POST /api/eventtoframe en loopback pour declencher la rotation."""
    try:
        if _music_is_playing(frame_id):
            logger.info(f"[SCHEDULER] Rotation suspendue (musique en cours): frame={frame_id}")
            return
    except Exception as e:
        logger.warning(f"[SCHEDULER] Verification musique impossible ({e}), rotation maintenue")
    try:
        auth = os.getenv("AUTH")
        requests.post(
            'http://127.0.0.1:8080/api/eventtoframe',
            headers={'Authorization': auth},
            data={'frame': frame_id, 'library': library_id},
            timeout=(5, 120)  # > attente Pi (45 s) + renvois sur cadre injoignable
        )
        logger.info(f"[SCHEDULER] Image envoyee: frame={frame_id} library={library_id}")
    except Exception as e:
        logger.warning(f"[SCHEDULER] Erreur envoi: frame={frame_id} — {e}")


def _first_run_after_restart(last_success_at, delay_min):
    """Premiere rotation apres un (re)demarrage de l'API.

    Sans cela, l'intervalle repartait de zero a chaque redemarrage : le cadre
    restait sans nouvelle image jusqu'a delay + duree d'arret, depassait la
    tolerance de compute_frame_status et declenchait une fausse alerte
    "offline" (incident 2026-11-04).
    On garde le rythme : last_success_at + delay si c'est encore a venir,
    sinon dans 1 minute.
    """
    now = datetime.now(timezone.utc)
    soon = now + timedelta(minutes=1)
    if last_success_at:
        last = last_success_at if last_success_at.tzinfo else last_success_at.replace(tzinfo=timezone.utc)
        due = last + timedelta(minutes=delay_min)
        if due > soon:
            return due
    return soon


def schedule_frame(frame_id, library_id, delay_minutes, last_success_at=None, at_startup=False):
    """Ajoute ou met a jour le job de rotation pour un cadre."""
    job_id = f"frame_{frame_id}"

    # Supprimer l'ancien job s'il existe
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    # delay_minutes peut etre en secondes (valeur historique MongoDB) — on detecte et convertit
    # Heuristique : si > 300, c'est probablement en secondes
    delay_val = max(1, int(delay_minutes))
    if delay_val > 300:
        delay_seconds = delay_val
        delay_min = max(1, delay_val // 60)
    else:
        delay_seconds = delay_val * 60
        delay_min = delay_val

    extra = {}
    if at_startup:
        extra['next_run_time'] = _first_run_after_restart(last_success_at, delay_min)

    scheduler.add_job(
        _send_image_to_frame,
        trigger=IntervalTrigger(minutes=delay_min),
        args=[str(frame_id), str(library_id)],
        id=job_id,
        name=f"Rotation cadre {frame_id}",
        replace_existing=True,
        misfire_grace_time=120,
        **extra
    )
    first = f", premiere rotation {extra['next_run_time'].isoformat()}" if extra else ""
    logger.info(f"[SCHEDULER] Job programme: frame={frame_id} toutes les {delay_min}min (raw delay={delay_val}){first}")


def unschedule_frame(frame_id):
    """Supprime le job de rotation pour un cadre."""
    job_id = f"frame_{frame_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        logger.info(f"[SCHEDULER] Job supprime: frame={frame_id}")


def rebuild_all_jobs():
    """Reconstruit tous les jobs depuis la base MongoDB.
    Appele au demarrage de l'application.
    """
    from database.models import Frames
    frames = Frames.objects(is_active=True)
    count = 0
    for frame in frames:
        if frame.library_display:
            try:
                delay = int(frame.library_display.delay) if frame.library_display.delay else 60
                schedule_frame(str(frame.id), str(frame.library_display.id), delay,
                               last_success_at=frame.last_success_at, at_startup=True)
                count += 1
            except Exception as e:
                logger.warning(f"[SCHEDULER] Impossible de planifier frame {frame.id}: {e}")
    logger.info(f"[SCHEDULER] {count} job(s) reconstruit(s) au demarrage")


def init_scheduler():
    """Initialise et demarre le scheduler, reconstruit les jobs."""
    if not scheduler.running:
        scheduler.start()
        logger.info("[SCHEDULER] Demarrage du scheduler APScheduler")
    rebuild_all_jobs()


def get_scheduled_jobs():
    """Retourne la liste des jobs planifies (pour debug/API)."""
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            'id': job.id,
            'name': job.name,
            'next_run': str(job.next_run_time) if job.next_run_time else None,
            'trigger': str(job.trigger)
        })
    return jobs
