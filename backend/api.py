from datetime import datetime
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.orm import Session, joinedload, selectinload

from .database import get_db
from .exam_engine import generate_exam_schedule
from .models import Classroom, ClassroomBooking, Exam, ExamRoom, ExamSchedule, ExamSeatAssignment, SeatAssignment, Student, TimetableEntry
from .risk_engine import calculate_risk
from .seating_engine import calculate_room_grid, generate_seating_plan


router = APIRouter()


class BookingCreate(BaseModel):
	classroom_id: int
	day: str
	start_time: str
	end_time: str
	booked_by: str
	purpose: str


def _booking_time(value: str):
	for pattern in ("%H:%M", "%I:%M %p"):
		try:
			return datetime.strptime(value.strip().upper(), pattern).time()
		except ValueError:
			continue
	raise HTTPException(status_code=400, detail=f"Invalid time: {value}")


def _room_key(value: str) -> str:
	compact = re.sub(r"[^A-Z0-9]", "", value.upper())
	match = re.fullmatch(r"([A-Z]+)0*(\d+)", compact)
	return f"{match.group(1)}{int(match.group(2))}" if match else compact


def _timetable_classroom_ids(room: str, classrooms: list[Classroom]) -> set[int]:
	room_key = _room_key(room)
	return {
		classroom.id
		for classroom in classrooms
		if _room_key(classroom.room_number) == room_key
	}


def _interval_overlaps(start, end, other_start, other_end) -> bool:
	return start < other_end and end > other_start


def _validate_booking_window(day: str, start_time: str, end_time: str):
	clean_day = day.strip().upper()
	if clean_day not in {"SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"}:
		raise HTTPException(status_code=400, detail="Day must be a valid weekday abbreviation.")
	start = _booking_time(start_time)
	end = _booking_time(end_time)
	opening = datetime.strptime("07:00", "%H:%M").time()
	closing = datetime.strptime("21:00", "%H:%M").time()
	if start < opening or end > closing:
		raise HTTPException(status_code=400, detail="Bookings are only available between 07:00 and 21:00.")
	if start >= end:
		raise HTTPException(status_code=400, detail="End time must be after start time.")
	return clean_day, start, end


def _booking_response(booking: ClassroomBooking, classroom: Classroom) -> dict:
	return {
		"id": booking.id,
		"classroom_id": classroom.id,
		"room": f"{classroom.block_name} {classroom.room_number}",
		"day": booking.day,
		"start_time": booking.start_time,
		"end_time": booking.end_time,
		"booked_by": booking.booked_by,
		"purpose": booking.purpose,
	}


def _exam_response(exam: ExamSchedule) -> dict:
	return {
		"id": exam.id,
		"module_name": exam.module_name,
		"modules": exam.module_name.split(" + "),
		"exam_date": exam.exam_date.isoformat(),
		"start_time": exam.start_time,
		"duration_minutes": exam.duration_minutes,
		"invigilator": exam.invigilator,
		"student_count": exam.student_count,
	}


def _timetable_response(entry: TimetableEntry) -> dict:
	return {
		"id": entry.id,
		"day": entry.day,
		"time_slot": entry.time_slot,
		"group": entry.group_name,
		"section_cohort": entry.section_cohort,
		"class_type": entry.class_type,
		"module_code": entry.module_code,
		"module_title": entry.module_title,
		"lecturer": entry.lecturer,
		"room": entry.room,
		"duration_hours": entry.duration_hours,
	}


def _student_response(student: Student) -> dict:
	return {
		"student_id": student.student_id,
		"full_name": student.full_name,
		"programme": student.programme,
		"semester": student.semester,
		"module_name": student.module_name,
		"exam_date": student.exam_date.isoformat() if student.exam_date else None,
		"attendance_percentage": student.attendance_percentage,
		"exam_1_score": student.exam_1_score,
		"exam_2_score": student.exam_2_score,
		"final_exam_score": student.final_exam_score,
	}


