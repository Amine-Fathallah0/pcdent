# Pcd-project — Dental Clinic Management MVP

A full-stack MVP for managing dental clinic workflows: patient-dentist relationships, appointments, real-time chat, CT scan uploads, and an AI-assisted dental report pipeline (YOLOv8 segmentation + LLM-generated reports).

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Django 5.2.1 + Django REST Framework |
| Auth | SimpleJWT (rotate + blacklist) |
| Database | PostgreSQL (via psycopg3) |
| Frontend | React + TypeScript + Vite |
| CORS | django-cors-headers |
| Realtime chat | Django Channels + WebSockets (Daphne ASGI server, Redis channel layer) |
| Async tasks | Celery 5 + Redis broker |
| AI segmentation | Ultralytics YOLOv8 (`yolov8m-seg.pt`, runs on CPU in the Celery worker) |
| AI report generation | OpenRouter LLM API (`nvidia/nemotron-3-nano-30b-a3b:free`) |

---

## Project Structure

```
Pcd-project/
├── pcdental/                       # Django backend
│   ├── dentapp/                    # Main application
│   │   ├── migrations/             # Database migrations
│   │   ├── services/               # AI service wrappers
│   │   │   ├── yolo_service.py     # YOLOv8 segmentation
│   │   │   └── report_service.py   # OpenRouter LLM client
│   │   ├── tasks/
│   │   │   └── analysis.py         # Celery task: YOLO + report pipeline
│   │   ├── models.py               # Domain models
│   │   ├── serializers.py          # DRF serializers
│   │   ├── views.py                # API views
│   │   ├── urls.py                 # App URL routing
│   │   ├── consumers.py            # WebSocket consumer (chat)
│   │   ├── routing.py              # WebSocket URL routing
│   │   ├── ws_auth.py              # JWT middleware for WS handshake
│   │   ├── signals.py              # post_save signals (chat + AI task trigger)
│   │   ├── admin.py                # Django admin registrations
│   │   └── middleware.py           # Security headers middleware
│   ├── mysite/                     # Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   ├── asgi.py                 # ProtocolTypeRouter (HTTP + WS)
│   │   └── celery.py               # Celery app instance
│   ├── models/                     # YOLO weights (yolov8m-seg.pt) — not in git
│   ├── .env                        # Local secrets (not committed)
│   ├── .env.example                # Environment variable template
│   └── manage.py
├── front-end/                      # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
│   └── public/
├── postman/                        # Postman collection for API testing
├── docker-compose.yml              # Redis service (used by Channels + Celery)
├── requirements.txt
└── .gitignore
```

---

## Domain Models

| Model | Description |
|---|---|
| `User` | Custom AbstractUser. UUID primary key. Email is unique. |
| `Dentist` | OneToOne profile linked to `User`. Holds location and contact info. |
| `Patient` | OneToOne profile linked to `User`. Holds DOB, contact, and address. |
| `DentistPatientLink` | Many-to-many through table. Auto-generates a unique 8-char connection code on creation. |
| `Appointment` | Linked to a `DentistPatientLink`. Soft-delete via `deleted_at`. |
| `CTScan` | Medical file upload (`.jpg`, `.jpeg`, `.png` for AI analysis; `.dcm`, `.nii`, `.nrrd` for storage-only) linked to a `DentistPatientLink`. Soft-delete. |
| `AIProcessingJob` | Tracks the AI pipeline state for a CT scan. Stores annotated image + mask once processing completes. |
| `AnnotatedScan` | Stores the colored YOLO segmentation overlay PNG produced from a CT scan. |
| `DentalReport` | The LLM-generated diagnostic report. Editable by the dentist; once `confirmed` it becomes immutable. |
| `Conversation` | One-to-one with `DentistPatientLink`. Auto-created via signal when a link becomes active. |
| `Message` | Belongs to a `Conversation`. Has `is_system` flag (welcome / status notices) and `is_read` flag. |

---

## API Endpoints

All endpoints are prefixed at the backend root (default: `http://localhost:8000`).

### Auth

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/dentists/register/` | Public | Register a new dentist account |
| `POST` | `/patients/register/` | Public | Register a new patient account |
| `POST` | `/login/` | Public | Obtain JWT access + refresh tokens |
| `POST` | `/logout/` | Required | Blacklist the refresh token |
| `GET` | `/me/` | Required | Get current authenticated user details |

### Appointments

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/appointments/` | Required | List appointments scoped to current user |
| `POST` | `/appointments/` | Required | Create a new appointment |
| `GET` | `/appointments/<id>/` | Required | Retrieve a single appointment |
| `PATCH` | `/appointments/<id>/` | Required | Update an appointment |
| `DELETE` | `/appointments/<id>/` | Required | Soft-delete an appointment |

