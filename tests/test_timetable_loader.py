from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.models import TimetableEntry
from backend.timetable_loader import load_timetable_from_csv


def test_timetable_loader_is_idempotent(tmp_path: Path):
    csv_path = tmp_path / "timetable.csv"
    csv_path.write_text(
        "Day,Time Slot,Group,Section / Cohort,Class Type,Module Code,"
        "Module Title,Lecturer / Teacher,Room,Duration (Hrs)\n"
        "SUN,07:00 AM - 08:30 AM,AI,AI1,Lecture,CS1,Databases,Teacher,LT 1,1.5\n"
        "SUN,07:00 AM - 08:30 AM,AI,AI1,Lecture,CS1,Databases,Teacher,LT 1,1.5\n",
        encoding="utf-8",
    )
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    with session_factory() as db:
        assert load_timetable_from_csv(db, csv_path) == 2
        assert load_timetable_from_csv(db, csv_path) == 2
        entries = db.scalars(select(TimetableEntry)).all()

    assert len(entries) == 1
    assert entries[0].duration_hours == 1.5
    engine.dispose()


def test_timetable_loader_merges_time_format_variants(tmp_path: Path):
    csv_path = tmp_path / "timetable.csv"
    csv_path.write_text(
        "Day,Time Slot,Group,Section / Cohort,Class Type,Module Code,"
        "Module Title,Lecturer / Teacher,Room,Duration (Hrs)\n"
        "SUN,07:00 AM - 08:30 AM,AI,AI1,Lecture,CS1,Databases,Teacher,LT 1,1.5\n",
        encoding="utf-8",
    )
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    with session_factory() as db:
        db.add(
            TimetableEntry(
                day="SUN",
                time_slot="07:00 - 08:30",
                group_name="AI",
                section_cohort="AI1",
                class_type="Lecture",
                module_code="CS1",
                module_title="Databases",
                lecturer="Teacher",
                room="LT 1",
                duration_hours=1.5,
            )
        )
        db.commit()

        assert load_timetable_from_csv(db, csv_path) == 1
        entries = db.scalars(select(TimetableEntry)).all()

    assert len(entries) == 1
    assert entries[0].time_slot == "07:00 AM - 08:30 AM"
    engine.dispose()


def test_timetable_loader_rejects_missing_columns(tmp_path: Path):
    csv_path = tmp_path / "timetable.csv"
    csv_path.write_text("Day,Room\nSUN,LT 1\n", encoding="utf-8")
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    with session_factory() as db:
        with pytest.raises(ValueError, match="missing required columns"):
            load_timetable_from_csv(db, csv_path)
    engine.dispose()


def test_timetable_loader_merges_12_and_24_hour_time_formats(tmp_path: Path):
    csv_path = tmp_path / "timetable.csv"
    csv_path.write_text(
        "Day,Time Slot,Group,Section / Cohort,Class Type,Module Code,"
        "Module Title,Lecturer / Teacher,Room,Duration (Hrs)\n"
        "MON,04:00 PM - 05:00 PM,AI,AI1,Lecture,CS1,Databases,Teacher,LT 1,1.0\n",
        encoding="utf-8",
    )
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    with Session() as db:
        db.add(TimetableEntry(
            day="MON",
            time_slot="16:00 - 17:00",
            group_name="AI",
            section_cohort="AI1",
            class_type="Lecture",
            module_code="CS1",
            module_title="Databases",
            lecturer="Teacher",
            room="LT 1",
            duration_hours=1.0,
        ))
        db.commit()
        assert load_timetable_from_csv(db, csv_path) == 1
        entries = db.scalars(select(TimetableEntry)).all()

    assert len(entries) == 1
    assert entries[0].time_slot == "04:00 PM - 05:00 PM"
    engine.dispose()
