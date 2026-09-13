# Academic Intelligence & Examination Management Platform

**Team-Pasta · Islington College Hackathon 2026**

An integrated web platform for Islington College that unifies three academic operations into one system:

1. **Academic risk identification** — a deterministic, explainable risk engine that flags at-risk students early, with score breakdowns and human-readable reasons.
2. **Conflict-free examination management** — automated exam scheduling, interleaved multi-module room seating, and cross-referenced invigilator assignment that never double-books a lecturer or lets a subject teacher invigilate their own exam.
3. **Classroom booking** — a request/approval workflow that respects the live weekly timetable, so students can request rooms and admins can approve them without double-booking.

Everything runs on **FastAPI + SQLAlchemy 2.0 + PostgreSQL (Supabase)** behind a **React 18 + Vite** frontend, seeded automatically from CSV datasets at startup.

---

## Features

### Role-based access (demo authentication)

The app opens with a sign-in gate. Three roles share universal passwords (no user database — this is a demo build):

| Role | Username | Password | Sees |
|---|---|---|---|
| Student | any (matched to student records by name) | `student123` | Own dashboard, own timetable, own exams + admit card, booking requests |
| Teacher | any (matched to timetable lecturer names) | `teacher123` | Own timetable, risk analysis for only their modules, their exams and invigilation halls |
| Administrator | `admin` | `admin123` | Everything, plus booking approvals and seating regeneration |

Sessions persist in `sessionStorage` (per browser tab) and are cleared on sign-out or when the tab closes.

### Academic Command Center (dashboard)

Live institutional summary: total students, high-risk counts, upcoming exams, database connectivity, risk distribution chart, priority alerts, and attendance warnings — all scoped to the signed-in role.

### Multi-factor risk analysis

A pure, deterministic Python engine scores every student 0–100 using attendance thresholds and performance trends across three exam intervals (Exam 1 → 2, 1 → Final, 2 → Final). Each risk score comes with explicit, human-readable reasons. Filterable by programme, semester, module, and risk level; searchable by ID or name.

### Exam scheduling & interleaved seating

- Students are grouped by `exam_date` and `module_name`; each module pairing becomes one session starting 09:00, 2 hours long, with a 30-minute break between sessions on the same day.
- Paired modules share a hall with **interleaved columns** (odd columns = module A, even columns = module B) so same-module candidates never sit adjacently.
- Single-module halls use **checkerboard spacing** (`(row + column) % 2 == 0`).
- Room grids are derived from classroom capacity; students are placed in stable student-ID order.
- The layout is rendered as a visual seat map, filterable (all / occupied / empty) and exportable to CSV. Hall door notices are print-ready.

### Conflict-free invigilation

The engine cross-references the master timetable, bars every subject lecturer from invigilating their own module, and never double-books a lecturer across concurrent sessions — falling back to an external invigilator when the pool is exhausted.

### Digital admit cards

A read-only presentation of the existing seat assignment: pick a candidate and an exam, and the system serves an official-style card (institution header, candidate identity, seat number/row/column, room, date, time range, duration, invigilator). Admit cards **never generate or modify seating** — they read `generated_exam_seat_assignments` as the single source of truth, and the card is print-friendly. If no seat has been assigned yet, the UI says so instead of inventing one.

### Classroom booking with admin approval

Students request a room for a 07:00–17:00 window on any weekday; the availability check already excludes timetable-occupied rooms. Requests are created **pending** and block nothing until an administrator approves them — and approval re-checks conflicts so two competing requests can't both win. Approved bookings block the room for everyone; decisions are recorded with `decided_by`.

### Weekly timetable browser

Searchable, filterable grid (day, module code, group/cohort, lecturer, room). It is both a staff reference and the authoritative source the invigilation and booking engines check against.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.13, FastAPI, Uvicorn |
| ORM / Database | SQLAlchemy 2.0, PostgreSQL (Supabase), psycopg 3 |
| Frontend | React 18, Vite 5 |
| Data ingestion | Pandas + CSV loaders (`students.csv`, `timetable.csv`, `classrooms.csv`) |
| Testing | Pytest (38 tests: engines, loaders, API contracts, end-to-end flows) |

## Project Structure

