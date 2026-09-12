import { API_BASE_URL } from "../config";

export class ApiError extends Error {
  constructor(message, { status, path, cause } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
    this.cause = cause;
  }
}

function normalizeStudent(student) {
  return {
    ...student,
    id: student.id ?? student.student_id,
    name: student.name ?? student.full_name,
    semester: student.semester,
    module: student.module ?? student.module_name,
    examDate: student.examDate ?? student.exam_date,
    exam1Score: student.exam1Score ?? student.exam_1_score,
    exam2Score: student.exam2Score ?? student.exam_2_score,
    attendance: student.attendance ?? student.attendance_percentage,
    examScore: student.examScore ?? student.final_exam_score,
    riskScore: student.riskScore ?? student.risk_score,
    riskLevel: student.riskLevel ?? student.risk_level,
    riskReasons: student.riskReasons ?? student.reasons ?? [],
  };
}

async function getJson(path) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`);
  } catch (cause) {
    throw new ApiError("Unable to reach the FastAPI server.", { path, cause });
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new ApiError(`Request failed (${response.status}): ${detail}`, {
      status: response.status,
      path,
    });
  }

  try {
    return await response.json();
  } catch (cause) {
    throw new ApiError("FastAPI returned an invalid JSON response.", {
      path,
      cause,
    });
  }
}

/**
 * Fetches all student records from GET /students.
 */
export async function fetchAllStudents() {
  const data = await getJson("/students");
  return Array.isArray(data) ? data.map(normalizeStudent) : [];
}

/** Fetches one student and its backend-calculated risk details. */
export async function fetchStudentById(studentId) {
  if (!studentId)
    throw new ApiError("A student_id is required.", {
      path: "/students/{student_id}",
    });
  const encodedId = encodeURIComponent(studentId);
  const [studentData, riskData] = await Promise.all([
    getJson(`/students/${encodedId}`),
    getJson(`/risk/${encodedId}`),
  ]);
  return studentData && typeof studentData === "object"
    ? normalizeStudent({ ...studentData, ...riskData })
    : null;
}

/** Fetches all backend-calculated risk results from GET /risk. */
export async function fetchRiskResults() {
  const data = await getJson("/risk");
  return Array.isArray(data) ? data.map(normalizeStudent) : [];
}

/** Fetches backend-calculated risk counts from GET /risk-summary. */
export async function fetchRiskSummary() {
  const data = await getJson("/risk-summary");
  return data && typeof data === "object" ? data : null;
}

/** Fetches database connectivity status from GET /health. */
export async function fetchHealth() {
  return getJson("/health");
}

// Compatibility alias for existing dashboard consumers of the risk table.
export const fetchStudents = fetchRiskResults;
