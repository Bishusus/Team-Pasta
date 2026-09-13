import re
from datetime import datetime

VALID_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]


def to_24h(value: str) -> str:
    """Parse a single time string into HH:MM 24-hour format."""
    text = str(value).strip()
    for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M", "%I %p", "%I%p"):
        try:
            return datetime.strptime(text, fmt).strftime("%H:%M")
        except ValueError:
            continue
    raise ValueError(f"Could not parse time value: '{value}'")


def parse_time_range(raw_range: str) -> tuple[str, str]:
    """Convert time ranges like '07:00 AM - 08:30 AM' into ('07:00', '08:30')."""
    text = str(raw_range).strip()
    if not text:
        raise ValueError("Time range cannot be empty")

    text = re.sub(r"\s*(–|—|to)\s*", " - ", text, flags=re.IGNORECASE)
    parts = [part.strip() for part in text.split(" - ")]
    if len(parts) != 2:
        parts = [part.strip() for part in text.split("-")]
    if len(parts) != 2:
        raise ValueError(f"Could not parse time slot: '{raw_range}'")

    return to_24h(parts[0]), to_24h(parts[1])


def normalize_day(raw_day: str) -> str:
    """Normalize a day string such as 'Monday' or 'mon' into SUN..SAT."""
    if raw_day is None:
        raise ValueError("Day cannot be empty")

    day = str(raw_day).strip().upper()
    if day[:3] in VALID_DAYS:
        return day[:3]

    raise ValueError(f"'{raw_day}' is not a valid day.")
