from datetime import datetime, timedelta, timezone
import os

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import User


SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "development-only-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
	return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
	return password_hash.verify(password, hashed_password)


def create_access_token(user: User) -> str:
	expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
	return jwt.encode(
		{"sub": str(user.id), "role": user.role, "exp": expires_at},
		SECRET_KEY,
		algorithm=ALGORITHM,
	)


def authenticate_user(username: str, password: str, db: Session) -> User | None:
	user = db.scalar(select(User).where(User.username == username))
	if user is None or not user.is_active or not verify_password(password, user.password_hash):
		return None
	return user


def get_current_user(
	token: str = Depends(oauth2_scheme),
	db: Session = Depends(get_db),
) -> User:
	credentials_error = HTTPException(
		status_code=status.HTTP_401_UNAUTHORIZED,
		detail="Invalid or expired authentication token",
		headers={"WWW-Authenticate": "Bearer"},
	)
	try:
		payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
		user_id = payload.get("sub")
		if user_id is None:
			raise credentials_error
	except (jwt.PyJWTError, ValueError) as error:
		raise credentials_error from error

	user = db.get(User, int(user_id))
	if user is None or not user.is_active:
		raise credentials_error
	return user


def require_admin(user: User = Depends(get_current_user)) -> User:
	return require_roles("ADMIN")(user)


def require_roles(*roles: str):
	def dependency(user: User = Depends(get_current_user)) -> User:
		if user.role not in roles:
			raise HTTPException(status_code=403, detail="You do not have permission for this action")
		return user
	return dependency


def require_identity(user: User, identity: str | None) -> None:
	if not user.identity or user.identity.strip().casefold() != (identity or "").strip().casefold():
		raise HTTPException(status_code=403, detail="You do not have access to this record")


