"""
Risk engine for Team-Pasta Academic Intelligence.

Pure scoring logic — no database, no ORM, no I/O. Takes a student's
data (as a dict OR as any object with matching attributes, e.g. a
SQLAlchemy Student instance) and returns a risk score, risk level,
and the list of reasons behind that score.

Kept intentionally dependency-free so it can be unit tested with
plain dicts and reused by the FastAPI layer with real Student rows.
"""


def _get_field(student, field):
    """
    Read `field` off `student` whether it's a dict (used in unit
    tests / mock data) or an object with attributes (e.g. a
    SQLAlchemy Student instance passed straight from the API layer).
    Missing fields resolve to None instead of raising, so a student
    record with incomplete data doesn't crash the engine.
    """
    if isinstance(student, dict):
        return student.get(field)
    return getattr(student, field, None)


def calculate_risk(student):
    """
    Calculate an academic risk score for a single student.

    `student` can be a dict or any object exposing the fields:
    student_id, exam_1_score, exam_2_score, final_exam_score,
    attendance_percentage.

    Three independent decline checks run and can all contribute to
    the score: exam_1 -> exam_2, exam_1 -> final_exam, and
    exam_2 -> final_exam. Each uses the same thresholds/points
    (>20% decline = +40, >10% = +25) but is reported with its own
    reason string.

    Returns:
        {
            "student_id": ...,
            "risk_score": int,
            "risk_level": "LOW" | "MEDIUM" | "HIGH",
            "reasons": [str, ...]
        }
    """
    score = 0
    reasons = []

    student_id = _get_field(student, "student_id")
    exam1 = _get_field(student, "exam_1_score")
    exam2 = _get_field(student, "exam_2_score")
    final = _get_field(student, "final_exam_score")
    attendance = _get_field(student, "attendance_percentage")

    # Performance decline: exam 1 -> final exam
    # Guard against exam1 being None, 0, or negative so this can
    # never divide by zero or produce a meaningless negative-base %.
    if exam1 is not None and final is not None and exam1 > 0:
        decline = ((exam1 - final) / exam1) * 100

        if decline > 20:
            score += 40
            reasons.append("Significant performance decline")
        elif decline > 10:
            score += 25
            reasons.append("Moderate performance decline")

    # Performance decline: exam 1 -> exam 2
    # Same thresholds/points as above, tracked separately so both
    # can fire independently (e.g. a student who dropped early AND
    # kept dropping shows up as higher risk than one who dropped once).
    if exam1 is not None and exam2 is not None and exam1 > 0:
        decline_2 = ((exam1 - exam2) / exam1) * 100

        if decline_2 > 20:
            score += 40
            reasons.append("Significant performance decline (exam 1 to exam 2)")
        elif decline_2 > 10:
            score += 25
            reasons.append("Moderate performance decline (exam 1 to exam 2)")

    # Performance decline: exam 2 -> final exam
    # Same thresholds/points as above, tracked independently so all
    # three decline checks can fire and stack together.
    if exam2 is not None and final is not None and exam2 > 0:
        decline_3 = ((exam2 - final) / exam2) * 100

        if decline_3 > 20:
            score += 40
            reasons.append("Significant performance decline (exam 2 to final)")
        elif decline_3 > 10:
            score += 25
            reasons.append("Moderate performance decline (exam 2 to final)")

    # Attendance
    if attendance is not None:
        if attendance < 60:
            score += 30
            reasons.append("Low attendance")
        elif attendance < 75:
            score += 15
            reasons.append("Below-average attendance")

    # Final exam
    if final is not None:
        if final < 40:
            score += 40
            reasons.append("Final exam below pass mark")

    # Cap the score at 100 since it's meant to read as a 0-100 scale,
    # even though the individual point values can sum past that.
    score = min(score, 100)

    # Classification
    if score >= 60:
        level = "HIGH"
    elif score >= 30:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "student_id": student_id,
        "risk_score": score,
        "risk_level": level,
        "reasons": reasons,
    }


# Manual smoke test — run this file directly to sanity-check the logic.
if __name__ == "__main__":
    # Works with a plain dict (e.g. mock data, unit tests)
    student_dict = {
        "student_id": "STU-001",
        "full_name": "Aarav Sharma",
        "module_name": "Database Systems",
        "attendance_percentage": 55,
        "exam_1_score": 78,
        "exam_2_score": 61,
        "final_exam_score": 43,
    }
    print(calculate_risk(student_dict))

    # Also works with an attribute-based object, e.g. a SQLAlchemy
    # Student instance passed in from the API layer.
    class FakeStudentRow:
        student_id = "STU-002"
        exam_1_score = 0  # edge case: should not raise ZeroDivisionError
        exam_2_score = 50
        final_exam_score = 35
        attendance_percentage = 68

    print(calculate_risk(FakeStudentRow()))

    # Edge case: sharp exam_1 -> exam_2 drop should now contribute
    # to the score via the new check, independent of the final exam.
    student_dip_then_recover = {
        "student_id": "STU-003",
        "exam_1_score": 80,
        "exam_2_score": 50,   # 37.5% decline from exam_1 -> exam_2
        "final_exam_score": 78,  # barely any decline from exam_1 -> final
        "attendance_percentage": 90,
    }
    print(calculate_risk(student_dip_then_recover))

    # Edge case: steep exam_2 -> final drop should now contribute
    # to the score via the new check, independent of the other two.
    student_late_collapse = {
        "student_id": "STU-004",
        "exam_1_score": 70,
        "exam_2_score": 72,        # small exam_1 -> exam_2 change, no rule fires
        "final_exam_score": 50,    # ~30.6% decline from exam_2 -> final
        "attendance_percentage": 85,
    }
    print(calculate_risk(student_late_collapse))