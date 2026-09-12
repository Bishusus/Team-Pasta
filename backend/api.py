from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import Student
from .risk_engine import calculate_risk


router = APIRouter()


def _student_response(student: Student) -> dict:
	return {
		"student_id": student.student_id,
		"full_name": student.full_name,
		"programme": student.programme,
		"semester": student.semester,
		"module_name": student.module_name,
		"exam_date": student.exam_date.isoformat(),
		"attendance_percentage": student.attendance_percentage,
		"exam_1_score": student.exam_1_score,
		"exam_2_score": student.exam_2_score,
		"final_exam_score": student.final_exam_score,
	}


def _risk_response(student: Student) -> dict:
	"""
	Run the SQLAlchemy Student object straight through calculate_risk().
	risk_engine.py reads it via getattr (see _get_field), so no
	dict conversion is needed here and no scoring logic lives in
	this file — this is just plumbing the ORM object to the engine
	and the engine's result back out as JSON.
	"""
	return calculate_risk(student)


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

	return {
		**_student_response(student),
		**_risk_response(student),
	}


@router.get("/risk")
def get_risk(db: Session = Depends(get_db)) -> list[dict]:
	"""All students with their calculated risk info, for the risk dashboard/table."""
	students = db.scalars(select(Student).order_by(Student.student_id)).all()

	results = []
	for student in students:
		results.append(
			{
				"student_id": student.student_id,
				"full_name": student.full_name,
				"programme": student.programme,
				"module_name": student.module_name,
				"attendance_percentage": student.attendance_percentage,
				"final_exam_score": student.final_exam_score,
				**_risk_response(student),
			}
		)
	return results


@router.get("/risk-summary")
def get_risk_summary(db: Session = Depends(get_db)) -> dict:
	"""Counts used by the dashboard's summary cards."""
	students = db.scalars(select(Student)).all()

	total = 0
	high = 0
	medium = 0
	low = 0

	for student in students:
		total += 1
		level = calculate_risk(student)["risk_level"]
		if level == "HIGH":
			high += 1
		elif level == "MEDIUM":
			medium += 1
		else:
			low += 1

	return {
		"total_students": total,
		"high_risk": high,
		"medium_risk": medium,
		"low_risk": low,
	}