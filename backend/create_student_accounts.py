import argparse
from pathlib import Path

import pandas as pd
from sqlalchemy import select

from .auth import hash_password
from .database import SessionLocal, init_db
from .models import User


parser = argparse.ArgumentParser(description="Create student accounts from the students CSV")
parser.add_argument("--csv", default="data/students.csv")
parser.add_argument("--password", required=True, help="Initial password shared with the students")
args = parser.parse_args()

csv_path = Path(args.csv)
if not csv_path.exists():
	raise FileNotFoundError(f"Student CSV not found: {csv_path}")

students = pd.read_csv(csv_path, dtype=str).fillna("")
required_columns = {"student_id", "full_name"}
missing_columns = required_columns - set(students.columns)
if missing_columns:
	raise ValueError(f"Student CSV is missing columns: {', '.join(sorted(missing_columns))}")

init_db()
created = 0
skipped = 0

with SessionLocal() as db:
	for record in students.to_dict(orient="records"):
		student_id = record["student_id"].strip().upper()
		full_name = record["full_name"].strip()
		if not student_id:
			continue

		if db.scalar(select(User).where(User.username == student_id)) is not None:
			skipped += 1
			continue

		email = f"{student_id.lower()}@student.rte.local"
		db.add(
			User(
				username=student_id,
				email=email,
				password_hash=hash_password(args.password),
				role="STUDENT",
				identity=student_id,
			)
		)
		created += 1
		db.flush()

	db.commit()

print(f"Created: {created} student accounts")
print(f"Skipped existing: {skipped} student accounts")
print(f"Initial username format: student_id, for example {students.iloc[0]['student_id'] if not students.empty else 'STU-101'}")
