# PCDent — AI-Powered Dental Assistance System

PCDent is a full-stack AI-powered dental assistance platform designed to support dentists in the analysis of panoramic dental radiographs and the management of clinical workflows.

The system combines a secure dental workflow web application with an AI-assisted radiographic analysis pipeline. It supports patient and dentist registration, role-based access, patient-dentist relationships, appointment management, dental scan upload, AI job tracking, real-time messaging, AI-assisted report generation, and dentist validation of generated findings.

The platform follows a **dentist-in-the-loop** philosophy: AI outputs are used as decision-support information, while the final interpretation and validation remain under the responsibility of the dentist.

---

## Project Overview

This project was developed as part of a Design and Development Project at ENSI.

The main objective is to provide an end-to-end dental assistance system that connects:

- dental clinic workflow management,
- panoramic dental image upload and storage,
- AI-based dental detection and segmentation,
- AI-assisted report generation,
- real-time dentist-patient communication,
- dentist review and final validation.

The implemented platform uses **YOLOv8m-seg** as the practical production model for dental detection and segmentation. In parallel, the project also explores **D-MODE** — Dental Mask-aware Object Detection Engine — as a research-oriented transformer-based architecture combining **DINOv2**, **RT-DETR**, and a mask prediction head.

---

## Main Features

### User Management

- Dentist and patient registration
- Secure login and logout
- JWT authentication with refresh-token rotation
- Role-based access control
- User profile management

### Patient-Dentist Workflow

- Dentist-patient relationship management
- Unique connection code system
- Patient list and linked patient access
- Appointment creation, consultation, update, and soft deletion

### Dental Scan Management

- Upload of dental radiographic images
- Association of scans with a patient-dentist relationship
- Secure storage and authenticated file access
- AI processing job creation after scan upload

> Note: some backend model and route names still use `CTScan` and `/ct-scans/` for implementation compatibility. In the context of the final project, these represent uploaded dental panoramic scan files.

### AI-Assisted Dental Analysis

- YOLOv8m-seg inference on uploaded dental radiographs
- Detection of dental findings
- Instance segmentation masks
- Confidence scores
- Annotated scan overlays
- AI job status tracking

### AI-Assisted Report Generation

- Structured report draft generation from AI detections
- Report editing by the dentist
- Dentist review workflow
- Final report validation
- Confirmed reports become immutable

### Real-Time Messaging

- Dentist-patient conversations
- WebSocket-based real-time updates
- Unread message tracking
- Read status synchronization
- Persistent message storage in PostgreSQL

### Research and Evaluation

- YOLOv8m-seg production stream
- D-MODE research stream
- COCO-style evaluation
- Per-class analysis
- Threshold sweep and calibration analysis
- Qualitative comparison of AI outputs

---

## AI Component

The AI work is organized into two complementary streams.

### 1. Production Stream — YOLOv8m-seg

YOLOv8m-seg is integrated into the platform as the practical AI model used for inference. It produces:

- detected dental findings,
- class labels,
- confidence scores,
- bounding boxes,
- segmentation masks,
- annotated image overlays,
- structured outputs for report generation.

This model is used in the dentist-facing workflow because it provided the strongest practical behavior during final evaluation.

### 2. Research Stream — D-MODE

D-MODE stands for:

**Dental Mask-aware Object Detection Engine**

It is a transformer-based experimental architecture designed for dental detection and instance segmentation. It combines:

- **DINOv2** as a self-supervised visual backbone,
- **RT-DETR** as a query-based object detector,
- a **mask prediction head** for instance-level segmentation.

D-MODE is documented and evaluated as a research contribution. It is not the production model used in the deployed web workflow, but it provides a foundation for future improvements in dental image analysis.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI / Styling | Tailwind CSS, HeroUI, Radix UI, Lucide React |
| Backend | Django 5.2.1, Django REST Framework |
| Authentication | SimpleJWT |
| Realtime | Django Channels, WebSockets, Daphne |
| Async Processing | Celery |
| Broker / Channel Layer | Redis |
| Database | PostgreSQL |
| AI / Computer Vision | Ultralytics YOLO, PyTorch, OpenCV |
| Report Generation | OpenRouter LLM API |
| API Testing | Postman |
| Development Tools | Docker, Git, GitHub, VS Code, Kaggle Notebooks |

---

## Repository Structure

```text
pcdent/
├── .postman/                         # Postman-related files
├── Report Generation/                # Report generation module/material
├── docs/                             # Project documentation and design notes
├── front-end/                        # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
│   ├── public/
│   └── package.json
├── notebooks/                        # AI experimentation notebooks
│   ├── d-mode_results.ipynb
│   └── yolo_results (1).ipynb
├── pcdental/                         # Django backend
│   ├── dentapp/                      # Main Django application
│   │   ├── migrations/
│   │   ├── services/                 # AI and report service wrappers
│   │   ├── tasks/                    # Celery tasks
│   │   ├── models.py                 # Domain models
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── consumers.py              # WebSocket consumer
│   │   ├── routing.py                # WebSocket routing
│   │   ├── ws_auth.py                # JWT middleware for WebSockets
│   │   └── signals.py                # Signals for conversations and AI jobs
│   ├── mysite/                       # Django project configuration
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   ├── wsgi.py
│   │   └── celery.py
│   ├── media/                        # Local uploaded/generated media
│   ├── .env.example
│   └── manage.py
├── docker-compose.yml                # Redis service
├── requirements.txt                  # Python dependencies
├── package.json                      # Root frontend-related dependencies
└── README.md
```