@router.get("/students")
def get_students(db: Session = Depends(get_db)) -> list[dict]:
	students = db.scalars(select(Student).order_by(Student.student_id)).all()
	return [_student_response(student) for student in students]


@router.get("/students/{student_id}")
def get_student(
	student_id: str, db: Session = Depends(get_db)
) -> dict:
	student = db.scalar(select(Student).where(Student.student_id == student_id))
	if student is None:
		raise HTTPException(status_code=404, detail="Student not found")
	return _student_response(student)


def _risk_response(student: Student) -> dict:
	risk = calculate_risk(
		{
			"student_id": student.student_id,
			"full_name": student.full_name,
			"module_name": student.module_name,
			"attendance_percentage": student.attendance_percentage,
			"exam_1_score": student.exam_1_score,
			"exam_2_score": student.exam_2_score,
			"final_exam_score": student.final_exam_score,
		}
	)
	return {**_student_response(student), **risk}


@router.get("/risk")
def get_risks(db: Session = Depends(get_db)) -> list[dict]:
	students = db.scalars(select(Student).order_by(Student.student_id)).all()
	return [_risk_response(student) for student in students]


@router.get("/risk-summary")
def get_risk_summary(db: Session = Depends(get_db)) -> dict[str, int]:
	students = db.scalars(select(Student).order_by(Student.student_id)).all()
	risks = [_risk_response(student) for student in students]
	return {
		"total_students": len(risks),
		"high_risk": sum(risk["risk_level"] == "HIGH" for risk in risks),
		"medium_risk": sum(risk["risk_level"] == "MEDIUM" for risk in risks),
		"low_risk": sum(risk["risk_level"] == "LOW" for risk in risks),
	}


@router.get("/risk/{student_id}")
def get_student_risk(
	student_id: str, db: Session = Depends(get_db)
) -> dict:
	student = db.scalar(select(Student).where(Student.student_id == student_id))
	if student is None:
		raise HTTPException(status_code=404, detail="Student not found")
	return _risk_response(student)


@router.get("/timetable")
def get_timetable(
	day: str | None = None,
	module_code: str | None = None,
	room: str | None = None,
	db: Session = Depends(get_db),
) -> list[dict]:
	query = select(TimetableEntry).order_by(
		TimetableEntry.day,
		TimetableEntry.time_slot,
		TimetableEntry.room,
	)
	if day:
		query = query.where(TimetableEntry.day == day.strip().upper())
	if module_code:
		query = query.where(TimetableEntry.module_code == module_code.strip())
	if room:
		query = query.where(TimetableEntry.room == room.strip())
	entries = db.scalars(query).all()
	return [_timetable_response(entry) for entry in entries]


@router.get("/timetable/{entry_id}")
def get_timetable_entry(
	entry_id: int, db: Session = Depends(get_db)
) -> dict:
	entry = db.get(TimetableEntry, entry_id)
	if entry is None:
		raise HTTPException(status_code=404, detail="Timetable entry not found")
	return _timetable_response(entry)


def _classroom_response(classroom: Classroom) -> dict:
	return {
		"id": classroom.id,
		"block_name": classroom.block_name,
		"room_number": classroom.room_number,
		"capacity": classroom.capacity,
	}


@router.get("/classrooms")
def get_classrooms(
	block_name: str | None = None,
	room_number: str | None = None,
	db: Session = Depends(get_db),
) -> list[dict]:
	query = select(Classroom).order_by(
		Classroom.block_name,
		Classroom.room_number,
	)
	if block_name:
		query = query.where(Classroom.block_name == block_name.strip())
	if room_number:
		query = query.where(Classroom.room_number == room_number.strip())
	classrooms = db.scalars(query).all()
	return [_classroom_response(c) for c in classrooms]


@router.get("/classrooms/{classroom_id}")
def get_classroom(
	classroom_id: int, db: Session = Depends(get_db)
) -> dict:
	classroom = db.get(Classroom, classroom_id)
	if classroom is None:
		raise HTTPException(status_code=404, detail="Classroom not found")
	return _classroom_response(classroom)


