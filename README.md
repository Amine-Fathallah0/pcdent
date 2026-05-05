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
| Realtime (planned) | Django Channels + WebSockets |



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

## Local Development Setup

### Prerequisites

- Python 3.11+
- PostgreSQL (running locally)
- Redis (for Celery broker/result backend)
- Node.js 18+ (for frontend)

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

# 7. Start the backend
python manage.py runserver

# 8. Start the Celery worker (required for CT scan processing)
# Windows uses a solo pool by default in settings.py to avoid WinError 5.
celery -A mysite worker --loglevel=info
```

Backend runs at `http://localhost:8000`.

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
