# SmartFrame — Journal de développement

## État actuel

- **Webapp V2** : déployée sur la branche `scaleway-webapp-v2` (séparée de `scaleway` qui reste la V1 stable)
- **API** : refactor statut + perf en place (cf. session 2026-04-30/05-01)
- **Pi client** : code revert à l'état d'origine du repo `SmartFrame-Client`. Service systemd `smart-frame-client.service` actif.
- **Hardware Pi** : panneau e-paper actuellement KO (BUSY pin coincé, refresh impossible). Reseat de la nappe FFC HAT↔écran à faire à froid.

---

## Session 2026-04-30 → 2026-05-01

### 1. Redesign webapp V2 (UX)

- Nouvelle base : Tailwind dark (`zinc-950 / orange-500`), bottom-tab nav iOS-like
- Composants reskinnés : button, input, modal, select, postImage (+ gridMode), spinner, alert
- `Layout.js` (nouveau) remplace `Header.js` : tab bar mobile + sidebar desktop
- `Signin` redesign full-screen
- `home.js` : `FrameStatusCard` par cadre (nom, biblio, délai, dernière image, miniature, bouton Actualiser individuel) + flux activité unifié
- `Frame` modal : ✕ SVG, primary orange "Actualiser", `InfoRow`, danger zone 2 étapes pour suppression
- `Library` : grid responsive, délai éditable inline, mode lecture en Select
- `ArduinoLog` : `logStyle()` couleurs par type d'event

### 2. Déploiement scaleway-webapp-v2

Procédure définitive validée :
```bash
cd /opt/smartframe/source && sudo git pull origin scaleway-webapp-v2
docker compose -f /opt/smartframe/docker-compose.prod.yml --env-file /opt/smartframe/.env.prod build --no-cache
docker stop SmartFrame-api SmartFrame-mongo_db SmartFrame-webapp 2>/dev/null
docker rm SmartFrame-api SmartFrame-mongo_db SmartFrame-webapp 2>/dev/null
docker compose -f /opt/smartframe/docker-compose.prod.yml --env-file /opt/smartframe/.env.prod up -d
```

Pièges rencontrés :
- Files owned by root → `sudo chown` puis `git reset --hard origin/scaleway-webapp-v2`
- Cached old files → `--no-cache` obligatoire pour le build webapp
- Container conflicts avec `--no-deps` → `down` complet + `up -d` propre
- `--env-file /opt/smartframe/.env.prod` requis (sinon 502 sur API)

### 3. Bug DELETE cadre 500

`API/resources/frame.py` : le DELETE faisait un `requests.post` vers le Pi qui crashait avec 500 si le Pi était offline. Patché en try/except : la frame est marquée `is_active=False` même si le Pi ne répond pas.

### 4. Diagnostic hardware e-paper

Le panneau Waveshare 7.5" V2 ne se rafraîchit plus :
- `BUSY` pin GPIO 24 = 0 en permanence (display reporte "busy" continu)
- SPI fonctionne (`/dev/spidev0.0` accessible, contrôleur HAT répond)
- Reset agressif (3 cycles 500ms) : BUSY passe à 1 brièvement → init() → BUSY=0 → reste à 0
- Test minimal sans threading/multiprocessing : commandes envoyées sans erreur, **écran ne bouge pas**

**Diagnostic** : le contrôleur du HAT communique en SPI mais le panneau e-paper ne reçoit pas la haute tension de refresh (~30V). Causes possibles par ordre :
1. Nappe FFC entre HAT et panneau partiellement décrochée
2. Boost converter du HAT mort (composant fragile, peut claquer après plusieurs reboots à chaud)
3. Panneau e-paper en fin de vie

**Code Python** entièrement reverté à l'état git d'origine. Service systemd actif. À faire : reseat physique de la nappe FFC à froid.

### 5. Refactor statut + perf API (2026-05-01)

Suite à l'audit (pastilles vertes en dur, lenteur affectation biblio, erreurs vagues) :

**Modèle `Frames`** enrichi :
- `last_seen_at`, `last_success_at`, `last_error_at`, `last_error_code`, `last_error_message`

**API `frame.py`** :
- Helper `compute_frame_status(frame)` → `online | error | offline | unknown` selon timestamps
- `GET /api/frame[s]` retourne maintenant un champ `status`
- `PUT /api/frame/<id>` : envoi vers cadre en `threading.Thread(daemon=True)` → retour immédiat après update DB+cron au lieu d'attendre jusqu'à 30s

**API `events.py`** :
- Update `last_success_at` / `last_error_at` à chaque envoi cadre
- Format d'erreur structuré : `{ error: { code, message } }`
- Codes : `FRAME_OFFLINE` (ConnectTimeout), `FRAME_TIMEOUT` (ReadTimeout), `FRAME_REFUSED` (ConnectionError), `FRAME_HW`, `FRAME_UNKNOWN`
- Mapping via `classify_frame_error(exc)` dans `errors.py`