@router.get("/bookings/availability")
def get_booking_availability(day: str, start_time: str, end_time: str, db: Session = Depends(get_db)) -> list[dict]:
	clean_day, start, end = _validate_booking_window(day, start_time, end_time)
	classrooms = db.scalars(select(Classroom).order_by(Classroom.block_name, Classroom.room_number)).all()
	timetable = db.scalars(select(TimetableEntry).where(TimetableEntry.day == clean_day)).all()
	bookings = db.scalars(
		select(ClassroomBooking)
		.options(joinedload(ClassroomBooking.classroom))
		.where(ClassroomBooking.day == clean_day)
	).all()
	occupied_classroom_ids: set[int] = set()
	for entry in timetable:
		parts = entry.time_slot.split(" - ", 1)
		if len(parts) == 2 and _interval_overlaps(start, end, _booking_time(parts[0]), _booking_time(parts[1])):
			occupied_classroom_ids.update(_timetable_classroom_ids(entry.room, classrooms))
	for booking in bookings:
		if _interval_overlaps(start, end, _booking_time(booking.start_time), _booking_time(booking.end_time)):
			classroom = booking.classroom
			if classroom:
				occupied_classroom_ids.add(classroom.id)
	return [
		{**_classroom_response(classroom), "available": classroom.id not in occupied_classroom_ids}
		for classroom in classrooms
	]


@router.get("/bookings")
def get_bookings(day: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
	query = select(ClassroomBooking).order_by(ClassroomBooking.day, ClassroomBooking.start_time)
	if day:
		query = query.where(ClassroomBooking.day == day.strip().upper())
	bookings = db.scalars(query.options(joinedload(ClassroomBooking.classroom))).all()
	return [_booking_response(booking, booking.classroom) for booking in bookings]


@router.post("/bookings", status_code=201)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)) -> dict:
	day, start, end = _validate_booking_window(payload.day, payload.start_time, payload.end_time)
	classroom = db.get(Classroom, payload.classroom_id)
	if classroom is None:
		raise HTTPException(status_code=404, detail="Classroom not found")
	if not payload.booked_by.strip() or not payload.purpose.strip():
		raise HTTPException(status_code=400, detail="Booker name and purpose are required.")
	if db.bind.dialect.name == "postgresql":
		db.execute(text("SELECT pg_advisory_xact_lock(:lock_key)"), {"lock_key": classroom.id})
	conflict = db.scalar(
		select(ClassroomBooking.id).where(
			ClassroomBooking.classroom_id == classroom.id,
			ClassroomBooking.day == day,
			ClassroomBooking.start_time < end.strftime("%H:%M"),
			ClassroomBooking.end_time > start.strftime("%H:%M"),
		)
	)
	if conflict is not None:
		raise HTTPException(status_code=409, detail="Classroom is occupied during the selected time.")
	booking = ClassroomBooking(
		classroom_id=classroom.id,
		day=day,
		start_time=start.strftime("%H:%M"),
		end_time=end.strftime("%H:%M"),
		booked_by=payload.booked_by.strip(),
		purpose=payload.purpose.strip(),
	)
	db.add(booking)
	db.commit()
	db.refresh(booking)
	return _booking_response(booking, classroom)


@router.post("/exam-schedule/generate")
def generate_schedule(db: Session = Depends(get_db)) -> dict:
	return {"generated_exams": generate_exam_schedule(db)}


@router.get("/exam-schedule")
def get_exam_schedule(db: Session = Depends(get_db)) -> list[dict]:
	exams = db.scalars(select(ExamSchedule).order_by(ExamSchedule.exam_date, ExamSchedule.start_time)).all()
	return [_exam_response(exam) for exam in exams]


