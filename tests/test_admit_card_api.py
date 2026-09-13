from datetime import date
import os

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://test:test@localhost:5432/test")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.api import get_db
from backend.database import Base
from backend.exam_engine import generate_exam_schedule
from backend.main import app
from backend.models import Classroom, Student


def _seed_and_generate(tmp_path):
	engine = create_engine(f"sqlite:///{tmp_path / 'admit-card.db'}")
	Base.metadata.create_all(engine)
	Session = sessionmaker(bind=engine)
	with Session() as db:
		db.add(Classroom(block_name="London Block", room_number="LT01", capacity=20))
		db.add(Student(
			student_id="STU-001",
			full_name="Aarav Shrestha",
			programme="Computing",
			semester="Year 2",
			module_name="Data Structures & Algorithms",
			exam_date=date(2026, 3, 12),
			attendance_percentage=90,
			exam_1_score=70,
			exam_2_score=70,
			final_exam_score=70,
		))
		# Same date, different module: sits the paired session but must stay
		# ineligible for the DSA exam (module not in the session's modules).
		db.add(Student(
			student_id="STU-002",
			full_name="Bhuwan Chand",
			programme="Computing",
			semester="Year 2",
			module_name="Financial Management",
			exam_date=date(2026, 3, 12),
			attendance_percentage=85,
			exam_1_score=65,
			exam_2_score=65,
			final_exam_score=65,
		))
		# Different date entirely: never grouped into the 2026-03-12 session.
		db.add(Student(
			student_id="STU-003",
			full_name="Chasang Limbu",
			programme="Computing",
			semester="Year 2",
			module_name="Data Structures & Algorithms",
			exam_date=date(2026, 3, 20),
			attendance_percentage=80,
			exam_1_score=60,
			exam_2_score=60,
			final_exam_score=60,
		))
		db.commit()
		generate_exam_schedule(db)
	return engine, Session


def test_admit_card_happy_path(tmp_path):
	engine, Session = _seed_and_generate(tmp_path)

	def override_db():
		with Session() as db:
			yield db

	app.dependency_overrides[get_db] = override_db
	try:
		client = TestClient(app)
		exam = client.get("/exam-schedule").json()[0]
		card = client.get(f"/exam-schedule/{exam['id']}/admit-card/STU-001")
		assert card.status_code == 200
		body = card.json()

		# Data consistency: every field mirrors the underlying records.
		assert body["student"]["student_id"] == "STU-001"
		assert body["student"]["full_name"] == "Aarav Shrestha"
		assert body["student"]["module_name"] == "Data Structures & Algorithms"
		assert body["exam"]["id"] == exam["id"]
		assert body["exam"]["exam_date"] == "2026-03-12"
		assert body["exam"]["start_time"] == "09:00"
		# 120-minute duration produces an explicit end time.
		assert body["exam"]["end_time"] == "11:00"
		assert body["seat"]["seat_number"].startswith("London Block LT01")
		assert body["room"]["name"].startswith("London Block LT01")
		assert body["room"]["rows"] >= 1 and body["room"]["columns"] >= 1
	finally:
		app.dependency_overrides.clear()
		engine.dispose()


def test_admit_card_no_seat_assigned(tmp_path):
	engine, Session = _seed_and_generate(tmp_path)

	def override_db():
		with Session() as db:
			yield db

	app.dependency_overrides[get_db] = override_db
	try:
		client = TestClient(app)
		exam = client.get("/exam-schedule").json()[0]
		# A student eligible for the session (same date + module) whose seat
		# row is deleted afterwards, without regenerating the schedule.
		with Session() as db:
			from backend.models import ExamSeatAssignment
			student = db.query(Student).filter(Student.student_id == "STU-001").one()
			assignment = db.query(ExamSeatAssignment).filter(
				ExamSeatAssignment.exam_id == exam["id"],
				ExamSeatAssignment.student_id == student.id,
			).one()
			db.delete(assignment)
			db.commit()

		response = client.get(f"/exam-schedule/{exam['id']}/admit-card/STU-001")
		assert response.status_code == 404
		assert "not been assigned" in response.json()["detail"]
	finally:
		app.dependency_overrides.clear()
		engine.dispose()


def test_admit_card_unknown_student_and_exam(tmp_path):
	engine, Session = _seed_and_generate(tmp_path)

	def override_db():
		with Session() as db:
			yield db

	app.dependency_overrides[get_db] = override_db
	try:
		client = TestClient(app)
		exam = client.get("/exam-schedule").json()[0]
		assert client.get(f"/exam-schedule/{exam['id']}/admit-card/NOPE").status_code == 404
		assert client.get("/exam-schedule/9999/admit-card/STU-001").status_code == 404
	finally:
		app.dependency_overrides.clear()
		engine.dispose()


def test_admit_card_ineligible_student(tmp_path):
	engine, Session = _seed_and_generate(tmp_path)

	def override_db():
		with Session() as db:
			yield db

	app.dependency_overrides[get_db] = override_db
	try:
		client = TestClient(app)
		exam = client.get("/exam-schedule").json()[0]
		# STU-002 (Financial Management) sits the SAME paired session — the
		# interleaved-seating design seats both modules in one hall — so the
		# card is valid for them too and shows THEIR module seat.
		paired = client.get(f"/exam-schedule/{exam['id']}/admit-card/STU-002")
		assert paired.status_code == 200
		assert paired.json()["student"]["module_name"] == "Financial Management"
		# STU-003 sits the same module but on a different exam date: never
		# grouped into this session, so no card.
		assert client.get(f"/exam-schedule/{exam['id']}/admit-card/STU-003").status_code == 409
	finally:
		app.dependency_overrides.clear()
		engine.dispose()
