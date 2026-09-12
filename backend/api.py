from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from .database import get_db
from .exam_engine import generate_exam_schedule
from .models import Classroom, Exam, ExamRoom, ExamSchedule, ExamSeatAssignment, SeatAssignment, Student, TimetableEntry
from .risk_engine import calculate_risk
from .seating_engine import calculate_room_grid, generate_seating_plan


router = APIRouter()


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
					for assignment in assignments
					if assignment.room_id == room.id
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
	exams = db.scalars(select(Exam).order_by(Exam.exam_date, Exam.start_time)).all()
	results = []
	for exam in exams:
		classroom = exam.classroom
		assignments = db.scalars(
			select(SeatAssignment).where(SeatAssignment.exam_id == exam.id)
		).all()
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