@router.get("/exam-schedule/{exam_id}/layout")
def get_exam_layout(exam_id: int, db: Session = Depends(get_db)) -> dict:
	exam = db.get(ExamSchedule, exam_id)
	if exam is None:
		raise HTTPException(status_code=404, detail="Generated exam not found")
	assignments = db.scalars(
		select(ExamSeatAssignment)
		.options(joinedload(ExamSeatAssignment.student), joinedload(ExamSeatAssignment.room))
		.where(ExamSeatAssignment.exam_id == exam_id)
		.order_by(ExamSeatAssignment.room_id, ExamSeatAssignment.row, ExamSeatAssignment.column)
	).all()
	assignments_by_room: dict[int, list[ExamSeatAssignment]] = {}
	for assignment in assignments:
		assignments_by_room.setdefault(assignment.room_id, []).append(assignment)
	rooms_by_id = {assignment.room.id: assignment.room for assignment in assignments}
	return {
		"exam": _exam_response(exam),
		"rooms": [
			{
				"id": room.id,
				"name": room.name,
				"rows": room.rows,
				"columns": room.columns,
				"capacity": room.capacity,
				"assignments": [
					{
						"row": assignment.row,
						"column": assignment.column,
						"seat_number": assignment.seat_number,
						"module_name": assignment.module_name,
						"student_id": assignment.student.student_id,
						"student_name": assignment.student.full_name,
					}
					for assignment in assignments_by_room[room.id]
				],
			}
			for room in rooms_by_id.values()
		],
	}


@router.post("/seating/generate")
def generate_seating(db: Session = Depends(get_db)) -> dict:
	results = generate_seating_plan(db)
	return {"status": "success", "generated_plans": results}


@router.get("/seating")
def get_seating_plans(db: Session = Depends(get_db)) -> list[dict]:
	exams = db.scalars(
		select(Exam)
		.options(joinedload(Exam.classroom), selectinload(Exam.seat_assignments))
		.order_by(Exam.exam_date, Exam.start_time)
	).all()
	results = []
	for exam in exams:
		classroom = exam.classroom
		assignments = exam.seat_assignments
		capacity = classroom.capacity if classroom else 0
		rows, cols = calculate_room_grid(capacity) if capacity else (0, 0)
		results.append(
			{
				"id": exam.id,
				"name": exam.name,
				"exam_date": exam.exam_date,
				"start_time": exam.start_time,
				"invigilator": exam.invigilator or "Unassigned Staff",
				"classroom": {
					"id": classroom.id if classroom else None,
					"block_name": classroom.block_name if classroom else None,
					"room_number": classroom.room_number if classroom else None,
					"capacity": capacity,
					"rows": rows,
					"cols": cols,
				},
				"assigned_count": len(assignments),
			}
		)
	return results


@router.get("/seating/exam/{exam_id}")
def get_seating_plan_for_exam(
	exam_id: int, db: Session = Depends(get_db)
) -> dict:
	exam = db.get(Exam, exam_id)
	if exam is None:
		raise HTTPException(status_code=404, detail="Exam seating plan not found")

	classroom = exam.classroom
	capacity = classroom.capacity if classroom else 0
	rows, cols = calculate_room_grid(capacity) if capacity else (0, 0)

	assignments = db.scalars(
		select(SeatAssignment)
		.options(joinedload(SeatAssignment.student))
		.where(SeatAssignment.exam_id == exam_id)
		.order_by(SeatAssignment.row, SeatAssignment.column)
	).all()

	return {
		"id": exam.id,
		"name": exam.name,
		"exam_date": exam.exam_date,
		"start_time": exam.start_time,
		"invigilator": exam.invigilator or "Unassigned Staff",
		"classroom": {
			"id": classroom.id if classroom else None,
			"block_name": classroom.block_name if classroom else None,
			"room_number": classroom.room_number if classroom else None,
			"capacity": capacity,
			"rows": rows,
			"cols": cols,
		},
		"assignments": [
			{
				"id": assignment.id,
				"row": assignment.row,
				"column": assignment.column,
				"seat_number": assignment.seat_number,
				"student": {
					"id": assignment.student.student_id,
					"full_name": assignment.student.full_name,
					"programme": assignment.student.programme,
					"semester": assignment.student.semester,
					"module_name": assignment.student.module_name,
				},
			}
			for assignment in assignments
		],
	}


