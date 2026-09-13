from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from .api import router
from .classroom_loader import load_classrooms_from_csv
from .csv_loader import load_students_from_csv
from .database import SessionLocal, engine, init_db
from .exam_engine import generate_exam_schedule
from .models import ExamSchedule
from .timetable_loader import load_timetable_from_csv


def _ensure_booking_columns() -> None:
	"""Idempotent lightweight migration: create_all does not add columns to
	existing tables, so classroom_bookings.status / decided_by are ensured
	here. Bookings created before the approval workflow default to
	'approved' so they keep blocking their rooms."""
	from sqlalchemy import text

	with engine.begin() as connection:
		connection.execute(text(
			"ALTER TABLE classroom_bookings ADD COLUMN IF NOT EXISTS status VARCHAR(12)"
		))
		connection.execute(text(
			"UPDATE classroom_bookings SET status = 'approved' WHERE status IS NULL"
		))
		connection.execute(text(
			"ALTER TABLE classroom_bookings ALTER COLUMN status SET DEFAULT 'pending'"
		))
		connection.execute(text(
			"ALTER TABLE classroom_bookings ALTER COLUMN status SET NOT NULL"
		))
		connection.execute(text(
			"ALTER TABLE classroom_bookings ADD COLUMN IF NOT EXISTS decided_by VARCHAR(200)"
		))
		connection.execute(text(
			"CREATE INDEX IF NOT EXISTS ix_classroom_bookings_status ON classroom_bookings (status)"
		))


@asynccontextmanager
async def lifespan(_: FastAPI):
	init_db()
	_ensure_booking_columns()
	project_root = Path(__file__).resolve().parent.parent
	with SessionLocal() as db:
		load_students_from_csv(db, project_root / "data" / "students.csv")
		load_timetable_from_csv(db, project_root / "data" / "timetable.csv")
		load_classrooms_from_csv(db, project_root / "data" / "classrooms.csv")
		if db.scalar(select(ExamSchedule.id)) is None:
			generate_exam_schedule(db)
	yield


app = FastAPI(title="Academic Intelligence API", lifespan=lifespan)
frontend_origins = [
	origin.strip()
	for origin in os.getenv(
		"FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
	).split(",")
	if origin.strip()
]
app.add_middleware(
	CORSMiddleware,
	allow_origins=frontend_origins,
	allow_credentials=False,
	allow_methods=["GET", "POST"],
	allow_headers=["*"],
)
app.include_router(router)


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(_: Request, __: SQLAlchemyError) -> JSONResponse:
	return JSONResponse(
		status_code=503,
		content={"detail": "Database operation failed"},
	)


@app.get("/health")
def health() -> dict[str, str]:
	try:
		with engine.connect() as connection:
			connection.execute(text("SELECT 1"))
	except Exception as error:
		raise HTTPException(status_code=503, detail="Database connection failed") from error

	return {"status": "ok", "database": "connected"}
