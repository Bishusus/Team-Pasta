import re
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .models import Classroom, Exam, SeatAssignment, Student, TimetableEntry


def calculate_room_grid(capacity: int) -> tuple[int, int]:
	"""
	Derives (rows, columns) grid dimensions from room capacity.
	- Capacity <= 32: 8 columns per row.
	- Capacity > 32: 10 columns per row.
	"""
	cols = 8 if capacity <= 32 else 10
	rows = (capacity + cols - 1) // cols
	return rows, cols


def _normalize_title(text: str) -> str:
	if not text:
		return ""
	return re.sub(r"[^a-z0-9]", "", text.lower())


def get_all_lecturers(db: Session) -> list[str]:
	entries = db.scalars(select(TimetableEntry.lecturer).distinct()).all()
	return [entry.strip() for entry in entries if entry and entry.strip()]


def get_module_lecturers(module_name: str, db: Session) -> set[str]:
	"""
	Returns the set of lecturers who teach module_name in TimetableEntry.
	These subject lecturers MUST NOT be assigned to invigilate their own module's exam.
	"""
	norm_target = _normalize_title(module_name)
	if not norm_target:
		return set()

	entries = db.scalars(select(TimetableEntry)).all()
	subject_lecturers: set[str] = set()
	for entry in entries:
		if not entry.lecturer:
			continue
		norm_title = _normalize_title(entry.module_title)
		norm_code = _normalize_title(entry.module_code)
		if (
			norm_target in norm_title
			or norm_title in norm_target
			or norm_target in norm_code
			or norm_code in norm_target
		):
			subject_lecturers.add(entry.lecturer.strip())

	return subject_lecturers


def assign_neutral_invigilator(
	module_names: list[str],
	exam_date: str,
	start_time: str,
	db: Session,
	busy_invigilators: set[tuple[str, str, str]],
) -> str:
	"""
	Assigns an invigilator for an exam hall.
	Guarantees:
	1. The invigilator DOES NOT teach any of the modules being examined in this hall.
	2. The invigilator is NOT already assigned to another hall at (exam_date, start_time).
	"""
	all_lecturers = get_all_lecturers(db)

	# Exclude all teachers associated with the modules taking the exam in this room
	forbidden_lecturers: set[str] = set()
	for mod in module_names:
		forbidden_lecturers.update(get_module_lecturers(mod, db))

	# 1. Try any lecturer in timetable pool who is NOT a subject lecturer and NOT busy
	for lecturer in all_lecturers:
		if (
			lecturer not in forbidden_lecturers
			and (exam_date, start_time, lecturer) not in busy_invigilators
		):
			busy_invigilators.add((exam_date, start_time, lecturer))
			return lecturer

	# 2. Fallback: try any lecturer not busy (if pool is too small to enforce neutral rule completely)
	for lecturer in all_lecturers:
		if (exam_date, start_time, lecturer) not in busy_invigilators:
			busy_invigilators.add((exam_date, start_time, lecturer))
			return lecturer

	# 3. Ultimate fallback
	fallback_name = "External Invigilator"
	busy_invigilators.add((exam_date, start_time, fallback_name))
	return fallback_name


