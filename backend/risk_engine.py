
def calculate_risk(student):
    score = 0
    reasons = []

    exam1 = student.get("exam_1_score")
    exam2 = student.get("exam_2_score")
    final = student.get("final_exam_score")
    attendance = student.get("attendance_percentage")

    # Performance decline
    if exam1 is not None and final is not None and exam1 > 0:
        drop = ((exam1 - final) / exam1) * 100

        if drop > 20:
            score += 40
            reasons.append("Significant performance decline")
        elif drop > 10:
            score += 25
            reasons.append("Moderate performance decline")

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

    # Classification
    if score >= 60:
        level = "HIGH"
    elif score >= 30:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "risk_score": score,
        "risk_level": level,
        "reasons": reasons
    }


# Test
if __name__ == "__main__":
    student = {
        "student_id": "STU-001",
        "full_name": "Aarav Sharma",
        "module_name": "Database Systems",
        "attendance_percentage": 55,
        "exam_1_score": 78,
        "exam_2_score": 61,
        "final_exam_score": 43
    }

    print(calculate_risk(student))

