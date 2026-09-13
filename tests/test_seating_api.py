from datetime import date
import os

os.environ.setdefault(
	"DATABASE_URL", "postgresql+psycopg://test:test@localhost:5432/test"
)

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.api import get_db
from backend.database import Base
from backend.main import app
from backend.auth import hash_password
from backend.models import Classroom, Student, TimetableEntry, User


def test_seating_api_endpoints(tmp_path):
	engine = create_engine(f"sqlite:///{tmp_path / 'seating_api.db'}")
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
			]
		)
		db.commit()

	def override_db():
		with session_factory() as db:
			yield db

	app.dependency_overrides[get_db] = override_db
	try:
		client = TestClient(app)
		with session_factory() as db:
			db.add(User(username="admin", email="admin@example.com", password_hash=hash_password("secret"), role="ADMIN"))
			db.commit()
		login = client.post("/auth/login", data={"username": "admin", "password": "secret"})
		headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
		response = client.post("/seating/generate", headers=headers)
		assert response.status_code == 200
		assert response.json()["status"] == "success"

		response = client.get("/seating", headers=headers)
		assert response.status_code == 200
		data = response.json()
		assert len(data) >= 1
		assert data[0]["invigilator"] == "Dr. Smith"
		exam_id = data[0]["id"]

		response = client.get(f"/seating/exam/{exam_id}", headers=headers)
		assert response.status_code == 200
		exam_detail = response.json()
		assert exam_detail["id"] == exam_id
		assert len(exam_detail["assignments"]) == 1
		assert exam_detail["assignments"][0]["student"]["full_name"] == "Alice Smith"

		response = client.get("/seating/exam/9999", headers=headers)
		assert response.status_code == 404
		assert response.json()["detail"] == "Exam seating plan not found"
	finally:
		app.dependency_overrides.clear()
		engine.dispose()
