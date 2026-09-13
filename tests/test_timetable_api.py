from datetime import date
import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://test:test@localhost:5432/test"
)

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.api import get_db
from backend.auth import get_current_user
from backend.database import Base
from backend.main import app
from backend.models import TimetableEntry
from backend.models import User


def test_timetable_endpoints(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'timetable.db'}")
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
                    module_code="CS1",
                    module_title="Databases",
                    lecturer="Teacher One",
                    room="LT 1",
                    duration_hours=1.5,
                ),
                TimetableEntry(
                    day="MON",
                    time_slot="09:00 AM - 11:00 AM",
                    group_name="BBA",
                    section_cohort="BBA1",
                    class_type="Workshop",
                    module_code="BB1",
                    module_title="Finance",
                    lecturer="Teacher Two",
                    room="SR 1",
                    duration_hours=2.0,
                ),
            ]
        )
        db.commit()
        entry_id = db.query(TimetableEntry).first().id

    def override_db():
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: User(role="ADMIN", username="test-admin")
    try:
        client = TestClient(app)
        response = client.get("/timetable")
        assert response.status_code == 200
        assert len(response.json()) == 2
        assert response.json()[0]["module_code"] == "BB1"

        response = client.get("/timetable?day=sun")
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["room"] == "LT 1"

        response = client.get("/timetable?module_code=CS1")
        assert response.status_code == 200
        assert response.json()[0]["duration_hours"] == 1.5

        response = client.get(f"/timetable/{entry_id}")
        assert response.status_code == 200
        assert response.json()["id"] == entry_id

        response = client.get("/timetable/9999")
        assert response.status_code == 404
        assert response.json()["detail"] == "Timetable entry not found"
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