### Dentist-Patient Links

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/links/` | Required | List active links for current user |

### CT Scans

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/ct-scans/` | Required | List CT scans scoped to current user |
| `POST` | `/ct-scans/` | Required | Upload a CT scan (multipart/form-data). Automatically queues the AI pipeline. |

### AI Processing Jobs

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/jobs/` | Required | List AI jobs scoped to current user |
| `GET` | `/jobs/<job_id>/` | Required | Retrieve a single job (with status, draft text, image URLs) |
| `POST` | `/jobs/<job_id>/generate-draft/` | Required | Re-queue the YOLO + report pipeline. Blocked if a non-error report already exists. |
| `GET` | `/jobs/<job_id>/annotated/` | Required | Stream the colored segmentation overlay PNG |
| `GET` | `/jobs/<job_id>/mask/` | Required | Stream the instance-ID mask PNG (R channel = instance ID, for hover tooltips) |
| `POST` | `/jobs/<job_id>/review/` | Dentist only | Submit review decision (`reviewed` or `finalized`) |

### Dental Reports

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/dental-reports/` | Required | List reports scoped to current user. Supports `?ct_scan__id=`, `?patient__id=`, `?status=`, `?created_after=`, `?created_before=` |
| `GET` | `/dental-reports/<id>/` | Required | Retrieve a single report |
| `PATCH` | `/dental-reports/<id>/edit/` | Dentist only | Edit `report_text`. Increments `edit_count`, sets `edited_by`, status → `edited`. Blocked once confirmed. |
| `POST` | `/dental-reports/<id>/confirm/` | Dentist only | Mark report `confirmed` (immutable from then on) |
| `DELETE` | `/dental-reports/<id>/delete/` | Dentist only | Soft-delete the report |

### Annotated Scans

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/annotated-scans/` | Required | List annotated overlay records. Supports `?ct_scan__id=` |
| `GET` | `/annotated-scans/<id>/image/` | Required | Stream the overlay PNG |

### Messaging (REST)

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/conversations/` | Required | List the current user's conversations with last message + unread count |
| `GET` | `/conversations/<id>/messages/` | Required | Fetch the last 100 messages in a conversation. Marks unread messages from the other party as read. |
| `POST` | `/conversations/<id>/messages/` | Required | Send a message. Broadcasts via WebSocket to both participants. Body: `{ "content": "..." }` |
| `POST` | `/conversations/<id>/read/` | Required | Mark all messages from the other party as read. Used when a message arrives in an already-open conversation. |

### Messaging (WebSocket)

| URL | Auth | Description |
|---|---|---|
| `ws://localhost:8000/ws/chat/?token=<JWT_ACCESS>` | JWT in query string | Single global connection per user. Push-only (sending happens via the REST endpoint). |

Server-pushed event payloads:

```json
{ "type": "message.new", "conversation_id": 12, "message": { ... MessageDto ... } }
{ "type": "conversation.read", "conversation_id": 12, "reader_id": "<uuid>" }
```

---

## Auth Flow

```
Register ──► Login ──► { access_token, refresh_token }
                              │
                        Bearer access_token
                        (5 min lifetime)
                              │
                    POST /token/refresh/ ──► new access_token
                    (requires refresh_token, 1 day lifetime,
                     rotated + blacklisted on each use)
                              │
                    POST /logout/ ──► refresh_token blacklisted
```

Tokens contain: `user_id`, `email`, `full_name`, `is_dentist`.

---

## AI Pipeline

End-to-end flow when a CT scan is uploaded:

```
POST /ct-scans/                              (frontend uploads .jpg/.png)
    │
    ▼
CTScan row + AIProcessingJob row created
    │
    ▼
post_save signal queues:
analyze_ct_scan_and_generate_report.delay(scan_id)
    │
    ▼  ──────────────────  Celery worker  ─────────────────
    │
    ├─ Step 1: YOLOv8 segmentation (local, CPU, in-process)
    │     • Loads pcdental/models/yolov8m-seg.pt once per worker
    │     • Produces:
    │         - detections: [{class, confidence, region, bbox}]
    │         - overlay PNG (colored segmentation masks blended at 45 %)
    │         - mask PNG (RGBA, R channel = instance ID)
    │     • Saves AnnotatedScan row with the overlay
    │
    ├─ Step 2: Report generation (OpenRouter HTTP call)
    │     • Sends detections + patient info as JSON to the LLM
    │     • Model: nvidia/nemotron-3-nano-30b-a3b:free
    │     • Saves DentalReport row with the generated text
    │
    └─ Step 3: Updates AIProcessingJob.status → 'draft_ready'
              and copies overlay + mask + draft text onto the job row
```