**Webapp `home.js`** :
- `FrameStatusCard` : pastille couleur dynamique (`bg-emerald` online, `bg-red` error, `bg-zinc` offline, `bg-amber` unknown) avec tooltip

**Webapp `framesServices.js`** :
- `FRAME_ERROR_MESSAGES` : mapping codes → messages user-friendly
- `EventToFrame()` lit `responseJson.error.code` et throw avec le bon message

---

## Session 2026-05-01 (suite) — Réinitialisation Pi & diagnostic final

### 1. Réinitialisation logicielle du Pi

- `sudo git reset --hard origin/main` → commit `1831638` (première version du projet)
- Dépendances vérifiées (Flask, RPi.GPIO, spidev, Pillow) — toutes déjà installées
- Service `smart-frame-client.service` arrêté pendant les tests

### 2. Tests hardware séquentiels

**Test BUSY pin** : `GPIO.input(24)` = 0 (stuck busy) au démarrage → confirmé identique à la session précédente.

**Test reset agressif (3 cycles RST pin 17)** :
- BUSY passe de 0 → 1 après reset ✅
- Le contrôleur du HAT répond au reset

**Test POWER ON (commande 0x04)** :
- Envoi direct sans passer par le driver → BUSY retombe à 0 immédiatement ✅
- Le boost converter du HAT fonctionne (génère la haute tension)

**Test init + clear complet (séquence manuelle)** :
- Toutes les commandes SPI passent sans erreur ✅ (POWER SETTING, PANEL SETTING, RESOLUTION, VCOM, TCON)
- 48 000 octets (800×480/8) envoyés via DATA START (0x13) ✅
- DISPLAY REFRESH (0x12) terminé, BUSY retombe à 0 ✅
- **Écran ne bouge pas** ❌

### 3. Reseat physique nappe FFC

- Pi éteint proprement (`shutdown -h now`), alimentation débranchée
- Nappe FFC HAT↔panneau retirée, vérifiée visuellement, réinsérée, loquet refermé
- Pi redémarré, même test relancé → **écran toujours immobile** ❌

### 4. Diagnostic final

| Composant | État | Preuve |
|-----------|------|--------|
| Pi (CPU, OS, GPIO, SPI) | ✅ OK | Toutes les commandes passent |
| HAT contrôleur | ✅ OK | BUSY répond, POWER ON fonctionne |
| HAT boost converter | ✅ OK | Commande 0x04 acceptée |
| Nappe FFC | ❓ Suspecte | Reseat n'a rien changé |
| Panneau e-paper | ❌ KO | Ne réagit à aucune commande |

**Conclusion** : le panneau Waveshare 7.5" V2 (800×480) est mort ou la nappe FFC a une trace interne cassée. La nappe étant solidaire du panneau sur ce modèle, **le panneau est à remplacer** (~35-50€).

**Code** : tout est propre et fonctionnel, le service redémarrera normalement avec un nouveau panneau.

---

## Backlog

### Prioritaire
- ~~Reseat nappe FFC HAT↔panneau~~ → fait le 2026-05-01, sans effet
- **Commander panneau Waveshare 7.5" V2 800×480 neuf** (~35-50€, nappe FFC intégrée)
- Une fois hardware OK : valider la nouvelle UI statut en condition réelle
- **Déployer les derniers commits sur le VPS** (status refactor + JOURNAL.md — 3 commits sur `scaleway-webapp-v2`)

### Améliorations identifiées
- **Heartbeat depuis le Pi** : `POST /api/frame/<id>/heartbeat` toutes les 60s pour alimenter `last_seen_at` (différencier "joignable mais EPD KO" de "complètement injoignable")
- **Édition IP cadre** dans le modal Frame (actuellement il faut passer par MongoDB)
- **Wizard newFrame** guidé avec auto-détection du Pi sur le réseau
- **Field `inch`** : valider à la saisie (cadre actuel a `inch=800` au lieu de `7.5`, bug d'affichage)
- **Frames list page** (`frames.js`) : reskin avec dots de statut
- **image.js modal** : reskin "Envoyer →"
- **Frame en page dédiée** plutôt que modal (pour mobile)

### Architecture envisageable
- Queue (RQ/Celery) pour envois cadre au lieu de threads daemon
- SSE/WebSocket pour push statut temps réel au lieu de polling
- Modèle `FrameTelemetry` séparé d'`EventsLog` pour l'historique granulaire

---

## Contraintes & contexte

- VPS Scaleway `sd-150576` à `100.106.203.45` (Tailscale)
- Pi `smartframe-pi` à `100.77.205.119` (Tailscale, IP locale variable)
- API loopback : `http://127.0.0.1:8080/api/eventtoframe`
- Compose : `/opt/smartframe/docker-compose.prod.yml` + `.env.prod`
- Branches git : `scaleway` (V1 stable) / `scaleway-webapp-v2` (V2 en cours)
