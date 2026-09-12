from contextlib import asynccontextmanager
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .api import router
from .csv_loader import load_students_from_csv
from .database import SessionLocal, engine, init_db
from .timetable_loader import load_timetable_from_csv


@asynccontextmanager
async def lifespan(_: FastAPI):
	init_db()
	with SessionLocal() as db:
		load_students_from_csv(db)
		load_timetable_from_csv(db)
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
	allow_methods=["GET"],
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
