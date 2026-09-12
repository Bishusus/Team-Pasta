import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


load_dotenv()


def _database_url() -> str:
	value = os.getenv("DATABASE_URL")
	if not value:
		raise RuntimeError(
			"DATABASE_URL is not configured. Set it to the Supabase PostgreSQL connection string."
		)

	if value.startswith("postgres://"):
		return value.replace("postgres://", "postgresql+psycopg://", 1)
	if value.startswith("postgresql://"):
		return value.replace("postgresql://", "postgresql+psycopg://", 1)
	return value


class Base(DeclarativeBase):
	pass


engine = create_engine(_database_url(), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
	from . import models  # noqa: F401

	Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()
