from pathlib import Path

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import TimetableEntry


REQUIRED_COLUMNS = [
	"Day",
	"Time Slot",
	"Group",
	"Section / Cohort",
	"Class Type",
	"Module Code",
	"Module Title",
	"Lecturer / Teacher",
	"Room",
	"Duration (Hrs)",
]


def _time_slot_key(time_slot: str) -> str:
	return " ".join(
		part.removesuffix(" AM").removesuffix(" PM")
		for part in time_slot.upper().split(" - ")
	)


def load_timetable_from_csv(
	db: Session, csv_path: str | Path = "data/timetable.csv"
) -> int:
	path = Path(csv_path)
	if not path.exists():
		raise FileNotFoundError(f"Timetable CSV not found: {path}")

	try:
		df = pd.read_csv(path, encoding="utf-8")
	except pd.errors.EmptyDataError as error:
		raise ValueError("Timetable CSV is empty and has no header row") from error

	missing_columns = [column for column in REQUIRED_COLUMNS if column not in df.columns]
	if missing_columns:
		raise ValueError(
			"Timetable CSV is missing required columns: "
			+ ", ".join(missing_columns)
		)
	if df.empty:
		raise ValueError("Timetable CSV contains no schedule records")

	text_columns = [column for column in REQUIRED_COLUMNS if column != "Duration (Hrs)"]
	for column in text_columns:
		df[column] = df[column].astype("string").str.strip()
	df["Duration (Hrs)"] = pd.to_numeric(df["Duration (Hrs)"], errors="coerce")
	df = df.dropna(subset=REQUIRED_COLUMNS)

	loaded = 0
	for record in df.to_dict(orient="records"):
		values = {
			"day": record["Day"],
			"time_slot": record["Time Slot"],
			"group_name": record["Group"],
			"section_cohort": record["Section / Cohort"],
			"class_type": record["Class Type"],
			"module_code": record["Module Code"],
			"module_title": record["Module Title"],
			"lecturer": record["Lecturer / Teacher"],
			"room": record["Room"],
			"duration_hours": float(record["Duration (Hrs)"]),
		}
		entries = db.scalars(
			select(TimetableEntry).where(
				TimetableEntry.day == values["day"],
				TimetableEntry.group_name == values["group_name"],
				TimetableEntry.section_cohort == values["section_cohort"],
				TimetableEntry.class_type == values["class_type"],
				TimetableEntry.module_code == values["module_code"],
				TimetableEntry.module_title == values["module_title"],
				TimetableEntry.lecturer == values["lecturer"],
				TimetableEntry.room == values["room"],
			)
		).all()
		matching_entries = [
			entry
			for entry in entries
			if _time_slot_key(entry.time_slot) == _time_slot_key(values["time_slot"])
		]
		entry = next(
			(entry for entry in matching_entries if entry.time_slot == values["time_slot"]),
			matching_entries[0] if matching_entries else None,
		)
		if entry is None:
			db.add(TimetableEntry(**values))
		else:
			for duplicate in matching_entries:
				if duplicate is not entry:
					db.delete(duplicate)
			entry.time_slot = values["time_slot"]
			entry.duration_hours = values["duration_hours"]
		loaded += 1

	db.commit()
	return loaded