---

## System Architecture

The system follows a modular multi-layer architecture.

### Presentation Layer

The frontend provides web interfaces for:

- patients,
- dentists,
- administrators.

It handles navigation, authentication screens, dashboards, appointment views, scan upload interfaces, messaging, and AI-assisted report review pages.

### Application Layer

The Django REST backend manages:

- authentication,
- user profiles,
- patient-dentist links,
- appointments,
- dental scan records,
- AI processing jobs,
- reports,
- conversations,
- permissions and access control.

### AI Processing Layer

The AI layer performs:

- dental detection,
- instance segmentation,
- annotated image generation,
- mask generation,
- report preparation from structured AI outputs.

### Data Layer

The data layer stores:

- users,
- patients,
- dentists,
- appointments,
- conversations,
- messages,
- uploaded scans,
- AI jobs,
- detection outputs,
- annotated scans,
- generated and validated reports.

---

## Core Domain Models

| Model | Role |
|---|---|
| `User` | Custom user model for authentication |
| `Patient` | Patient profile linked to a user account |
| `Dentist` | Dentist profile linked to a user account |
| `DentistPatientLink` | Clinical relationship between a dentist and patient |
| `Appointment` | Appointment linked to a dentist-patient relationship |
| `CTScan` | Uploaded dental scan file |
| `AIProcessingJob` | Tracks the AI workflow status for a scan |
| `AnnotatedScan` | Stores the generated annotated scan overlay |
| `DentalReport` | Stores AI-generated, edited, and confirmed reports |
| `Conversation` | One conversation per dentist-patient relationship |
| `Message` | Dentist-patient chat message |

---

## AI Workflow

When a dentist uploads a dental scan, the system follows this workflow:

```text
Dental scan upload
        ↓
Scan record created
        ↓
AIProcessingJob created
        ↓
Celery task queued
        ↓
YOLOv8m-seg inference
        ↓
Detections, masks, confidence scores generated
        ↓
Annotated scan overlay saved
        ↓
AI-assisted report draft generated
        ↓
Dentist reviews and edits the report
        ↓
Report marked as reviewed or finalized
```

The AI output is not considered a final diagnosis. It is a decision-support result that must be reviewed and validated by the dentist.

---

## AI Job Status Flow

```text
queued
  ↓
segmentation_pending
  ↓
draft_ready
  ↓
dentist_reviewed
  ↓
finalized
```

If an error occurs during processing:

```text
failed
```

---

## Report Status Flow

```text
auto_generated
  ↓
edited
  ↓
confirmed
```

Confirmed reports are treated as final and cannot be edited again through the normal workflow.

---

## Main API Groups

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/dentists/register/` | Register a dentist |
| `POST` | `/patients/register/` | Register a patient |
| `POST` | `/login/` | Obtain JWT access and refresh tokens |
| `POST` | `/token/refresh/` | Refresh access token |
| `POST` | `/logout/` | Logout and blacklist refresh token |
| `GET` | `/me/` | Get current authenticated user |

### Patient-Dentist Links

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/links/` | List current user links |
| `GET` | `/links/active/` | List active links |
| `GET` | `/links/pending/` | List pending links |
| `POST` | `/links/request/` | Request a dentist-patient connection |

### Appointments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/appointments/` | List appointments |
| `POST` | `/appointments/` | Create appointment |
| `GET` | `/appointments/<id>/` | Retrieve appointment |
| `PATCH` | `/appointments/<id>/` | Update appointment |
| `DELETE` | `/appointments/<id>/` | Soft-delete appointment |

### Dental Scans

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/ct-scans/` | List uploaded dental scans |
| `POST` | `/ct-scans/` | Upload a dental scan |
| `GET` | `/ct-scans/<id>/file/` | Retrieve scan file |

### AI Processing Jobs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/jobs/` | List AI jobs |
| `GET` | `/jobs/<job_id>/` | Retrieve job details |
| `POST` | `/jobs/<job_id>/generate-draft/` | Re-run AI report generation |
| `GET` | `/jobs/<job_id>/annotated/` | Get annotated overlay |
| `GET` | `/jobs/<job_id>/mask/` | Get generated mask |
| `POST` | `/jobs/<job_id>/review/` | Submit dentist review decision |

### Dental Reports

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dental-reports/` | List dental reports |
| `GET` | `/dental-reports/<id>/` | Retrieve report |
| `PATCH` | `/dental-reports/<id>/edit/` | Edit report text |
| `POST` | `/dental-reports/<id>/confirm/` | Confirm final report |
| `DELETE` | `/dental-reports/<id>/delete/` | Soft-delete report |

### Messaging

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/conversations/` | List conversations |
| `GET` | `/conversations/<id>/messages/` | Fetch conversation messages |
| `POST` | `/conversations/<id>/messages/` | Send message |
| `POST` | `/conversations/<id>/read/` | Mark messages as read |

