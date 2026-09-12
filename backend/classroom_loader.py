from pathlib import Path

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Classroom


REQUIRED_COLUMNS = [
	"block_name",
	"room_number",
	"capacity",
]


def load_classrooms_from_csv(
	db: Session, csv_path: str | Path = "data/classrooms.csv"
) -> int:
	path = Path(csv_path)
	if not path.exists():
		raise FileNotFoundError(f"Classrooms CSV not found: {path}")

	try:
		df = pd.read_csv(path, encoding="utf-8")
	except pd.errors.EmptyDataError as error:
		raise ValueError("Classrooms CSV is empty and has no header row") from error
	except Exception as error:
		raise ValueError(f"Failed to parse CSV: {error}") from error

	missing_columns = [column for column in REQUIRED_COLUMNS if column not in df.columns]
	if missing_columns:
		raise ValueError(
			"Classrooms CSV is missing required columns: "
			+ ", ".join(missing_columns)
		)
	if df.empty:
		raise ValueError("Classrooms CSV contains no classroom records")

	df["block_name"] = df["block_name"].astype("string").str.strip()
	df["room_number"] = df["room_number"].astype("string").str.strip()
	df["capacity"] = pd.to_numeric(df["capacity"], errors="coerce")
	df = df.dropna(subset=REQUIRED_COLUMNS)

	loaded = 0
	for record in df.to_dict(orient="records"):
		values = {
			"block_name": record["block_name"],
			"room_number": record["room_number"],
			"capacity": int(record["capacity"]),
		}
		entry = db.scalar(
			select(Classroom).where(
				Classroom.block_name == values["block_name"],
				Classroom.room_number == values["room_number"],
			)
		)
		if entry is None:
			db.add(Classroom(**values))
		else:
			entry.capacity = values["capacity"]
		loaded += 1

	db.commit()
	return loaded
