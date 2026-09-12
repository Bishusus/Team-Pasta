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
from backend.models import Classroom, ExamSchedule, Student


def test_exam_schedule_and_layout_endpoints(tmp_path):
	engine = create_engine(f"sqlite:///{tmp_path / 'exam-api.db'}")
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
		db.commit()
		generate_exam_schedule(db)

	def override_db():
		with Session() as db:
			yield db

	app.dependency_overrides[get_db] = override_db
	try:
		client = TestClient(app)
		schedule = client.get("/exam-schedule")
		assert schedule.status_code == 200
		exam = schedule.json()[0]
		assert exam["student_count"] == 1
		assert exam["invigilator"] == "Unassigned" or exam["invigilator"]

		layout = client.get(f"/exam-schedule/{exam['id']}/layout")
		assert layout.status_code == 200
		assert layout.json()["rooms"][0]["assignments"][0]["student_id"] == "STU-001"

		assert client.get("/exam-schedule/9999/layout").status_code == 404
	finally:
		app.dependency_overrides.clear()
		engine.dispose()