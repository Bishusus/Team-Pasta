import argparse

from sqlalchemy import select

from .database import SessionLocal, init_db
from .models import User


parser = argparse.ArgumentParser(description="Assign a timetable section to a student account")
parser.add_argument("student_id")
parser.add_argument("section")
args = parser.parse_args()

init_db()
with SessionLocal() as db:
	user = db.scalar(
		select(User).where(User.username == args.student_id, User.role == "STUDENT")
	)
	if user is None:
		raise RuntimeError(f"Student account not found: {args.student_id}")
	user.section_cohort = args.section.strip()
	db.commit()
print(f"Assigned section {args.section.strip()} to {args.student_id}")
