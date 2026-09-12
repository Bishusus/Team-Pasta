from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import Student


router = APIRouter()


def _student_response(student: Student) -> dict[str, str | None]:
	return {
		"student_id": student.student_id,
		"name": student.name,
		"email": student.email,
	}


@router.get("/students")
def get_students(db: Session = Depends(get_db)) -> list[dict[str, str | None]]:
	students = db.scalars(select(Student).order_by(Student.student_id)).all()
	return [_student_response(student) for student in students]


@router.get("/students/{student_id}")
def get_student(
	student_id: str, db: Session = Depends(get_db)
) -> dict[str, str | None]:
	student = db.scalar(select(Student).where(Student.student_id == student_id))
	if student is None:
		raise HTTPException(status_code=404, detail="Student not found")
	return _student_response(student)
