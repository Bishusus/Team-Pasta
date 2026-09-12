from collections import defaultdict
from datetime import date, datetime, time, timedelta
from difflib import SequenceMatcher
from math import ceil, sqrt
import re

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .models import Classroom, ExamRoom, ExamSchedule, ExamSeatAssignment, Student, TimetableEntry


EXAM_DURATION_MINUTES = 120
BREAK_MINUTES = 30
DAY_START = time(9, 0)


def _tokens(value: str) -> set[str]:
	return {
		token
		for token in re.findall(r"[a-z0-9]+", value.lower())
		if len(token) > 2
	}


def _module_lecturers(module_name: str, timetable: list[TimetableEntry]) -> set[str]:
	module_tokens = _tokens(module_name)
	scores: list[tuple[float, str]] = []
	for entry in timetable:
		entry_tokens = _tokens(entry.module_title)
		shared = len(module_tokens & entry_tokens)
		score = shared / max(len(module_tokens | entry_tokens), 1)
		score = max(
			score,
			SequenceMatcher(None, module_name.lower(), entry.module_title.lower()).ratio() * 0.35,
		)
		scores.append((score, entry.lecturer))
	if not scores:
		return set()
	best_score = max(score for score, _ in scores)
	if best_score < 0.2:
		return set()
	return {lecturer for score, lecturer in scores if score >= best_score * 0.9}


def _invigilator_for_modules(
	module_names: list[str],
	timetable: list[TimetableEntry],
	busy: set[str],
	loads: dict[str, int] | None = None,
) -> str:
	lecturers = sorted({entry.lecturer for entry in timetable if entry.lecturer})
	forbidden = set().union(*(_module_lecturers(module, timetable) for module in module_names))
	available = [lecturer for lecturer in lecturers if lecturer not in forbidden and lecturer not in busy]
	if available:
		load_counts = loads if loads is not None else {}
		invigilator = min(available, key=lambda lecturer: (load_counts.get(lecturer, 0), lecturer))
		busy.add(invigilator)
		if loads is not None:
			loads[invigilator] = loads.get(invigilator, 0) + 1
		return invigilator
	return "External Invigilator"


def _room_dimensions(capacity: int) -> tuple[int, int]:
	columns = max(2, ceil(sqrt(capacity)))
	rows = ceil(capacity / columns)
	return rows, columns


def _seat_positions(room: ExamRoom):
	return [(row, column) for row in range(1, room.rows + 1) for column in range(1, room.columns + 1)]


def _assign_paired_seats(
	exam: ExamSchedule,
	module_students: list[tuple[str, list[Student]]],
	rooms: list[ExamRoom],
	db: Session,
) -> None:
	if len(module_students) == 1:
		remaining = list(module_students[0][1])
		for room in rooms:
			for row, column in _seat_positions(room):
				if not remaining:
					return
				if (row + column) % 2 != 0:
					continue
				student = remaining.pop(0)
				db.add(
					ExamSeatAssignment(
						exam_id=exam.id,
						student_id=student.id,
						room_id=room.id,
						row=row,
						column=column,
						seat_number=f"{room.name}-{row}-{column}",
						module_name=module_students[0][0],
					)
				)
		if remaining:
			raise ValueError("Not enough classroom seats for the exam session")
		return

	remaining = {module: list(students) for module, students in module_students}
	for room in rooms:
		assigned_modules: dict[tuple[int, int], str] = {}
		for row, column in _seat_positions(room):
			if not any(remaining.values()):
				return
			preferred = module_students[(column - 1) % 2][0]
			other = module_students[1 - ((column - 1) % 2)][0]
			left_module = assigned_modules.get((row, column - 1))
			module = next(
				(
					candidate
					for candidate in (preferred, other)
					if remaining[candidate] and candidate != left_module
				),
				None,
			)
			if module is None:
				continue
			student = remaining[module].pop(0)
			db.add(
				ExamSeatAssignment(
					exam_id=exam.id,
					student_id=student.id,
					room_id=room.id,
					row=row,
					column=column,
					seat_number=f"{room.name}-{row}-{column}",
					module_name=module,
				)
			)
			assigned_modules[(row, column)] = module
	if any(remaining.values()):
		raise ValueError("Not enough classroom seats for the paired exam session")


def generate_exam_schedule(db: Session) -> int:
	students = db.scalars(select(Student).order_by(Student.exam_date, Student.module_name, Student.student_id)).all()
	classrooms = db.scalars(select(Classroom).order_by(Classroom.capacity.desc(), Classroom.block_name, Classroom.room_number)).all()
	timetable = db.scalars(select(TimetableEntry).order_by(TimetableEntry.module_title, TimetableEntry.lecturer)).all()
	if not students:
		return 0
	if not classrooms:
		raise ValueError("At least one classroom is required to generate exam seating")

	db.execute(delete(ExamSeatAssignment))
	db.execute(delete(ExamSchedule))
	db.execute(delete(ExamRoom))

	rooms = []
	for classroom in classrooms:
		rows, columns = _room_dimensions(classroom.capacity)
		room = ExamRoom(
			name=f"{classroom.block_name} {classroom.room_number}",
			rows=rows,
			columns=columns,
			capacity=classroom.capacity,
		)
		db.add(room)
		rooms.append(room)
	db.flush()

	by_date_module: dict[date, dict[str, list[Student]]] = defaultdict(lambda: defaultdict(list))
	for student in students:
		by_date_module[student.exam_date][student.module_name].append(student)
	sessions_by_date: dict[date, list[list[str]]] = defaultdict(list)
	for exam_date, modules in by_date_module.items():
		module_names = sorted(modules)
		for index in range(0, len(module_names), 2):
			sessions_by_date[exam_date].append(module_names[index:index + 2])

	generated = 0
	busy_by_slot: dict[tuple[date, str], set[str]] = defaultdict(set)
	invigilator_loads: dict[str, int] = defaultdict(int)
	for exam_date in sorted(sessions_by_date):
		for offset, pair in enumerate(sessions_by_date[exam_date]):
			start = datetime.combine(exam_date, DAY_START) + timedelta(minutes=offset * (EXAM_DURATION_MINUTES + BREAK_MINUTES))
			module_students = [(module, by_date_module[exam_date][module]) for module in pair]
			combined_name = " + ".join(pair)
			busy_invigilators = busy_by_slot[(exam_date, start.strftime("%H:%M"))]
			exam = ExamSchedule(
				module_name=combined_name,
				exam_date=exam_date,
				start_time=start.strftime("%H:%M"),
				duration_minutes=EXAM_DURATION_MINUTES,
				invigilator=_invigilator_for_modules(
					[module for module, _ in module_students],
					timetable,
					busy_invigilators,
					invigilator_loads,
				),
				student_count=sum(len(students) for _, students in module_students),
			)
			db.add(exam)
			db.flush()
			_assign_paired_seats(exam, module_students, rooms, db)
			generated += 1

	db.commit()
	return generated