**Status machine** (`AIProcessingJob.status`):

```
queued ──► segmentation_pending ──► draft_ready ──► dentist_reviewed ──► finalized
                                          │
                                          ▼
                                       failed   (terminal — error_message set)
```

**Dentist workflow on the report** (`DentalReport.status`):

```
auto_generated ──► edited (PATCH /dental-reports/<id>/edit/) ──► confirmed (immutable)
                                                                       │
                                            DELETE /dental-reports/<id>/delete/ → soft-delete
```

**What runs where:**

| Component | Where | Notes |
|---|---|---|
| YOLOv8 inference | Celery worker process (local, CPU) | Model loaded once per worker via singleton |
| LLM report generation | Remote HTTP call to openrouter.ai | Free tier model, ~10-30 s latency |
| Redis (broker + Channels) | Docker container | The only thing in `docker-compose.yml` |
| Daphne ASGI server | Local process | Serves HTTP + WebSockets |
| Postgres | Local install | Stores everything except media files |
| Media files (uploaded scans, overlays, masks) | Local `media/` directory | Streamed via authenticated endpoints, never via the public `/media/` URL |

---

## Real-time Messaging

Dentist ↔ patient chat backed by Django Channels with a Redis channel layer. Persisted in PostgreSQL, pushed in real-time via a single global WebSocket per session.

**Design choices**

- One `Conversation` per `DentistPatientLink`, auto-created by a `post_save` signal when the link becomes active. A system welcome message is inserted as the first message (`is_system=True`).
- Existing approved links are backfilled by migration `0015_backfill_conversations`.
- One WebSocket connection per logged-in user — joined to a personal channel group (`user_<uuid>`). All conversations stream over that single connection so unread badges update even from other pages.
- WebSockets are **push-only**. Sending a message goes through the REST endpoint so validation, throttling, and permission checks stay in one place.
- JWT auth on the WebSocket: token is read from `?token=<access_token>` (browsers cannot send `Authorization` headers on WS handshakes). See [`dentapp/ws_auth.py`](pcdental/dentapp/ws_auth.py).
- Read tracking: opening a conversation, or receiving a message while it's already open, calls `POST /conversations/<id>/read/` which marks DB rows read and broadcasts `conversation.read` to the sender so their bubble flips to "read".

**Key files**

| File | Purpose |
|---|---|
| [`dentapp/consumers.py`](pcdental/dentapp/consumers.py) | `ChatConsumer` — joins per-user channel group on connect |
| [`dentapp/routing.py`](pcdental/dentapp/routing.py) | WebSocket URL patterns |
| [`dentapp/ws_auth.py`](pcdental/dentapp/ws_auth.py) | JWT middleware for WebSocket handshake |
| [`dentapp/signals.py`](pcdental/dentapp/signals.py) | Auto-creates `Conversation` + welcome message on link activation, queues AI pipeline on scan upload |
| [`mysite/asgi.py`](pcdental/mysite/asgi.py) | `ProtocolTypeRouter` splitting HTTP / WebSocket traffic |
| [`front-end/src/hooks/useChatSocket.ts`](front-end/src/hooks/useChatSocket.ts) | Global WebSocket hook with exponential reconnect |

---

## Local Development Setup

### Prerequisites