```text
├── backend/
│   ├── main.py               # FastAPI app, lifespan: init → migrate → seed CSVs
│   ├── api.py                # REST endpoints (students, risk, timetable, bookings, exams, seating, admit cards)
│   ├── models.py             # SQLAlchemy models
│   ├── database.py           # Engine/session setup (DATABASE_URL from .env)
│   ├── risk_engine.py        # Deterministic 0–100 risk scoring
│   ├── exam_engine.py        # Exam pairing, scheduling, seat + invigilator assignment
│   ├── seating_engine.py     # Legacy seating plan generator (per-exam rooms)
│   ├── timetable_loader.py   # Weekly timetable CSV ingest
│   ├── classroom_loader.py   # Classroom CSV ingest
│   └── csv_loader.py         # Student CSV ingest
├── data/
│   ├── students.csv          # 500 students: scores, attendance, module, exam date
│   ├── timetable.csv         # Weekly classes: lecturer, module, group, room
│   └── classrooms.csv        # Blocks, room numbers, capacities
├── frontend/
│   └── src/
│       ├── App.jsx           # Session gate, role-scoped routing
│       ├── auth.js           # Demo role/password constants (client-side only)
│       ├── roles.js          # Per-role navigation
│       ├── scope.js          # Row-level scoping (teacher→modules, student→self)
│       ├── services/api.js   # API client with typed errors + normalization
│       ├── pages/            # Dashboard, Risk, Timetable, Booking, ExamSeating, AdmitCard, Login
│       └── components/       # Sidebar, tables, charts, seat modal, toasts
├── tests/                    # 38 pytest tests (API + engine + loader coverage)
├── requirements.txt
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.12+ (3.13 used in development)
- Node.js 18+
- A PostgreSQL database (Supabase works out of the box)

### 1. Configure the database

Create a `.env` at the project root:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
# Optional: extra CORS origins for the API
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

(`postgres://` and `postgresql://` URLs are normalized to the psycopg driver automatically.)

### 2. Backend

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows  (use source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

On startup the app creates the schema, ensures lightweight migrations, ingests the three CSVs from `data/`, and generates the exam schedule if none exists yet.

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in (see the role table above). The Vite dev server proxies `/api/*` to `http://localhost:8000`.

## API Overview

| Endpoint | Purpose |
|---|---|
| `GET /health` | Database connectivity ping |
| `GET /students`, `GET /students/{student_id}` | Student records |
| `GET /risk`, `GET /risk-summary`, `GET /risk/{student_id}` | Risk scores, tiers, reasons |
| `GET /timetable`, `GET /timetable/{entry_id}` | Weekly timetable (filterable) |
| `GET /classrooms`, `GET /classrooms/{classroom_id}` | Classroom inventory |
| `GET /bookings/availability?day&start_time&end_time` | Free rooms for a window |
| `GET /bookings`, `POST /bookings` | List / create (pending) booking requests |
| `POST /bookings/{id}/approve`, `POST /bookings/{id}/reject` | Admin decisions (approval re-checks conflicts) |
| `GET /exam-schedule`, `POST /exam-schedule/generate` | Generated exam sessions |
| `GET /exam-schedule/{exam_id}/layout` | Room-by-room seat grid |
| `GET /exam-schedule/{exam_id}/admit-card/{student_id}` | Digital admit card (read-only) |
| `POST /seating/generate`, `GET /seating`, `GET /seating/exam/{exam_id}` | Legacy per-exam seating plans |

## Testing

```bash
pytest
```

38 tests cover risk scoring rules, exam pairing and interleaved seating constraints, timetable/classroom loaders, booking request/approval semantics, admit-card eligibility and consistency, API contracts, and end-to-end student data flows.

## Notes & Limitations

- **Demo authentication only.** Roles and passwords are client-side constants; anyone can read them in the JS bundle. A real deployment needs server-side auth with hashed credentials and a user table.
- **Identity matching is name-based.** Students and teachers are matched to database records by username ≈ stored name; close but imperfect for real deployments.
- Seating is strictly algorithm-generated — no manual drag-and-drop overrides.
- Live SIS/LMS integration is simulated with CSV loaders.

## License

No custom license yet — add one before production use.
