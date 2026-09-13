import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
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
	_existing_schema_updates()


def _existing_schema_updates() -> None:
	updates = {
		"users": {
			"identity": "VARCHAR(200)",
			"section_cohort": "VARCHAR(200)",
		},
		"classroom_bookings": {
			"status": "VARCHAR(20) DEFAULT 'APPROVED'",
			"requested_by_user_id": "INTEGER",
			"approved_by_user_id": "INTEGER",
			"rejection_reason": "VARCHAR(300)",
		},
	}
	with engine.begin() as connection:
		inspector = inspect(connection)
		for table_name, columns in updates.items():
			existing = {column["name"] for column in inspector.get_columns(table_name)}
			for column_name, column_type in columns.items():
				if column_name not in existing:
					connection.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" {column_type}'))


def get_db() -> Generator[Session, None, None]:
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()