- Python 3.11+
- PostgreSQL (running locally)
- Node.js 18+ (for frontend)
- Docker Desktop (for Redis — broker for both Channels and Celery)
- An OpenRouter API key (free tier — get one at https://openrouter.ai/keys)
- The YOLO weights file `yolov8m-seg.pt` placed at `pcdental/models/yolov8m-seg.pt` (not committed — ask a teammate or download it from Ultralytics)

### One-time setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd Pcd-project

# 2. Create and activate a virtual environment
python -m venv env
source env/bin/activate          # Windows: env\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Configure environment
cp pcdental/.env.example pcdental/.env
# Edit pcdental/.env — fill in:
#   SECRET_KEY, DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
#   API_KEY=<your OpenRouter key>

# 5. Drop the YOLO weights at pcdental/models/yolov8m-seg.pt

# 6. Run database migrations
cd pcdental
python manage.py migrate

# 7. Create a superuser (optional, for /admin/)
python manage.py createsuperuser

# 8. Install frontend dependencies
cd ../front-end
npm install
```

### Every time you launch the project

You need **four** processes running. Open four terminals (or use a process manager).

**Terminal 1 — Redis** (keeps running in the background once started):

```bash
docker compose up -d redis
# verify: docker ps | grep redis
```

**Terminal 2 — Daphne (HTTP + WebSocket)** in your venv:

```bash
cd pcdental
python -m daphne -b 0.0.0.0 -p 8000 mysite.asgi:application
```

> ⚠️ **Do not use `python manage.py runserver`** — the dev server speaks WSGI only and can't serve WebSocket connections (chat will silently fail to connect). Daphne is required.

**Terminal 3 — Celery worker (AI pipeline)** in your venv:

```bash
cd pcdental
celery -A mysite worker -l info -P solo
```

> On Windows you must use `-P solo` (the default `prefork` pool relies on `fork()` which Windows doesn't have). Linux/macOS users can omit `-P solo`.

> The worker loads the ~50 MB YOLO model into memory on the first task — initial inference takes 5-10 s, subsequent ones are faster.

**Terminal 4 — Frontend (Vite dev server)**:

```bash
cd front-end
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (HTTP) | http://localhost:8000 |
| Backend (WebSocket) | ws://localhost:8000/ws/chat/ |
| Django admin | http://localhost:8000/admin/ |

### Quick health check

After all four are up, upload a `.jpg` or `.png` CT scan from the dentist UI. Watch the Celery terminal — you should see:

```
Task dentapp.tasks.analysis.analyze_ct_scan_and_generate_report[...] received
analyze task: report <id> created for scan <id> (<N> detections)
Task ... succeeded in <seconds>s
```

If you see `OpenRouter API key is required` → your `API_KEY` env var isn't set in `.env` (or you put it in `.env.example` instead — it must be in `.env`).
If you see `YOLO weights not found` → the weights file isn't at `pcdental/models/yolov8m-seg.pt`.

---

## Environment Variables

See [`pcdental/.env.example`](pcdental/.env.example) for the full list with descriptions.

Key variables:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key. Generate with `get_random_secret_key()`. Required. |
| `DB_*` | PostgreSQL connection settings. All required. |
| `DEBUG` | Set to `false` in production. |
| `JWT_ACCESS_MINUTES` | Access token lifetime (default: 5 min). |
| `JWT_REFRESH_DAYS` | Refresh token lifetime (default: 1 day). |
| `SECURE_SSL_REDIRECT` | Set to `true` in production behind HTTPS. |
| `REDIS_HOST` | Redis host for the Channels layer (default: `127.0.0.1`). |
| `REDIS_PORT` | Redis port (default: `6379`). |
| `CELERY_BROKER_URL` | Celery broker (default: `redis://localhost:6379/0`). |
| `CELERY_RESULT_BACKEND` | Celery result backend (default: same as broker). |
| `CELERY_WORKER_POOL` | `solo` on Windows, `prefork` elsewhere (auto-detected). |
| `YOLO_MODEL_PATH` | Override path to the YOLO weights (default: `<repo>/pcdental/models/yolov8m-seg.pt`). |
| `API_KEY` | **OpenRouter API key — required for report generation.** Exposed in code as `OPENROUTER_API_KEY`. |
| `REPORT_GENERATION_TIMEOUT` | Seconds to wait for the LLM response (default: 30). |

> ⚠️ **Never commit a real `API_KEY` to `.env.example`** — that file is in git. Use a placeholder there; put the real key only in `.env`.

---

## Running Tests

```bash
cd pcdental
python manage.py test dentapp
```

Current test coverage: auth registration and login flows (`dentapp/tests.py`).

---

## Security Notes

- All endpoints require JWT authentication except registration and login.
- Rate limiting: login (5/min), registration (10/hour) via `ScopedRateThrottle`.
- Refresh tokens are rotated and blacklisted on every use.
- Logout requires the refresh token and actively blacklists it.
- Emails are unique at the database level.
- File uploads validated by extension; medical files are streamed only through authenticated endpoints (`/ct-scans/<id>/file/`, `/jobs/<id>/annotated/`, `/jobs/<id>/mask/`, `/annotated-scans/<id>/image/`) — never exposed via the public `/media/` URL.
- Security headers applied via Django `SecurityMiddleware` and `SecurityHeadersMiddleware` (CSP, Referrer-Policy).
- Confirmed dental reports are immutable — edits are blocked at the view layer.
