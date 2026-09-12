from datetime import date
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.models import Classroom, Student, TimetableEntry
from backend.seating_engine import (
	assign_neutral_invigilator,
	calculate_room_grid,
	generate_seating_plan,
	get_module_lecturers,
)


def test_calculate_room_grid():
	assert calculate_room_grid(90) == (9, 10)
	assert calculate_room_grid(60) == (6, 10)
	assert calculate_room_grid(40) == (4, 10)
	assert calculate_room_grid(32) == (4, 8)


def test_neutral_cross_invigilation(tmp_path: Path):
	engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
	Base.metadata.create_all(engine)
	session_factory = sessionmaker(bind=engine)

	with session_factory() as db:
		db.add_all(
			[
				TimetableEntry(
					day="SUN",
					time_slot="07:00 AM - 08:30 AM",
					group_name="AI",
					section_cohort="AI1",
					class_type="Lecture",
					module_code="CS101",
					module_title="Database Systems",
					lecturer="Dr. Smith",
					room="LT01",
					duration_hours=1.5,
				),
				TimetableEntry(
					day="MON",
					time_slot="09:00 AM - 10:30 AM",
					group_name="AI",
					section_cohort="AI1",
					class_type="Lecture",
					module_code="CS102",
					module_title="Web Development",
					lecturer="Prof. Jones",
					room="TR01",
					duration_hours=1.5,
				),
			]
		)
		db.commit()

		# Verify Dr. Smith is recognized as Database Systems subject teacher
		db_teachers = get_module_lecturers("Database Systems", db)
		assert "Dr. Smith" in db_teachers

		busy_set: set[tuple[str, str, str]] = set()

		# Exam for Database Systems must NOT assign Dr. Smith; it must assign neutral teacher Prof. Jones
		inv1 = assign_neutral_invigilator(
			module_names=["Database Systems"],
			exam_date="2026-10-01",
			start_time="09:00 AM",
			db=db,
			busy_invigilators=busy_set,
		)
		assert inv1 != "Dr. Smith"
		assert inv1 == "Prof. Jones"
		assert ("2026-10-01", "09:00 AM", "Prof. Jones") in busy_set

	engine.dispose()


def test_multi_module_interleaving(tmp_path: Path):
	engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
	Base.metadata.create_all(engine)
	session_factory = sessionmaker(bind=engine)

	with session_factory() as db:
		db.add_all(
			[
				Classroom(block_name="London Block", room_number="LT01", capacity=90),
				Student(
					student_id="STU001",
					full_name="Alice Smith",
					programme="BSc CS",
					semester="S1",
					module_name="Database Systems",
					exam_date=date(2026, 10, 1),
					attendance_percentage=90.0,
					exam_1_score=80.0,
					exam_2_score=85.0,
					final_exam_score=88.0,
				),
				Student(
					student_id="STU002",
					full_name="Bob Jones",
					programme="BSc CS",
					semester="S1",
					module_name="Web Development",
					exam_date=date(2026, 10, 1),
					attendance_percentage=75.0,
					exam_1_score=70.0,
					exam_2_score=72.0,
					final_exam_score=74.0,
				),
			]
		)
		db.commit()

		results = generate_seating_plan(db)
		assert len(results) >= 1
		plan = results[0]
		assert plan["room_number"] == "LT01"
		assert plan["assigned_count"] == 2

		# Verify interleaving: Odd column (C1) gets Database Systems, Even column (C2) gets Web Development
		assignments = plan["assignments"]
		mod_by_col = {a["column"]: a["module_name"] for a in assignments}
		assert mod_by_col[1] == "Database Systems"
		assert mod_by_col[2] == "Web Development"

	engine.dispose()
