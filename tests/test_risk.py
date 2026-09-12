"""
Tests for backend/risk_engine.py.

These tests exercise calculate_risk() directly with plain dicts.
No database, no FastAPI, no network — risk_engine.py has none of
those dependencies, so the tests don't need them either.
"""

from backend.risk_engine import calculate_risk


def make_student(**overrides):
    """A baseline 'healthy' student, so each test only needs to
    override the one or two fields relevant to what it's checking."""
    student = {
        "student_id": "STU-TEST",
        "exam_1_score": 70,
        "exam_2_score": 70,
        "final_exam_score": 70,
        "attendance_percentage": 90,
    }
    student.update(overrides)
    return student


def test_low_risk_when_everything_is_healthy():
    """Good attendance, no decline in any of the three transitions,
    final exam passing -> LOW risk, zero score, no reasons."""
    student = make_student(
        exam_1_score=70,
        exam_2_score=68,
        final_exam_score=65,
        attendance_percentage=80,
    )
    result = calculate_risk(student)

    assert result["risk_score"] == 0
    assert result["risk_level"] == "LOW"
    assert result["reasons"] == []


def test_medium_risk_from_low_attendance_alone():
    """
    NOTE: the task description asked for 'attendance between 60 and
    below 75, with no other risk factor' to produce MEDIUM. Under
    the CURRENT rules that only adds +15 ('Below-average attendance'),
    which is a LOW score (0-29), not MEDIUM. Only attendance < 60
    (+30, 'Low attendance') reaches the MEDIUM boundary on its own.
    This test verifies the actual current behaviour for both cases.
    """
    # Attendance < 60 alone lands exactly on the MEDIUM boundary (30).
    low_attendance_student = make_student(
        exam_1_score=70,
        exam_2_score=70,
        final_exam_score=70,
        attendance_percentage=55,
    )
    result = calculate_risk(low_attendance_student)

    assert result["risk_score"] == 30
    assert result["risk_level"] == "MEDIUM"
    assert result["reasons"] == ["Low attendance"]

    # Attendance in the 60-74 "below-average" band alone is only +15,
    # which is LOW under the current thresholds, not MEDIUM.
    below_average_attendance_student = make_student(
        exam_1_score=70,
        exam_2_score=70,
        final_exam_score=70,
        attendance_percentage=68,
    )
    result_below_average = calculate_risk(below_average_attendance_student)

    assert result_below_average["risk_score"] == 15
    assert result_below_average["risk_level"] == "LOW"
    assert result_below_average["reasons"] == ["Below-average attendance"]


def test_high_risk_from_low_attendance_and_major_decline():
    """
    Attendance < 60 plus a >20% exam_1 -> final decline.

    Note: because final (70) is far enough below both exam_1 (100)
    and exam_2 (95), the exam_2 -> final decline check (26.3%) also
    fires. This isn't avoidable while keeping exam_1 -> final decline
    above 20% and exam_2 close to exam_1 (the two independent checks
    are designed to stack), so this test asserts the full, accurate
    result rather than an artificially isolated one.
    """
    student = make_student(
        exam_1_score=100,
        exam_2_score=95,
        final_exam_score=70,
        attendance_percentage=50,
    )
    result = calculate_risk(student)

    assert result["risk_score"] == 100  # 40 + 40 + 30 = 110, capped at 100
    assert result["risk_level"] == "HIGH"
    assert result["reasons"] == [
        "Significant performance decline",
        "Significant performance decline (exam 2 to final)",
        "Low attendance",
    ]


def test_high_risk_from_failing_final_exam():
    """
    final_exam_score < 40 by itself only contributes +40, which is
    MEDIUM (30-59), not HIGH — reaching HIGH needs it to stack with
    another factor. Here it stacks with the performance-decline
    checks (a failing final combined with healthy earlier exams
    naturally triggers both decline checks), which is a realistic
    profile for a student who collapsed at the end.
    """
    student = make_student(
        exam_1_score=70,
        exam_2_score=68,
        final_exam_score=35,
        attendance_percentage=90,
    )
    result = calculate_risk(student)

    assert result["risk_score"] == 100  # 40 + 40 + 40 = 120, capped at 100
    assert result["risk_level"] == "HIGH"
    assert result["reasons"] == [
        "Significant performance decline",
        "Significant performance decline (exam 2 to final)",
        "Final exam below pass mark",
    ]


def test_final_exam_below_pass_mark_in_isolation_is_medium_not_high():
    """
    Companion test to the one above: this confirms that
    final_exam_score < 40 truly only contributes +40 when nothing
    else about the student's record has declined, landing in the
    MEDIUM band rather than HIGH.
    """
    student = make_student(
        exam_1_score=35,
        exam_2_score=35,
        final_exam_score=35,
        attendance_percentage=90,
    )
    result = calculate_risk(student)

    assert result["risk_score"] == 40
    assert result["risk_level"] == "MEDIUM"
    assert result["reasons"] == ["Final exam below pass mark"]


def test_moderate_performance_decline():
    """exam_1 -> final decline > 10% but not > 20% -> +25, and
    nothing else fires (exam_2 is chosen to keep the other two
    decline checks under their own 10% threshold)."""
    student = make_student(
        exam_1_score=100,
        exam_2_score=92,
        final_exam_score=85,  # 15% decline from exam_1
        attendance_percentage=80,
    )
    result = calculate_risk(student)

    assert result["risk_score"] == 25
    assert result["risk_level"] == "LOW"
    assert result["reasons"] == ["Moderate performance decline"]


def test_exam_1_zero_does_not_raise_division_by_zero():
    """exam_1_score == 0 must not crash either of the two decline
    checks that use it as the denominator (exam_1 -> final and
    exam_1 -> exam_2)."""
    student = make_student(
        exam_1_score=0,
        exam_2_score=50,
        final_exam_score=30,
        attendance_percentage=70,
    )

    result = calculate_risk(student)  # should not raise

    assert isinstance(result["risk_score"], int)
    # exam_1 -> final and exam_1 -> exam_2 are both skipped since
    # exam_1_score is 0; exam_2 -> final still runs normally.
    assert "Significant performance decline" not in result["reasons"]
    assert "Significant performance decline (exam 1 to exam 2)" not in result["reasons"]


def test_result_structure_has_required_keys():
    """calculate_risk() must always return these four keys, with
    the expected types, regardless of input."""
    student = make_student()
    result = calculate_risk(student)

    assert set(result.keys()) == {"student_id", "risk_score", "risk_level", "reasons"}
    assert isinstance(result["student_id"], str)
    assert isinstance(result["risk_score"], int)
    assert result["risk_level"] in {"LOW", "MEDIUM", "HIGH"}
    assert isinstance(result["reasons"], list)
