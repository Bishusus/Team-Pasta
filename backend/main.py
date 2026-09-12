from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from sqlalchemy import text

from .api import router
from .csv_loader import load_students_from_csv
from .database import SessionLocal, engine, init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
	init_db()
	with SessionLocal() as db:
		load_students_from_csv(db)
	yield


app = FastAPI(title="Academic Intelligence API", lifespan=lifespan)
app.include_router(router)


@app.get("/health")
def health() -> dict[str, str]:
	try:
		with engine.connect() as connection:
			connection.execute(text("SELECT 1"))
	except Exception as error:
		raise HTTPException(status_code=503, detail="Database connection failed") from error

	return {"status": "ok", "database": "connected"}
