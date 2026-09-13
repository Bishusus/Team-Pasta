import os
from datetime import date

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
from backend.models import Student
from backend.models import User


def test_risk_endpoints_match_existing_engine(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'risk.db'}")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    with session_factory() as db:
        db.add_all(
            [
                Student(
                    student_id="STU-001",
                    full_name="Aarav Shrestha",
                    programme="Computing",
                    semester="Semester 1",
                    module_name="Algorithms",
                    exam_date=date(2026, 3, 12),
                    attendance_percentage=92.5,
                    exam_1_score=72.0,
                    exam_2_score=78.5,
                    final_exam_score=85.0,
                ),
                Student(
                    student_id="STU-002",
                    full_name="Priya Sharma",
                    programme="Computing",
                    semester="Semester 1",
                    module_name="Algorithms",
                    exam_date=date(2026, 3, 12),
                    attendance_percentage=74.0,
                    exam_1_score=85.0,
                    exam_2_score=70.0,
                    final_exam_score=62.0,
                ),
                Student(
                    student_id="STU-003",
                    full_name="Rohan Maharjan",
                    programme="Business",
                    semester="Semester 2",
                    module_name="Finance",
                    exam_date=date(2026, 3, 14),
                    attendance_percentage=61.5,
                    exam_1_score=45.0,
                    exam_2_score=40.0,
                    final_exam_score=38.0,
                ),
            ]
        )
        db.commit()

    def override_db():
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: User(role="ADMIN", username="test-admin")
    try:
        client = TestClient(app)
        response = client.get("/risk")
        assert response.status_code == 200
        risks = response.json()
        assert [risk["student_id"] for risk in risks] == [
            "STU-001",
            "STU-002",
            "STU-003",
        ]
        assert risks[0]["risk_score"] == 0
        assert risks[0]["risk_level"] == "LOW"
        assert risks[1]["risk_score"] == 100
        assert risks[1]["risk_level"] == "HIGH"
        assert risks[2]["risk_score"] == 100
        assert risks[2]["risk_level"] == "HIGH"
        assert all(isinstance(risk["reasons"], list) for risk in risks)

        response = client.get("/risk-summary")
        assert response.status_code == 200
        assert response.json() == {
            "total_students": 3,
            "high_risk": 2,
            "medium_risk": 0,
            "low_risk": 1,
        }

        response = client.get("/risk/STU-003")
        assert response.status_code == 200
        assert response.json()["student_id"] == "STU-003"
        assert "Final exam below pass mark" in response.json()["reasons"]

        response = client.get("/risk/UNKNOWN")
        assert response.status_code == 404
        assert response.json()["detail"] == "Student not found"
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
