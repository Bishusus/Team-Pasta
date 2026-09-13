import argparse

from sqlalchemy import select

from .auth import hash_password
from .database import SessionLocal, init_db
from .models import User


parser = argparse.ArgumentParser(description="Create a role-based application user")
parser.add_argument("--username", required=True)
parser.add_argument("--email", required=True)
parser.add_argument("--password", required=True)
parser.add_argument("--role", required=True, choices=("ADMIN", "TEACHER", "STUDENT"))
parser.add_argument("--identity", help="Exact lecturer name for teachers or student_id for students")
parser.add_argument("--section", help="Student section/cohort, for example AI3")
args = parser.parse_args()

if args.role == "STUDENT" and not args.identity:
	parser.error("--identity is required for STUDENT accounts")
if args.role == "TEACHER" and not args.identity:
	parser.error("--identity is required for TEACHER accounts")

init_db()
with SessionLocal() as db:
	if db.scalar(select(User).where(User.username == args.username)) is not None:
		raise RuntimeError(f"Username already exists: {args.username}")
	db.add(
		User(
			username=args.username,
			email=args.email,
			password_hash=hash_password(args.password),
			role=args.role,
			identity=args.identity,
			section_cohort=args.section,
		)
	)
	db.commit()
print(f"{args.role} account created: {args.username}")
