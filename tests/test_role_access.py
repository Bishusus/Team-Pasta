from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.api import get_db
from backend.auth import get_current_user, hash_password
from backend.database import Base
from backend.main import app
from backend.models import Classroom, Student, TimetableEntry, User


def test_teacher_and_student_visibility_and_booking_request(tmp_path):
	engine = create_engine(f"sqlite:///{tmp_path / 'roles.db'}")
	Base.metadata.create_all(engine)
	Session = sessionmaker(bind=engine)
	with Session() as db:
		db.add_all([
			Student(student_id="S1", full_name="One", programme="Computing", semester="S1", module_name="Algorithms", exam_date=date(2026, 3, 12), attendance_percentage=90, exam_1_score=80, exam_2_score=80, final_exam_score=80),
			Student(student_id="S2", full_name="Two", programme="Business", semester="S1", module_name="Finance", exam_date=date(2026, 3, 12), attendance_percentage=90, exam_1_score=80, exam_2_score=80, final_exam_score=80),
			TimetableEntry(day="MON", time_slot="09:00 AM - 10:00 AM", group_name="Computing", section_cohort="C1", class_type="Lecture", module_code="A1", module_title="Algorithms", lecturer="Teacher One", room="LT1", duration_hours=1),
			TimetableEntry(day="MON", time_slot="10:00 AM - 11:00 AM", group_name="Business", section_cohort="B1", class_type="Lecture", module_code="F1", module_title="Finance", lecturer="Teacher Two", room="LT2", duration_hours=1),
			Classroom(block_name="Main", room_number="LT1", capacity=30),
			User(username="teacher", email="teacher@example.com", password_hash=hash_password("secret"), role="TEACHER", identity="Teacher One"),
			User(username="student", email="student@example.com", password_hash=hash_password("secret"), role="STUDENT", identity="S1"),
		])
		db.commit()

	def override_db():
		with Session() as db:
			yield db

	app.dependency_overrides[get_db] = override_db
	try:
		client = TestClient(app)
		with Session() as db:
			teacher = db.query(User).filter(User.username == "teacher").one()
			student = db.query(User).filter(User.username == "student").one()

		app.dependency_overrides[get_current_user] = lambda: teacher
		assert [item["full_name"] for item in client.get("/risk").json()] == ["One"]
		assert [item["lecturer"] for item in client.get("/timetable").json()] == ["Teacher One"]

		app.dependency_overrides[get_current_user] = lambda: student
		assert [item["student_id"] for item in client.get("/risk").json()] == ["S1"]
		request = client.post("/bookings", json={"classroom_id": 1, "day": "MON", "start_time": "12:00", "end_time": "13:00", "booked_by": "ignored", "purpose": "Study"})
		assert request.status_code == 201
		assert request.json()["status"] == "PENDING"
	finally:
		app.dependency_overrides.clear()
		engine.dispose()
