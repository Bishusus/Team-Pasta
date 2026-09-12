from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend.classroom_loader import load_classrooms_from_csv
from backend.database import Base
from backend.models import Classroom


def test_classroom_loader_is_idempotent(tmp_path: Path):
	csv_path = tmp_path / "classrooms.csv"
	csv_path.write_text(
		"block_name,room_number,capacity\n"
		"London Block,LT01,90\n"
		"London Block,LT01,90\n",
		encoding="utf-8",
	)
	engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
	Base.metadata.create_all(engine)
	session_factory = sessionmaker(bind=engine)

	with session_factory() as db:
		assert load_classrooms_from_csv(db, csv_path) == 2
		assert load_classrooms_from_csv(db, csv_path) == 2
		entries = db.scalars(select(Classroom)).all()

	assert len(entries) == 1
	assert entries[0].block_name == "London Block"
	assert entries[0].room_number == "LT01"
	assert entries[0].capacity == 90
	engine.dispose()


def test_classroom_loader_rejects_missing_columns(tmp_path: Path):
	csv_path = tmp_path / "classrooms.csv"
	csv_path.write_text("block_name,capacity\nLondon Block,90\n", encoding="utf-8")
	engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
	Base.metadata.create_all(engine)
	session_factory = sessionmaker(bind=engine)

	with session_factory() as db:
		with pytest.raises(ValueError, match="missing required columns"):
			load_classrooms_from_csv(db, csv_path)
	engine.dispose()
