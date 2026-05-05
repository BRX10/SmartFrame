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
import requests
import os
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(daemon=True)


def _send_image_to_frame(frame_id, library_id):
    """Appelle POST /api/eventtoframe en loopback pour declencher la rotation."""
    try:
        auth = os.getenv("AUTH")
        requests.post(
            'http://127.0.0.1:8080/api/eventtoframe',
            headers={'Authorization': auth},
            data={'frame': frame_id, 'library': library_id},
            timeout=(5, 30)
        )
        logger.info(f"[SCHEDULER] Image envoyee: frame={frame_id} library={library_id}")
    except Exception as e:
        logger.warning(f"[SCHEDULER] Erreur envoi: frame={frame_id} — {e}")


def schedule_frame(frame_id, library_id, delay_minutes):
    """Ajoute ou met a jour le job de rotation pour un cadre."""
    job_id = f"frame_{frame_id}"

    # Supprimer l'ancien job s'il existe
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    delay = max(1, int(delay_minutes))
    scheduler.add_job(
        _send_image_to_frame,
        trigger=IntervalTrigger(minutes=delay),
        args=[str(frame_id), str(library_id)],
        id=job_id,
        name=f"Rotation cadre {frame_id}",
        replace_existing=True,
        misfire_grace_time=60
    )
    logger.info(f"[SCHEDULER] Job programme: frame={frame_id} toutes les {delay}min")


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
                schedule_frame(str(frame.id), str(frame.library_display.id), delay)
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
