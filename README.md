# Team-Pasta

A student analytics and academic operations platform for tracking at-risk students, timetable data, classroom bookings, and exam seating arrangements.

This project contains a FastAPI backend, a React + Vite frontend, CSV-backed data loading, and automated tests for the core scheduling and risk-analysis logic.

## Overview

The application helps academic staff:

- review student academic and attendance data
- calculate student risk levels from academic performance
- view timetable and room assignments
- manage classroom bookings and availability
- generate exam schedules and seating plans
- inspect data through a dashboard-style frontend

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy
- Frontend: React, Vite
- Database: SQLite (via SQLAlchemy)
- Data sources: CSV files in the `data/` directory
- Testing: Pytest

## Project Structure

```text
Team-Pasta/
├── backend/
│   ├── api.py
│   ├── classroom_loader.py
│   ├── csv_loader.py
│   ├── database.py
│   ├── exam_engine.py
│   ├── main.py
│   ├── models.py
│   ├── risk_engine.py
│   ├── seating_engine.py
│   ├── structure_engine.py
│   ├── timetable_loader.py
│   └── __init__.py
├── data/
│   ├── classrooms.csv
│   ├── students.csv
│   └── timetable.csv
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── README.md
│   └── src/
├── tests/
│   ├── test_booking_api.py
│   ├── test_classroom_api.py
│   ├── test_classroom_loader.py
│   ├── test_exam_api.py
│   ├── test_exam_engine.py
│   ├── test_reliability.py
│   ├── test_risk_api.py
│   ├── test_risk.py
│   ├── test_seating_api.py
│   ├── test_seating_engine.py
│   ├── test_student_flow.py
│   ├── test_timetable_api.py
│   └── test_timetable_loader.py
├── requirements.txt
└── README.md
```

## Getting Started

### 1. Create and activate a virtual environment

```bash
cd Team-Pasta
python -m venv .venv
```

On Windows:

```bash
.venv\Scripts\activate
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the backend

```bash
cd Team-Pasta
uvicorn backend.main:app --reload
```

The API will be available at:

- http://localhost:8000
- Swagger docs: http://localhost:8000/docs

### 4. Run the frontend

```bash
cd Team-Pasta/frontend
npm install
npm run dev
```

Then open the local Vite URL, usually:

- http://localhost:5173

## Main API Features

The backend exposes routes for:

- student listing and detail retrieval
- student risk calculations and summaries
- timetable data querying
- classroom listings and booking management
- exam scheduling and room assignments
- seating plan generation

## Data Model

The app loads data from CSV files into the database on startup. The main entities include:

- Students
- Classrooms
- Timetable entries
- Classroom bookings
- Exams and exam schedules
- Seating assignments

## Testing

Run the test suite with:

```bash
pytest
```

This project includes tests covering:

- risk scoring logic
- timetable loading
- classroom APIs
- exam scheduling
- seating plan generation
- booking validation

## Notes

- The backend loads sample academic data automatically from the `data/` folder when the app starts.
- The frontend expects the backend server to be running during local development.
- CORS is configured for the default frontend origin at `http://localhost:5173`.

## License

This project currently does not include a custom license file. If needed, add one before production use.
