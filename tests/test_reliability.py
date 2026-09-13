import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://test:test@localhost:5432/test"
)

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.api import get_db
from backend.auth import get_current_user
from backend.models import User
from backend.database import Base
from backend.main import app


def test_empty_database_and_cors(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'empty.db'}")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    def override_db():
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: User(role="ADMIN", username="test-admin")
    try:
        client = TestClient(app)
        response = client.get(
            "/students", headers={"Origin": "http://localhost:5173"}
        )
        assert response.status_code == 200
        assert response.json() == []
        assert response.headers["access-control-allow-origin"] == "http://localhost:5173"

        response = client.get("/risk")
        assert response.status_code == 200
        assert response.json() == []
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
