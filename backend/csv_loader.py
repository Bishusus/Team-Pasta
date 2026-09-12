from pathlib import Path

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Student


REQUIRED_COLUMNS = {"student_id", "name"}
OPTIONAL_COLUMNS = {"email"}


def load_students_from_csv(
	db: Session, csv_path: str | Path = "data/students.csv"
) -> int:
	path = Path(csv_path)
	if not path.exists():
		raise FileNotFoundError(f"Student CSV not found: {path}")

	try:
		df = pd.read_csv(path, dtype=str, keep_default_na=False)
	except pd.errors.EmptyDataError as error:
		raise ValueError("Student CSV is empty and has no header row") from error

	columns = set(df.columns)
	missing_columns = REQUIRED_COLUMNS - columns
	if missing_columns:
		raise ValueError(
			"Student CSV is missing required columns: "
			+ ", ".join(sorted(missing_columns))
		)

	loaded = 0
	for record in df.to_dict(orient="records"):
		student_id = record["student_id"].strip()
		name = record["name"].strip()
		if not student_id:
			continue
		if not name:
			raise ValueError(f"Student '{student_id}' is missing a name")

		student = db.scalar(
			select(Student).where(Student.student_id == student_id)
		)
		if student is None:
			student = Student(student_id=student_id, name=name)
			db.add(student)
		else:
			student.name = name

		if "email" in columns:
			student.email = record["email"].strip() or None
		loaded += 1

	db.commit()
	return loaded
