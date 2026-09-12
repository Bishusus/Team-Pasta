from datetime import datetime
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


def _time_slot_key(time_slot: str) -> tuple[int, int]:
	parts = time_slot.upper().split(" - ", 1)
	if len(parts) != 2:
		raise ValueError(f"Invalid timetable time slot: {time_slot}")
	minutes = []
	for part in parts:
		parsed = None
		for pattern in ("%H:%M", "%I:%M %p"):
			try:
				parsed = datetime.strptime(part.strip(), pattern)
				break
			except ValueError:
				continue
		if parsed is None:
			raise ValueError(f"Invalid timetable time slot: {time_slot}")
		minutes.append(parsed.hour * 60 + parsed.minute)
	return tuple(minutes)


def _entry_key(values: dict) -> tuple[str, ...]:
	return (
		values["day"],
		values["group_name"],
		values["section_cohort"],
		values["class_type"],
		values["module_code"],
		values["module_title"],
		values["lecturer"],
		values["room"],
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

	existing_entries = db.scalars(select(TimetableEntry)).all()
	entries_by_key: dict[tuple[str, ...], list[TimetableEntry]] = {}
	for existing_entry in existing_entries:
		key = _entry_key({
			"day": existing_entry.day,
			"group_name": existing_entry.group_name,
			"section_cohort": existing_entry.section_cohort,
			"class_type": existing_entry.class_type,
			"module_code": existing_entry.module_code,
			"module_title": existing_entry.module_title,
			"lecturer": existing_entry.lecturer,
			"room": existing_entry.room,
		})
		entries_by_key.setdefault(key, []).append(existing_entry)

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
		entries = entries_by_key.setdefault(_entry_key(values), [])
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
			entry = TimetableEntry(**values)
			db.add(entry)
			entries.append(entry)
		else:
			for duplicate in matching_entries:
				if duplicate is not entry:
					db.delete(duplicate)
			entries[:] = [entry]
			entry.time_slot = values["time_slot"]
			entry.duration_hours = values["duration_hours"]
		loaded += 1

	db.commit()
	return loaded