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

### 5. Fix perf webapp — suppression pattern N+1

La home V2 faisait 1 + N + N requêtes (GetAllFrames + N×GetFrame + N×GetPictureFile). Chaque `FrameStatusCard` relançait un `GET /api/frame/:id` individuel alors que `GET /api/frames` retournait déjà toutes les données (status, library_display, etc.).

**Fix** :
- `framesServices.js` : `GetAllFrames()` propage maintenant toutes les données de l'API via `...frame` spread
- `home.js` : `FrameStatusCard` reçoit l'objet `frame` complet au lieu d'un `frameId` → plus de `GetFrame()` individuel
- Import `GetFrame` retiré de `home.js`

**Résultat** : 1 + N requêtes au lieu de 1 + 2N (seuls les thumbnails restent en appels individuels).

Commit `a743e01` pushé + déploiement VPS en cours.

---

## Session 2026-05-03 — Debug connectivité Pi + stabilisation service

### 1. Erreur "Le cadre refuse la clé"

Symptôme : la webapp affichait "Le cadre a refusé la connexion (clé invalide ?)" sur le cadre SmartFrame2. Investigation :
- **Clé OK** : MongoDB contient `key: "ABC123"`, identique au `KEY = 'ABC123'` dans `app.py` du Pi
- **Cause réelle** : `ConnectionError` réseau, pas un rejet de clé. Le message d'erreur `FRAME_REFUSED` dans la webapp était trompeur → corrigé (`framesServices.js`)
- Cadres parasites trouvés en base : "Ip" et "New" avec `key: "AVC123"` (typo) → à nettoyer

### 2. Pi injoignable

- Pi éteint depuis le `shutdown -h now` du diagnostic hardware (session 2026-05-01)
- Reboot physique → nouvelle IP locale `192.168.86.38` (ancienne : `.28`)
- Tailscale actif : `100.77.205.119` (Pi) ↔ `100.106.203.45` (VPS) ✅
- IP en base MongoDB : `100.77.205.119` ✅ (IP Tailscale, stable)

### 3. Docker ne peut pas atteindre Tailscale

- Le conteneur API (réseau bridge `smartframe-net`) ne peut **pas** joindre `100.77.205.119` directement
- Test : `python3 -c "requests.get('http://100.77.205.119/')"` depuis le conteneur → `ConnectionRefused`
- **Mais** le conteneur atteint le host via `172.17.0.1` → le host route vers Tailscale
- **Constat** : ça fonctionne quand même car `requests.post("http://100.77.205.119/picture")` passe (vérifié par test Actualiser). Le routage Docker → host → Tailscale semble fonctionner pour les connexions sortantes, même si le test initial échouait.

### 4. Flask crashait en boucle (panneau HS)

Le service `smart-frame-client.service` était "active (running)" mais Flask crashait toutes les ~6 secondes :
- `app.py` ligne 23-25 : `epd.init()` + `epd.Clear()` bloquent dans `ReadBusy()` car le panneau est mort
- Flask ne démarrait jamais → port 80 jamais ouvert → API recevait `ConnectionError`

**Fix `app.py`** : init e-paper wrappée dans un thread avec timeout 10s :
- Si l'écran répond → `EPD_READY = True`, fonctionnement normal
- Si timeout → `EPD_READY = False`, Flask démarre quand même
- `/picture` accepte les images et retourne `200` avec warning si écran HS
- Toutes les fonctions e-paper (`image_frame`, `config_frame`, `boot_frame`) vérifient `EPD_READY` avant d'agir

**Résultat** : service stable, chaîne VPS → Tailscale → Pi → Flask validée. Quand le panneau neuf arrivera, un simple redémarrage du service suffira.

### 5. Message d'erreur webapp corrigé

`framesServices.js` : `FRAME_REFUSED` changé de "Le cadre a refusé la connexion (clé invalide ?)" → "Le cadre a refusé la connexion — vérifiez qu'il est allumé et sur le réseau" pour éviter la confusion.

---

## Session 2026-05-04 — Remplacement écran + HAT, remise en service

### 1. Réception nouveau kit

- Kit complet : panneau Waveshare 7.5" V2 800×480 neuf + HAT e-Paper Driver neuf
- L'ancien kit était un V3 (pas V2 comme supposé initialement) — V2 et V3 sont 100% compatibles (même driver `epd7in5_V2.py`)
- Décision : remplacement complet HAT + panneau pour repartir sur du neuf

### 2. Diagnostic initial — BUSY stuck

Premiers tests avec le nouveau kit : `BUSY pin = 0`, init bloque. Causes identifiées :
- **Le service `smart-frame-client.service` occupait le SPI/GPIO** → conflit avec les scripts de test
- **Les drivers `waveshare_epd` dans `SmartFrame-Client/lib/` dataient de 2019** (V4.0) → obsolètes pour un panneau fabriqué en 2026

### 3. Mise à jour drivers

- Clone frais du repo officiel : `git clone https://github.com/waveshare/e-Paper.git`
- Test officiel `epd_7in5_V2_test.py` : **écran fonctionne parfaitement** (busy release OK, images affichées, clear OK)
- Copie des drivers à jour dans `SmartFrame-Client/lib/waveshare_epd/`

### 4. Validation complète

- `app.py` : `[EPD] Ecran initialise OK` → `EPD_READY = True`
- Boot frame : IP + KEY affichés à l'écran ✅
- Actualiser depuis webapp : images envoyées et affichées ✅ (3 tests consécutifs)
- Service systemd : stable, `active (running)` après redémarrage ✅
- Test end-to-end via systemd : Actualiser → image affichée ✅

