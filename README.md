# Pcd-project — Dental Clinic Management MVP

A full-stack MVP for managing dental clinic workflows: patient-dentist relationships, appointments, CT scan uploads, and an AI-assisted report pipeline (currently in fallback/stub mode).

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



---

## Project Structure

```
Pcd-project/
├── pcdental/               # Django backend
│   ├── dentapp/            # Main application
│   │   ├── migrations/     # Database migrations (0001–0006)
│   │   ├── models.py       # Domain models
│   │   ├── serializers.py  # DRF serializers
│   │   ├── views.py        # API views
│   │   ├── urls.py         # App URL routing
│   │   ├── admin.py        # Django admin registrations
│   │   └── middleware.py   # Security headers middleware
│   ├── mysite/             # Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── .env                # Local secrets (not committed)
│   ├── .env.example        # Environment variable template (committed)
│   └── manage.py
├── front-end/              # React + TypeScript frontend
│   ├── src/
│   │   ├── components/     # UI and layout components
│   │   ├── pages/          # Route-level page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # API client and utilities
│   └── public/
├── postman/                # Postman collection for API testing
├── requirements.txt        # Python dependencies
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
| `CTScan` | Medical file upload (`.dcm`, `.nii`, `.nrrd`) linked to a `DentistPatientLink`. Soft-delete. |
| `AIProcessingJob` | Tracks the AI report pipeline for a CT scan. Currently runs in fallback/stub mode. |
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
| `POST` | `/ct-scans/` | Required | Upload a CT scan (multipart/form-data). Automatically creates an `AIProcessingJob`. |

### AI Processing Jobs

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/jobs/` | Required | List AI jobs scoped to current user |
| `GET` | `/jobs/<job_id>/` | Required | Retrieve a single job |
| `POST` | `/jobs/<job_id>/generate-draft/` | Required | Trigger draft report generation (fallback mode) |
| `POST` | `/jobs/<job_id>/review/` | Dentist only | Submit review decision (`reviewed` or `finalized`) |

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

## AI Job Status Machine

```
queued
  └─► segmentation_pending   (set on CT scan upload)
        └─► report_requested  (intermediate — reserved for async worker)
              └─► draft_ready  (fallback stub report generated)
                    └─► dentist_reviewed
                          └─► finalized
failed                         (terminal error state)
```

The AI pipeline is currently in **fallback mode** — `generate-draft` returns a stub report immediately. The full segmentation service is not yet connected.

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
| [`dentapp/signals.py`](pcdental/dentapp/signals.py) | Auto-creates `Conversation` + welcome message on link activation |
| [`mysite/asgi.py`](pcdental/mysite/asgi.py) | `ProtocolTypeRouter` splitting HTTP / WebSocket traffic |
| [`front-end/src/hooks/useChatSocket.ts`](front-end/src/hooks/useChatSocket.ts) | Global WebSocket hook with exponential reconnect |

---

## Local Development Setup

### Prerequisites

- Python 3.11+
- PostgreSQL (running locally)
- Node.js 18+ (for frontend)
- Docker (for the Redis channel layer used by chat)

### Backend

```bash
# 1. Clone the repo
git clone <repo-url>
cd Pcd-project

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Configure environment
cp pcdental/.env.example pcdental/.env
# Edit pcdental/.env — fill in SECRET_KEY, DB_* credentials

# 5. Run migrations
cd pcdental
python manage.py migrate

# 6. Create a superuser (optional, for /admin/)
python manage.py createsuperuser

# 7. Start Redis (required for real-time chat; one-time setup, auto-starts after)
docker run -d -p 6379:6379 --name redis-chat --restart always redis:alpine

# 8. Start the backend with Daphne (ASGI — required for WebSockets)
python -m daphne -b 0.0.0.0 -p 8000 mysite.asgi:application
```

Backend runs at `http://localhost:8000` (HTTP) and `ws://localhost:8000/ws/chat/` (WebSocket).

> ⚠️ **Do not use `python manage.py runserver`** if you want chat to work. The dev server speaks WSGI only and cannot serve WebSocket connections — Daphne is required. HTTP endpoints work the same way under either server.

> **Redis** runs as a background Docker container with `--restart always`, so it auto-starts whenever Docker Desktop is running. Verify with `docker ps | grep redis-chat`.

### Frontend

```bash
cd front-end
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

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
- File uploads restricted to `.dcm`, `.nii`, `.nrrd` extensions.
- Security headers applied via Django `SecurityMiddleware` and `SecurityHeadersMiddleware` (CSP, Referrer-Policy).