### WebSocket

```text
ws://localhost:8000/ws/chat/?token=<JWT_ACCESS_TOKEN>
```

The WebSocket connection is used for real-time message delivery and read-status updates.

---

## Local Development Setup

### Prerequisites

Make sure you have:

- Python 3.11+
- PostgreSQL
- Node.js 18+
- Docker Desktop
- Redis through Docker Compose
- OpenRouter API key
- YOLOv8m-seg weights file

The YOLO weights file should be placed at:

```text
pcdental/models/yolov8m-seg.pt
```

The weights are not committed to the repository.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Amine-Fathallah0/pcdent.git
cd pcdent
```

### 2. Create a Python virtual environment

```bash
python -m venv env
```

Activate it:

```bash
# Windows
env\Scripts\activate
```

```bash
# Linux / macOS
source env/bin/activate
```

### 3. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a local environment file:

```bash
cp pcdental/.env.example pcdental/.env
```

Edit `pcdental/.env` and configure:

```env
SECRET_KEY=your_django_secret_key
DEBUG=true

DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

API_KEY=your_openrouter_api_key
REPORT_GENERATION_TIMEOUT=30
YOLO_MODEL_PATH=pcdental/models/yolov8m-seg.pt
```

Never commit real secrets or API keys.

### 5. Add YOLO model weights

Create the model directory if it does not exist:

```bash
mkdir -p pcdental/models
```

Place the model file here:

```text
pcdental/models/yolov8m-seg.pt
```

### 6. Run database migrations

```bash
cd pcdental
python manage.py migrate
```

Optional: create an admin user.

```bash
python manage.py createsuperuser
```

### 7. Install frontend dependencies

```bash
cd ../front-end
npm install
```

---

## Running the Project

You need four running processes.

### Terminal 1 — Redis

From the repository root:

```bash
docker compose up -d redis
```

### Terminal 2 — Django ASGI Server

```bash
cd pcdental
python -m daphne -b 0.0.0.0 -p 8000 mysite.asgi:application
```

Daphne is used because the application supports WebSockets through Django Channels.

### Terminal 3 — Celery Worker

```bash
cd pcdental
celery -A mysite worker -l info -P solo
```

On Windows, `-P solo` is required.

### Terminal 4 — Frontend

```bash
cd front-end
npm run dev
```

---

## Service URLs

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:8000` |
| WebSocket | `ws://localhost:8000/ws/chat/` |
| Django Admin | `http://localhost:8000/admin/` |

---

## Quick Health Check

After launching all services:

1. Register or log in as a dentist.
2. Create or access a patient-dentist link.
3. Upload a dental scan image.
4. Check the Celery terminal.
5. Wait for the AI job to finish.
6. Open the generated analysis and report draft.
7. Review, edit, and finalize the report.

If the AI pipeline fails, check:

- the OpenRouter API key in `.env`,
- the YOLO weights path,
- Redis status,
- PostgreSQL connection,
- Celery worker logs.

---

## Testing

Run backend tests with:

```bash
cd pcdental
python manage.py test dentapp
```

---

## Security and Privacy Notes

- JWT authentication is required for protected endpoints.
- Refresh tokens are rotated and blacklisted.
- Role-based permissions restrict access to patient and dentist resources.
- Uploaded medical files are served through authenticated endpoints.
- Reports must be reviewed and validated by the dentist.
- AI predictions are decision-support outputs, not autonomous diagnoses.
- Real API keys and secrets must never be committed to the repository.

---

## Notebooks

The `notebooks/` directory contains experimental material related to the AI component:

| Notebook | Purpose |
|---|---|
| `yolo_results (1).ipynb` | YOLOv8m-seg production model evaluation |
| `d-mode_results.ipynb` | D-MODE experimental evaluation |

These notebooks document the model comparison, evaluation metrics, and experimental results used during the project.

---

## Final Project Positioning

PCDent is not only a clinic management application and not only an AI model. It is a complete AI-assisted dental workflow platform that connects:

```text
patient management
      +
appointment organization
      +
dental scan upload
      +
AI detection and segmentation
      +
AI-assisted report generation
      +
dentist validation
      +
secure dentist-patient communication
```

The delivered system demonstrates how AI can be integrated into a structured dental workflow while keeping the dentist responsible for the final medical interpretation.

---

## Contributors

- Mourad Kraiem
- Amine Fathallah
- Mohamed Yassin Ghaoui

Supervisor:

- Dr. Hanen Balti

---

## Academic Context

This project was developed as a Design and Development Project at the National School of Computer Science, University of Manouba.

Academic year: 2025 / 2026

---

## Disclaimer

This platform is an academic prototype intended for educational and research purposes. The AI-generated outputs are not medical diagnoses and must always be reviewed and validated by a qualified dentist.
