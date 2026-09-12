from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import Student


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
