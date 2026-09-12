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

const pendingGets = new Map();

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

async function getJsonRequest(path) {
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

function getJson(path) {
  const pending = pendingGets.get(path);
  if (pending) return pending;

  const request = getJsonRequest(path).finally(() => {
    pendingGets.delete(path);
  });
  pendingGets.set(path, request);
  return request;
}

async function sendJson(path, options, errorMessage) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (cause) {
    throw new ApiError("Unable to reach the FastAPI server.", { path, cause });
  }
  if (!response.ok) {
    let detail = response.statusText;
    try { detail = (await response.json()).detail || detail; } catch { /* Keep the status message. */ }
    throw new ApiError(`${errorMessage} (${response.status}): ${detail}`, { status: response.status, path });
  }
  return response.json();
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

/** Fetches timetable entries from GET /timetable. */
export async function fetchTimetable(filters = {}) {
  const params = new URLSearchParams();
  if (filters.day) params.set("day", filters.day);
  if (filters.moduleCode) params.set("module_code", filters.moduleCode);
  if (filters.room) params.set("room", filters.room);
  const query = params.toString();
  const data = await getJson(`/timetable${query ? `?${query}` : ""}`);
  return Array.isArray(data) ? data : [];
}

/** Fetches classroom records from GET /classrooms. */
export async function fetchClassrooms(filters = {}) {
  const params = new URLSearchParams();
  if (filters.blockName) params.set("block_name", filters.blockName);
  if (filters.roomNumber) params.set("room_number", filters.roomNumber);
  const query = params.toString();
  const data = await getJson(`/classrooms${query ? `?${query}` : ""}`);
  return Array.isArray(data) ? data : [];
}

/** Fetches classroom record by ID from GET /classrooms/{classroom_id}. */
export async function fetchClassroomById(classroomId) {
  if (!classroomId)
    throw new ApiError("A classroomId is required.", {
      path: "/classrooms/{classroom_id}",
    });
  return getJson(`/classrooms/${encodeURIComponent(classroomId)}`);
}

export async function fetchBookingAvailability({ day, startTime, endTime }) {
  const params = new URLSearchParams({ day, start_time: startTime, end_time: endTime });
  const data = await getJson(`/bookings/availability?${params.toString()}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchBookings(day) {
  const data = await getJson(`/bookings${day ? `?day=${encodeURIComponent(day)}` : ""}`);
  return Array.isArray(data) ? data : [];
}

export async function createBooking(booking) {
  return sendJson("/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(booking) }, "Booking failed");
}

/** Fetches the generated exam schedule. */
export async function fetchExamSchedule() {
  const data = await getJson("/exam-schedule");
  return Array.isArray(data) ? data : [];
}

/** Rebuilds exams and seat assignments from current database records. */
export async function generateExamSchedule() {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/exam-schedule/generate`, { method: "POST" });
  } catch (cause) {
    throw new ApiError("Unable to reach the FastAPI server.", { path: "/exam-schedule/generate", cause });
  }
  if (!response.ok) {
    throw new ApiError(`Request failed (${response.status}): ${response.statusText}`, {
      status: response.status,
      path: "/exam-schedule/generate",
    });
  }
  return response.json();
}

/** Fetches the room-by-room layout for one generated exam. */
export async function fetchExamLayout(examId) {
  if (!examId) throw new ApiError("An examId is required.", { path: "/exam-schedule/{exam_id}/layout" });
  return getJson(`/exam-schedule/${encodeURIComponent(examId)}/layout`);
}

/** Triggers backend seating plan generation with invigilator assignments. */
export async function generateSeatingPlan() {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/seating/generate`, { method: "POST" });
  } catch (cause) {
    throw new ApiError("Unable to reach the FastAPI server.", { path: "/seating/generate", cause });
  }
  if (!response.ok) {
    throw new ApiError(`Request failed (${response.status}): ${response.statusText}`, {
      status: response.status,
      path: "/seating/generate",
    });
  }
  return response.json();
}

/** Fetches generated seating plans. */
export async function fetchSeatingPlans() {
  const data = await getJson("/seating");
  return Array.isArray(data) ? data : [];
}

/** Fetches detailed room grid layout and seat assignments for a specific exam. */
export async function fetchSeatingPlanByExam(examId) {
  if (!examId) throw new ApiError("An examId is required.", { path: "/seating/exam/{exam_id}" });
  return getJson(`/seating/exam/${encodeURIComponent(examId)}`);
}

// Compatibility alias for existing dashboard consumers of the risk table.
export const fetchStudents = fetchRiskResults;


