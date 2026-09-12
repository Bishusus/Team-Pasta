from datetime import date

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.exam_engine import _invigilator_for_modules, generate_exam_schedule
from backend.models import Classroom, ExamSchedule, ExamSeatAssignment, Student, TimetableEntry


def test_exam_engine_generates_schedule_and_non_adjacent_seats(tmp_path):
	engine = create_engine(f"sqlite:///{tmp_path / 'exam.db'}")
	Base.metadata.create_all(engine)
	Session = sessionmaker(bind=engine)

	with Session() as db:
		db.add(Classroom(block_name="London Block", room_number="LT01", capacity=20))
		db.add(TimetableEntry(
			day="SUN",
			time_slot="07:00 AM - 09:00 AM",
			group_name="AI",
			section_cohort="AI1",
			class_type="Lecture",
			module_code="CS1",
			module_title="Data Structures and Algorithms",
			lecturer="Dr. Test Lecturer",
			room="LT 1",
			duration_hours=2.0,
		))
		for index in range(5):
			db.add(Student(
				student_id=f"STU-{index}",
				full_name=f"Student {index}",
				programme="Computing",
				semester="Year 2",
				module_name="Data Structures and Algorithms",
				exam_date=date(2026, 3, 12),
				attendance_percentage=80,
				exam_1_score=70,
				exam_2_score=70,
				final_exam_score=70,
			))
		db.commit()

		assert generate_exam_schedule(db) == 1
		exam = db.scalar(select(ExamSchedule))
		assignments = db.scalars(select(ExamSeatAssignment)).all()

		assert exam.invigilator == "External Invigilator"
		assert len(assignments) == 5
		for assignment in assignments:
			left = db.scalar(select(ExamSeatAssignment).where(
				ExamSeatAssignment.exam_id == assignment.exam_id,
				ExamSeatAssignment.room_id == assignment.room_id,
				ExamSeatAssignment.row == assignment.row,
				ExamSeatAssignment.column == assignment.column - 1,
			))
			assert left is None or left.module_name != assignment.module_name

		assert generate_exam_schedule(db) == 1
		assert len(db.scalars(select(ExamSchedule)).all()) == 1

	engine.dispose()


def test_exam_engine_pairs_modules_in_one_session(tmp_path):
	engine = create_engine(f"sqlite:///{tmp_path / 'paired-exam.db'}")
	Base.metadata.create_all(engine)
	Session = sessionmaker(bind=engine)

	with Session() as db:
		db.add(Classroom(block_name="London Block", room_number="LT01", capacity=20))
		for module, lecturer in [
			("Algorithms", "Algorithms Lecturer"),
			("Databases", "Databases Lecturer"),
		]:
			db.add(TimetableEntry(
				day="SUN",
				time_slot="07:00 AM - 09:00 AM",
				group_name="AI",
				section_cohort="AI1",
				class_type="Lecture",
				module_code=module[:3].upper(),
				module_title=module,
				lecturer=lecturer,
				room="LT 1",
				duration_hours=2.0,
			))
		for index, module in enumerate(["Algorithms"] * 3 + ["Databases"] * 3):
			db.add(Student(
				student_id=f"STU-{index}",
				full_name=f"Student {index}",
				programme="Computing",
				semester="Year 2",
				module_name=module,
				exam_date=date(2026, 3, 12),
				attendance_percentage=80,
				exam_1_score=70,
				exam_2_score=70,
				final_exam_score=70,
			))
		db.commit()

		assert generate_exam_schedule(db) == 1
		exam = db.scalar(select(ExamSchedule))
		assignments = db.scalars(select(ExamSeatAssignment).order_by(ExamSeatAssignment.column)).all()

		assert exam.module_name == "Algorithms + Databases"
		assert exam.student_count == 6
		assert exam.invigilator == "External Invigilator"
		assert {assignment.module_name for assignment in assignments} == {"Algorithms", "Databases"}
		assert len({assignment.room_id for assignment in assignments}) == 1
		for assignment in assignments:
			left = next((seat for seat in assignments if seat.row == assignment.row and seat.column == assignment.column - 1), None)
			assert left is None or left.module_name != assignment.module_name

	engine.dispose()