### 5. Résumé des changements

| Composant | Avant | Après |
|---|---|---|
| Panneau | V3 HS | V2 neuf, fonctionnel |
| HAT | Rev2.2 (ancien) | Neuf (du kit) |
| Drivers waveshare_epd | V4.0 (2019) | Dernière version GitHub (2026) |
| `app.py` | Crash en boucle (init bloque) | Patch EPD_READY + écran OK |
| Service systemd | Restart loop ~6s | Stable |

---

## Backlog

### Prioritaire
- ~~Reseat nappe FFC HAT↔panneau~~ → fait le 2026-05-01, sans effet
- ~~Déployer les derniers commits sur le VPS~~ → déployé le 2026-05-01
- ~~Commander panneau Waveshare 7.5" V2 800×480 neuf~~ → reçu et installé le 2026-05-04 ✅
- ~~Valider la nouvelle UI statut en condition réelle~~ → validé le 2026-05-04 ✅

### Améliorations communes (Pi + ESP32)
- **Diagnostic hardware avancé** : endpoint ou script de santé qui teste et distingue chaque maillon (VPS → Pi/ESP32 → HAT → nappe+écran). `GET /api/diagnostics` avec verdict par composant (OK/KO/UNREACHABLE)
- **Heartbeat** : `POST /api/frame/<id>/heartbeat` — côté Pi toutes les 60s, côté ESP32 à chaque réveil
- ~~Édition nom/IP cadre dans le modal Frame~~ → fait le 2026-05-04
- ~~Field `inch` corrigé~~ → fait le 2026-05-04 (800 → 7.5)
- **Frames list page** (`frames.js`) : reskin avec dots de statut
- ~~image.js modal : reskin boutons~~ → fait le 2026-05-04 ("Fermer" + "Envoyer →")
- ~~Renommer image~~ → fait le 2026-05-04 (PUT /api/picture/:id + inline edit)
- ~~Renommer bibliothèque~~ → fait le 2026-05-04 (inline edit dans library.js)
- ~~Nombre d'images par bibliothèque~~ → fait le 2026-05-04 (affiché dans la liste)
- **Frame en page dédiée** plutôt que modal (pour mobile)
- **Image multi-bibliothèque** : assigner une image à plusieurs bibliothèques (refactor modèle)
- **Stats cadre** : nombre d'images affichées, dernière activité, uptime (agrégation EventsLog)
- **Stats image** : compteur d'affichages
- **Cohérence miniature home ↔ écran réel** : s'assurer que le thumbnail reflète la dernière image effectivement affichée

### Backlog spécifique Pi (type `e_paper_raspbery`, mode push)
- **Wizard newFrame Pi** : auto-détection du Pi sur le réseau (Tailscale/mDNS)
- **Heartbeat daemon** : service systemd dédié envoyant un heartbeat toutes les 60s
- ~~Remplacement panneau e-paper 7.5" V2~~ → fait le 2026-05-04, kit complet neuf (HAT + panneau V2)

### Backlog spécifique ESP32 (type `e_paper_arduino`, mode pull)
- **Endpoint `GET /api/frame/<id>/next`** : retourne la prochaine image + delay pour le deep sleep (même logique random/order que `Post_To_Frame` mais en mode pull)
- **Firmware ESP32** : WiFi → GET /next → GET /picturefileframe → affichage GxEPD2 → deep sleep
- **Validation hardware** : câblage ESP32-WROOM-32 → HAT Rev2.2 → panneau 7.5" V2
- **Authentification ESP32** : token JWT longue durée ou clé API simple (les tokens JWT expirent)
- **Gestion batterie** : lecture tension ADC, indicateur batterie faible sur l'écran, alerte API
- **OTA updates** : mise à jour firmware ESP32 via endpoint API dédié ou ArduinoOTA
- **Mode config initial** : portail captif WiFi pour configurer SSID/password/token sans reflash
- **Batch d'images + invalidation intelligente** : `GET /api/frame/<id>/next?batch=N` + `HEAD` à chaque réveil. L'API maintient un `content_version` (incrémenté à chaque changement de biblio/images/delay). L'ESP32 compare la version en mémoire RTC avec le header `X-Content-Version` du HEAD : si différent → vide la queue locale et re-télécharge un batch. Si identique → affiche l'image suivante depuis la flash. Le HEAD détecte aussi `X-Pending-Refresh` (refresh forcé depuis la webapp). Coût HEAD : ~0.04 mAh/réveil. Détail complet : `docs/ESP32-AUTONOME.md`
- Cf. documentation complète : `docs/ESP32-AUTONOME.md`

### Architecture envisageable
- Queue (RQ/Celery) pour envois cadre au lieu de threads daemon (Pi uniquement — l'ESP32 pull ne nécessite pas de queue)
- SSE/WebSocket pour push statut temps réel au lieu de polling
- Modèle `FrameTelemetry` séparé d'`EventsLog` pour l'historique granulaire
- **Endpoint unifié `/api/frame/<id>/image`** : servir l'image optimisée quel que soit le type de cadre (Pi reçoit du RGB, ESP32 reçoit du BMP dithered)

---

## Contraintes & contexte

- VPS Scaleway `sd-150576` à `100.106.203.45` (Tailscale)
- Pi `smartframe-pi` à `100.77.205.119` (Tailscale, IP locale variable)
- API loopback : `http://127.0.0.1:8080/api/eventtoframe`
- Compose : `/opt/smartframe/docker-compose.prod.yml` + `.env.prod`
- Branches git : `scaleway` (V1 stable) / `scaleway-webapp-v2` (V2 en cours)
