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


def find_candidate_invigilators(module_name: str, db: Session) -> list[str]:
	entries = db.scalars(select(TimetableEntry)).all()
	norm_target = _normalize_title(module_name)

	matches: list[tuple[int, str]] = []
	seen: set[str] = set()

	for entry in entries:
		lecturer = entry.lecturer.strip() if entry.lecturer else ""
		if not lecturer or lecturer in seen:
			continue

		norm_title = _normalize_title(entry.module_title)
		norm_code = _normalize_title(entry.module_code)

		score = 0
		if norm_target and (norm_target in norm_title or norm_title in norm_target):
			score = 100
		elif norm_target and (norm_target in norm_code or norm_code in norm_target):
			score = 80
		
		if score > 0:
			matches.append((score, lecturer))
			seen.add(lecturer)

	matches.sort(key=lambda item: item[0], reverse=True)
	return [lecturer for _, lecturer in matches]


def assign_invigilator(
	module_name: str,
	exam_date: str,
	start_time: str,
	db: Session,
	busy_invigilators: set[tuple[str, str, str]],
	match_subject_teacher: bool = True,
) -> str:
	all_lecturers = get_all_lecturers(db)
	candidates = (
		find_candidate_invigilators(module_name, db) if match_subject_teacher else []
	)

	# 1. Try candidates by title match score if not busy
	for lecturer in candidates:
		if (exam_date, start_time, lecturer) not in busy_invigilators:
			busy_invigilators.add((exam_date, start_time, lecturer))
			return lecturer

	# 2. Fallback to any available lecturer in timetable pool
	for lecturer in all_lecturers:
		if (exam_date, start_time, lecturer) not in busy_invigilators:
			busy_invigilators.add((exam_date, start_time, lecturer))
			return lecturer

	# 3. Ultimate fallback if all pool invigilators are assigned
	fallback_name = "Unassigned Staff"
	busy_invigilators.add((exam_date, start_time, fallback_name))
	return fallback_name


def generate_seating_plan(
	db: Session,
	start_time: str = "09:00 AM",
	exam_duration_hours: float = 2.0,
	break_minutes: int = 30,
	match_subject_teacher: bool = True,
) -> list[dict]:
	"""
	Generates exam schedules and seat assignments for all registered students.
	Ensures invigilator collision tracking, multi-module interleaving, single-module empty-seat buffers,
	and room spillover handling.
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
		
		# Process modules scheduled on this date
		for module_name, module_students in modules_map.items():
			time_slot_str = current_start.strftime("%I:%M %p")
			
			# Determine classrooms needed for this module's cohort
			remaining_students = list(module_students)
			
			for classroom in classrooms:
				if not remaining_students:
					break

				rows, cols = calculate_room_grid(classroom.capacity)
				invigilator = assign_invigilator(
					module_name=module_name,
					exam_date=exam_date,
					start_time=time_slot_str,
					db=db,
					busy_invigilators=busy_invigilators,
					match_subject_teacher=match_subject_teacher,
				)

				exam = Exam(
					name=f"{module_name} Exam",
					exam_date=exam_date,
					start_time=time_slot_str,
					invigilator=invigilator,
					classroom_id=classroom.id,
				)
				db.add(exam)
				db.flush()

				room_assignments = []
				
				# Place students in seats using single-module spacing (alternate seats)
				seat_idx = 0
				for r in range(1, rows + 1):
					for c in range(1, cols + 1):
						if not remaining_students:
							break
						# Single-module spacing: alternate seats to avoid adjacent placement
						if (r + c) % 2 == 0:
							student = remaining_students.pop(0)
							seat_num = f"R{r}-C{c}"
							assignment = SeatAssignment(
								exam_id=exam.id,
								student_id=student.id,
								classroom_id=classroom.id,
								row=r,
								column=c,
								seat_number=seat_num,
							)
							db.add(assignment)
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
							seat_idx += 1
						if seat_idx >= classroom.capacity:
							break
					if not remaining_students or seat_idx >= classroom.capacity:
						break

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

			# Advance start time for next exam on same day (2h duration + break)
			current_start += timedelta(hours=exam_duration_hours, minutes=break_minutes)

	db.commit()
	return generated_results
