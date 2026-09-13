import os

from sqlalchemy import select

from .auth import hash_password
from .database import SessionLocal, init_db
from .models import User


init_db()
username = os.getenv("ADMIN_USERNAME", "admin")
email = os.getenv("ADMIN_EMAIL", "admin@example.com")
password = os.getenv("ADMIN_PASSWORD")
if not password:
	raise RuntimeError("Set ADMIN_PASSWORD before creating the admin account")

with SessionLocal() as db:
	if db.scalar(select(User).where(User.username == username)) is not None:
		raise RuntimeError(f"Admin username already exists: {username}")
	db.add(
		User(
			username=username,
			email=email,
			password_hash=hash_password(password),
			role="ADMIN",
		)
	)
	db.commit()
print(f"Admin account created: {username}")
