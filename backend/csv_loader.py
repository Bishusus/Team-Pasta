from pathlib import Path

import pandas as pd
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .models import Student


REQUIRED_COLUMNS = [
    "student_id", "full_name", "programme", "semester", "module_name",
    "exam_date", "attendance_percentage", "exam_1_score", "exam_2_score",
    "final_exam_score",
]
NUMERIC_COLUMNS = [
    "attendance_percentage", "exam_1_score", "exam_2_score", "final_exam_score",
]


def validate_csv_file(file_path: str | Path) -> tuple[bool, str]:
    path = Path(file_path)
    if not path.exists():
        return False, f"File not found: {path}"
    if path.suffix.lower() != ".csv":
        return False, "File is not a CSV."
    try:
        df = pd.read_csv(path, encoding="utf-8")
    except UnicodeDecodeError:
        return False, "File is not UTF-8 encoded."
    except Exception as error:
        return False, f"Failed to read CSV: {error}"

    missing_columns = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    if missing_columns:
        return False, "Missing required columns: " + ", ".join(missing_columns)
    if df.empty:
        return False, "CSV file contains no student records."
    return True, ""


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy().replace(r"^\s*$", pd.NA, regex=True)
    string_columns = ["student_id", "full_name", "programme", "semester", "module_name"]
    for column in string_columns:
        df[column] = df[column].astype("string").str.strip()
    for column in NUMERIC_COLUMNS:
        df[column] = pd.to_numeric(df[column], errors="coerce").clip(0, 100)
    df["exam_date"] = pd.to_datetime(df["exam_date"], errors="coerce")
    return df.dropna(subset=REQUIRED_COLUMNS)


def transform_data(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["student_id"] = df["student_id"].str.upper()
    df["full_name"] = df["full_name"].str.title()
    return df


def load_students(file_path: str | Path) -> tuple[list[dict] | None, str | None]:
    is_valid, message = validate_csv_file(file_path)
    if not is_valid:
        return None, message
    try:
        df = pd.read_csv(file_path, encoding="utf-8")
    except Exception as error:
        return None, f"Failed to parse CSV: {error}"

    df = transform_data(clean_data(df))
    if df.empty:
        return None, "No valid student records found after cleaning."
    students = df.to_dict(orient="records")
    for student in students:
        student["exam_date"] = student["exam_date"].strftime("%Y-%m-%d")
    return students, None


def load_students_from_csv(
    db: Session, csv_path: str | Path = "data/students.csv"
) -> int:
    students, error = load_students(csv_path)
    if error:
        raise ValueError(error)

    existing_students = db.scalars(select(Student)).all()
    students_by_id = {student.student_id: student for student in existing_students}
    student_ids = set()
    loaded = 0
    for record in students:
        student_ids.add(record["student_id"])
        student = students_by_id.get(record["student_id"])
        values = {**record, "exam_date": pd.to_datetime(record["exam_date"]).date()}
        if student is None:
            student = Student(**values)
            db.add(student)
            students_by_id[student.student_id] = student
        else:
            for column, value in values.items():
                setattr(student, column, value)
        loaded += 1

    db.execute(delete(Student).where(Student.student_id.not_in(student_ids)))
    db.commit()
    return loaded