def test_exam_engine_never_moves_a_module_to_another_date(tmp_path):
	engine = create_engine(f"sqlite:///{tmp_path / 'dated-exam.db'}")
	Base.metadata.create_all(engine)
	Session = sessionmaker(bind=engine)

	with Session() as db:
		db.add(Classroom(block_name="London Block", room_number="LT01", capacity=20))
		for index, (module, exam_date) in enumerate([
			("Algorithms", date(2026, 3, 12)),
			("Databases", date(2026, 3, 14)),
		]):
			db.add(Student(
				student_id=f"DATED-{index}",
				full_name=f"Dated Student {index}",
				programme="Computing",
				semester="Year 2",
				module_name=module,
				exam_date=exam_date,
				attendance_percentage=80,
				exam_1_score=70,
				exam_2_score=70,
				final_exam_score=70,
			))
		db.commit()

		assert generate_exam_schedule(db) == 2
		exams = db.scalars(select(ExamSchedule).order_by(ExamSchedule.exam_date)).all()
		assert [exam.exam_date for exam in exams] == [date(2026, 3, 12), date(2026, 3, 14)]
		assignments = db.scalars(select(ExamSeatAssignment)).all()
		student_dates = {
			assignment.student.student_id: assignment.exam.exam_date
			for assignment in assignments
		}
		assert student_dates == {"DATED-0": date(2026, 3, 12), "DATED-1": date(2026, 3, 14)}

	engine.dispose()


def test_invigilators_are_unique_for_concurrent_sessions():
	entries = [
		TimetableEntry(
			module_title="Algorithms",
			lecturer="Algorithms Lecturer",
			module_code="ALG",
			day="SUN",
			time_slot="09:00 - 10:00",
			group_name="AI",
			section_cohort="AI1",
			class_type="Lecture",
			room="LT 1",
			duration_hours=1.0,
		),
		TimetableEntry(
			module_title="Databases",
			lecturer="Databases Lecturer",
			module_code="DB",
			day="SUN",
			time_slot="09:00 - 10:00",
			group_name="AI",
			section_cohort="AI1",
			class_type="Lecture",
			room="LT 2",
			duration_hours=1.0,
		),
		TimetableEntry(
			module_title="Networks",
			lecturer="Neutral Lecturer",
			module_code="NET",
			day="SUN",
			time_slot="09:00 - 10:00",
			group_name="AI",
			section_cohort="AI1",
			class_type="Lecture",
			room="LT 3",
			duration_hours=1.0,
		),
	]
	busy = set()
	first = _invigilator_for_modules(["Algorithms"], entries, busy)
	second = _invigilator_for_modules(["Databases"], entries, busy)

	assert first != second
	assert first != "Algorithms Lecturer"
	assert second != "Databases Lecturer"


def test_invigilators_are_balanced_by_workload():
	entries = [
		TimetableEntry(
			module_title="Algorithms",
			lecturer="Algorithms Lecturer",
			module_code="ALG",
			day="SUN",
			time_slot="09:00 - 10:00",
			group_name="AI",
			section_cohort="AI1",
			class_type="Lecture",
			room="LT 1",
			duration_hours=1.0,
		),
		TimetableEntry(
			module_title="Networks",
			lecturer="Networks Lecturer",
			module_code="NET",
			day="SUN",
			time_slot="09:00 - 10:00",
			group_name="AI",
			section_cohort="AI1",
			class_type="Lecture",
			room="LT 2",
			duration_hours=1.0,
		),
		TimetableEntry(
			module_title="Databases",
			lecturer="Databases Lecturer",
			module_code="DB",
			day="SUN",
			time_slot="09:00 - 10:00",
			group_name="AI",
			section_cohort="AI1",
			class_type="Lecture",
			room="LT 3",
			duration_hours=1.0,
		),
	]
	loads = {"Networks Lecturer": 2, "Databases Lecturer": 1}
	selected = _invigilator_for_modules(["Algorithms"], entries, set(), loads)

	assert selected == "Databases Lecturer"
	assert loads[selected] == 2