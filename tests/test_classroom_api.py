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
from backend.models import Classroom


def test_classroom_endpoints(tmp_path):
	engine = create_engine(f"sqlite:///{tmp_path / 'classroom.db'}")
	Base.metadata.create_all(engine)
	session_factory = sessionmaker(bind=engine)

	with session_factory() as db:
		db.add_all(
			[
				Classroom(
					block_name="London Block",
					room_number="LT01",
					capacity=90,
				),
				Classroom(
					block_name="Himal Block",
					room_number="TR01",
					capacity=40,
				),
			]
		)
		db.commit()
		entry_id = db.query(Classroom).filter(Classroom.room_number == "LT01").first().id

	def override_db():
		with session_factory() as db:
			yield db

	app.dependency_overrides[get_db] = override_db
	try:
		client = TestClient(app)
		response = client.get("/classrooms")
		assert response.status_code == 200
		assert len(response.json()) == 2

		response = client.get("/classrooms?block_name=London Block")
		assert response.status_code == 200
		assert len(response.json()) == 1
		assert response.json()[0]["room_number"] == "LT01"

		response = client.get("/classrooms?room_number=TR01")
		assert response.status_code == 200
		assert len(response.json()) == 1
		assert response.json()[0]["capacity"] == 40

		response = client.get(f"/classrooms/{entry_id}")
		assert response.status_code == 200
		assert response.json()["id"] == entry_id
		assert response.json()["room_number"] == "LT01"

		response = client.get("/classrooms/9999")
		assert response.status_code == 404
		assert response.json()["detail"] == "Classroom not found"
	finally:
		app.dependency_overrides.clear()
		engine.dispose()