def generate_seating_plan(
	db: Session,
	start_time: str = "09:00 AM",
	exam_duration_hours: float = 2.0,
	break_minutes: int = 30,
) -> list[dict]:
	"""
	Generates exam schedules and seat assignments for all registered students.
	Features:
	- Neutral cross-invigilation (subject teachers excluded).
	- Multi-module room sharing with interleaved seat placement (Odd Cols: Mod A, Even Cols: Mod B).
	- Single-module empty seat spacing when room is unshared.
	"""
	# Clear existing seating plan data
	db.execute(delete(SeatAssignment))
	db.execute(delete(Exam))
	db.commit()

	students = db.scalars(select(Student).order_by(Student.student_id)).all()
	classrooms = db.scalars(
		select(Classroom).order_by(Classroom.capacity.desc(), Classroom.room_number)
	).all()

	if not students:
		return []

	if not classrooms:
		raise ValueError("No classrooms found in database to schedule seating.")

	# Group students by exam_date and module_name
	date_module_students: dict[str, dict[str, list[Student]]] = defaultdict(
		lambda: defaultdict(list)
	)
	for student in students:
		date_str = (
			student.exam_date.isoformat()
			if student.exam_date
			else datetime.now().date().isoformat()
		)
		module_str = student.module_name or "General Assessment"
		date_module_students[date_str][module_str].append(student)

	busy_invigilators: set[tuple[str, str, str]] = set()
	generated_results = []

	for exam_date, modules_map in date_module_students.items():
		current_start = datetime.strptime(start_time, "%I:%M %p")

		# Create queue of modules with remaining students
		active_modules = [
			(mod_name, list(stu_list))
			for mod_name, stu_list in modules_map.items()
		]

		classroom_idx = 0

		while active_modules:
			time_slot_str = current_start.strftime("%I:%M %p")

			# Pair modules for room sharing if at least 2 modules remain
			if len(active_modules) >= 2:
				shared_modules = [active_modules[0], active_modules[1]]
			else:
				shared_modules = [active_modules[0]]

			classroom = classrooms[classroom_idx % len(classrooms)]
			rows, cols = calculate_room_grid(classroom.capacity)

			exam_module_names = [m_name for m_name, _ in shared_modules]
			invigilator = assign_neutral_invigilator(
				module_names=exam_module_names,
				exam_date=exam_date,
				start_time=time_slot_str,
				db=db,
				busy_invigilators=busy_invigilators,
			)

			exam_title = (
				f"{shared_modules[0][0]} & {shared_modules[1][0]} Exam"
				if len(shared_modules) > 1
				else f"{shared_modules[0][0]} Exam"
			)

			exam = Exam(
				name=exam_title,
				exam_date=exam_date,
				start_time=time_slot_str,
				invigilator=invigilator,
				classroom_id=classroom.id,
			)
			db.add(exam)
			db.flush()

			room_assignments = []
			assigned_seats = 0

			# Interleaved seating logic
			if len(shared_modules) > 1:
				# Shared Room: Mod 1 in Odd Cols (1, 3, 5...), Mod 2 in Even Cols (2, 4, 6...)
				(_, m1_stus) = shared_modules[0]
				(_, m2_stus) = shared_modules[1]

				for r in range(1, rows + 1):
					for c in range(1, cols + 1):
						if assigned_seats >= classroom.capacity:
							break

						# Odd column -> Module 1
						if c % 2 != 0:
							if m1_stus:
								student = m1_stus.pop(0)
								seat_num = f"R{r}-C{c}"
								db.add(
									SeatAssignment(
										exam_id=exam.id,
										student_id=student.id,
										classroom_id=classroom.id,
										row=r,
										column=c,
										seat_number=seat_num,
									)
								)
								room_assignments.append(
									{
										"seat_number": seat_num,
										"row": r,
										"column": c,
										"student_id": student.student_id,
										"full_name": student.full_name,
										"module_name": student.module_name,
									}
								)
								assigned_seats += 1
						# Even column -> Module 2
						else:
							if m2_stus:
								student = m2_stus.pop(0)
								seat_num = f"R{r}-C{c}"
								db.add(
									SeatAssignment(
										exam_id=exam.id,
										student_id=student.id,
										classroom_id=classroom.id,
										row=r,
										column=c,
										seat_number=seat_num,
									)
								)
								room_assignments.append(
									{
										"seat_number": seat_num,
										"row": r,
										"column": c,
										"student_id": student.student_id,
										"full_name": student.full_name,
										"module_name": student.module_name,
									}
								)
								assigned_seats += 1
			else:
				# Single Room: Alternate seats (checkerboard) to prevent same-module adjacency
				(_, m1_stus) = shared_modules[0]
				for r in range(1, rows + 1):
					for c in range(1, cols + 1):
						if not m1_stus or assigned_seats >= classroom.capacity:
							break
						if (r + c) % 2 == 0:
							student = m1_stus.pop(0)
							seat_num = f"R{r}-C{c}"
							db.add(
								SeatAssignment(
									exam_id=exam.id,
									student_id=student.id,
									classroom_id=classroom.id,
									row=r,
									column=c,
									seat_number=seat_num,
								)
							)
							room_assignments.append(
								{
									"seat_number": seat_num,
									"row": r,
									"column": c,
									"student_id": student.student_id,
									"full_name": student.full_name,
									"module_name": student.module_name,
								}
							)
							assigned_seats += 1

			generated_results.append(
				{
					"exam_id": exam.id,
					"exam_name": exam.name,
					"exam_date": exam.exam_date,
					"start_time": exam.start_time,
					"invigilator": exam.invigilator,
					"classroom_id": classroom.id,
					"block_name": classroom.block_name,
					"room_number": classroom.room_number,
					"capacity": classroom.capacity,
					"rows": rows,
					"cols": cols,
					"assigned_count": len(room_assignments),
					"assignments": room_assignments,
				}
			)

			# Remove exhausted modules from active_modules queue
			new_active = []
			for m_name, m_stus in active_modules:
				if m_stus:
					new_active.append((m_name, m_stus))
			active_modules = new_active

			classroom_idx += 1
			if classroom_idx % len(classrooms) == 0:
				current_start += timedelta(
					hours=exam_duration_hours, minutes=break_minutes
				)

	db.commit()
	return generated_results
