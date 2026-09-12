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


def _invigilator_for_module(module_name: str, timetable: list[TimetableEntry]) -> str:
	if not timetable:
		return "Unassigned"
	module_tokens = _tokens(module_name)
	best_score = 0.0
	best_invigilator = None
	for entry in timetable:
		entry_tokens = _tokens(entry.module_title)
		shared = len(module_tokens & entry_tokens)
		score = shared / max(len(module_tokens | entry_tokens), 1)
		score = max(score, SequenceMatcher(None, module_name.lower(), entry.module_title.lower()).ratio() * 0.35)
		if score > best_score:
			best_score = score
			best_invigilator = entry.lecturer
	if best_invigilator:
		return best_invigilator
	invigilators = sorted({entry.lecturer for entry in timetable})
	stable_index = sum(ord(character) for character in module_name) % len(invigilators)
	return invigilators[stable_index]


def _room_dimensions(capacity: int) -> tuple[int, int]:
	columns = max(2, ceil(sqrt(capacity)))
	rows = ceil(capacity / columns)
	return rows, columns


def _seat_positions(room: ExamRoom):
	return [(row, column) for row in range(1, room.rows + 1) for column in range(1, room.columns + 1)]


def _assign_seats(exam: ExamSchedule, students: list[Student], rooms: list[ExamRoom], db: Session) -> None:
	student_index = 0
	assigned_modules: dict[tuple[int, int, int], str] = {}
	for room in rooms:
		positions = _seat_positions(room)
		for index, (row, column) in enumerate(positions):
			if student_index >= len(students):
				return
			student = students[student_index]
			left_module = assigned_modules.get((room.id, row, column - 1))
			if left_module == student.module_name:
				continue
			db.add(
				ExamSeatAssignment(
					exam_id=exam.id,
					student_id=student.id,
					room_id=room.id,
					row=row,
					column=column,
					seat_number=f"{room.name}-{row}-{column}",
					module_name=student.module_name,
				)
			)
			assigned_modules[(room.id, row, column)] = student.module_name
			student_index += 1
	if student_index < len(students):
		raise ValueError("Not enough classroom seats to keep students from the same module apart")


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

	grouped: dict[date, list[Student]] = defaultdict(list)
	for student in students:
		grouped[student.exam_date].append(student)

	generated = 0
	for exam_date in sorted(grouped):
		by_module: dict[str, list[Student]] = defaultdict(list)
		for student in grouped[exam_date]:
			by_module[student.module_name].append(student)
		for offset, module_name in enumerate(sorted(by_module)):
			start = datetime.combine(exam_date, DAY_START) + timedelta(minutes=offset * (EXAM_DURATION_MINUTES + BREAK_MINUTES))
			exam = ExamSchedule(
				module_name=module_name,
				exam_date=exam_date,
				start_time=start.strftime("%H:%M"),
				duration_minutes=EXAM_DURATION_MINUTES,
				invigilator=_invigilator_for_module(module_name, timetable),
				student_count=len(by_module[module_name]),
			)
			db.add(exam)
			db.flush()
			_assign_seats(exam, by_module[module_name], rooms, db)
			generated += 1

	db.commit()
	return generated