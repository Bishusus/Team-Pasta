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
