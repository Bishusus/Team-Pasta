import os
from datetime import date
from pathlib import Path

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://test:test@localhost:5432/test"
)

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from backend.api import get_db
from backend.csv_loader import load_students_from_csv
from backend.database import Base
from backend.main import app
from backend.models import Student


@pytest.fixture
def database(tmp_path: Path):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    yield session_factory
    engine.dispose()


def test_csv_loading_is_idempotent(database, tmp_path: Path):
    csv_path = tmp_path / "students.csv"
    csv_path.write_text(
        "student_id,full_name,programme,semester,module_name,exam_date,"
        "attendance_percentage,exam_1_score,exam_2_score,final_exam_score\n"
        "S002,Lin,Computing,Semester 1,Algorithms,2026-03-12,80,70,75,78\n"
        "S001,Ada,Computing,Semester 1,Algorithms,2026-03-12,90,80,85,88\n"
        "S001,Ada,Computing,Semester 1,Algorithms,2026-03-12,90,80,85,88\n",
        encoding="utf-8",
    )

    with database() as db:
        assert load_students_from_csv(db, csv_path) == 3
        assert load_students_from_csv(db, csv_path) == 3
        students = db.scalars(select(Student).order_by(Student.student_id)).all()

    assert len(students) == 2
    assert [student.student_id for student in students] == ["S001", "S002"]


def test_csv_loader_rejects_missing_student_id(tmp_path: Path, database):
    csv_path = tmp_path / "students.csv"
    pd.DataFrame([{"name": "Ada"}]).to_csv(csv_path, index=False)

    with database() as db:
        with pytest.raises(ValueError, match="student_id"):
            load_students_from_csv(db, csv_path)


def test_student_endpoints(database):
    def override_db():
        with database() as db:
            yield db

    with database() as db:
        db.add(
            Student(
                student_id="S001",
                full_name="Ada",
                programme="Computing",
                semester="Semester 1",
                module_name="Algorithms",
                exam_date=date(2026, 3, 12),
                attendance_percentage=90,
                exam_1_score=80,
                exam_2_score=85,
                final_exam_score=88,
            )
        )
        db.commit()

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        response = client.get("/students")
        assert response.status_code == 200
        assert response.json() == [
            {
                "student_id": "S001",
                "full_name": "Ada",
                "programme": "Computing",
                "semester": "Semester 1",
                "module_name": "Algorithms",
                "exam_date": "2026-03-12",
                "attendance_percentage": 90.0,
                "exam_1_score": 80.0,
                "exam_2_score": 85.0,
                "final_exam_score": 88.0,
            }
        ]

        response = client.get("/students/S001")
        assert response.status_code == 200
        assert response.json()["student_id"] == "S001"

        response = client.get("/students/unknown")
        assert response.status_code == 404
        assert response.json()["detail"] == "Student not found"
    finally:
        app.dependency_overrides.clear()
