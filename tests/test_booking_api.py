import os

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://test:test@localhost:5432/test")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.api import get_db
from backend.database import Base
from backend.main import app
from backend.models import Classroom, TimetableEntry


def test_booking_availability_and_conflicts(tmp_path):
	engine = create_engine(f"sqlite:///{tmp_path / 'booking.db'}")
	Base.metadata.create_all(engine)
	Session = sessionmaker(bind=engine)
	with Session() as db:
		db.add_all([
			Classroom(block_name="London Block", room_number="LT01", capacity=90),
			Classroom(block_name="Alumni Block", room_number="SR01", capacity=50),
			TimetableEntry(
				day="MON", time_slot="09:00 AM - 11:00 AM", group_name="AI",
				section_cohort="AI1", class_type="Lecture", module_code="CS1",
				module_title="Databases", lecturer="Teacher One", room="LT 1",
				duration_hours=2,
			),
		])
		db.commit()
		available_room = db.query(Classroom).filter(Classroom.room_number == "SR01").first()
		occupied_room = db.query(Classroom).filter(Classroom.room_number == "LT01").first()

	def override_db():
		with Session() as db:
			yield db

	app.dependency_overrides[get_db] = override_db
	try:
		client = TestClient(app)
		availability = client.get("/bookings/availability?day=mon&start_time=09:30&end_time=10:30")
		assert availability.status_code == 200
		by_id = {item["id"]: item for item in availability.json()}
		assert by_id[occupied_room.id]["available"] is False
		assert by_id[available_room.id]["available"] is True

		booking = client.post("/bookings", json={
			"classroom_id": available_room.id, "day": "MON", "start_time": "09:30",
			"end_time": "10:30", "booked_by": "Library Team", "purpose": "Study group",
		})
		assert booking.status_code == 201
		conflict = client.post("/bookings", json={
			"classroom_id": available_room.id, "day": "MON", "start_time": "10:00",
			"end_time": "11:00", "booked_by": "Another Team", "purpose": "Workshop",
		})
		assert conflict.status_code == 409

		too_early = client.get("/bookings/availability?day=mon&start_time=06:59&end_time=07:30")
		assert too_early.status_code == 400
		too_late = client.get("/bookings/availability?day=mon&start_time=20:30&end_time=21:01")
		assert too_late.status_code == 400
	finally:
		app.dependency_overrides.clear()
		engine.dispose()