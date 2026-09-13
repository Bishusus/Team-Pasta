// Row-level scoping: narrows fetched data to what the signed-in role may see.
// Matching uses the names already stored in the database (timetable lecturer
// names, student full names, module titles) — no extra tables.

export function norm(value) {
  return (value || "").trim().toLowerCase();
}

export function tokens(value) {
  return new Set(
    (value || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2)
  );
}

/** Longest-common-subsequence ratio — mirrors Python's SequenceMatcher closely enough for scoping. */
function lcsRatio(a, b) {
  if (!a.length || !b.length) return 0;
  const prev = new Array(b.length + 1).fill(0);
  let current = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], current[j - 1]);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = current[j];
  }
  return (2 * prev[b.length]) / (a.length + b.length);
}

/**
 * Loose module-title match between a student's module and a timetable entry.
 * Uses the SAME scoring as the backend invigilation engine (backend/exam_engine.py):
 * token overlap shared/union, plus a sequence-similarity bonus, threshold 0.2.
 */
export function moduleMatches(studentModule, timetableModuleTitle) {
  const a = norm(studentModule);
  const b = norm(timetableModuleTitle);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const at = tokens(a);
  const bt = tokens(b);
  let shared = 0;
  at.forEach((token) => {
    if (bt.has(token)) shared += 1;
  });
  const overlap = shared / Math.max(at.size + bt.size - shared, 1);
  return overlap + lcsRatio(a, b) * 0.35 >= 0.2;
}

/**
 * Builds a scope descriptor for the signed-in session.
 * - teacher: matched against timetable lecturer names, with their modules.
 * - student: matched against student records by full name (their username
 *   should match their recorded name; a searchable picker handles aliases).
 */
export function buildScope(session, students, timetable) {
  const username = norm(session.username);

  if (session.role === "teacher") {
    const lecturerNames = new Set(
      timetable.map((entry) => norm(entry.lecturer)).filter(Boolean)
    );
    let matched = lecturerNames.has(username);
    // Fall back to last-token containment ("rabindra" matches "mr. rabindra adhikari").
    if (!matched) {
      for (const name of lecturerNames) {
        if (name.includes(username) || username.includes(name)) {
          matched = true;
          break;
        }
      }
    }
    if (!matched) return { kind: "teacher", matched: false, modules: [], lecturerName: session.username };

    const myEntries = timetable.filter(
      (entry) =>
        norm(entry.lecturer) === username ||
        norm(entry.lecturer).includes(username) ||
        username.includes(norm(entry.lecturer))
    );
    const myModules = [];
    myEntries.forEach((entry) => {
      const title = entry.module_title || entry.moduleTitle;
      if (title && !myModules.some((m) => norm(m) === norm(title))) myModules.push(title);
    });
    return {
      kind: "teacher",
      matched: true,
      lecturerName: myEntries[0]?.lecturer || session.username,
      modules: myModules,
      entries: myEntries,
    };
  }

  if (session.role === "student") {
    const record =
      students.find((s) => norm(s.name) === username) ||
      students.find((s) => norm(s.name).includes(username));
    const modules = record ? [record.module].filter(Boolean) : [];
    return {
      kind: "student",
      matched: Boolean(record),
      record: record || null,
      modules,
      programme: record?.programme || null,
      semester: record?.semester || null,
    };
  }

  // Admin sees everything.
  return { kind: "admin", matched: true, modules: [], record: null };
}

/** Students visible to this scope on the risk page. */
export function scopeStudents(scope, students) {
  if (scope.kind === "admin") return students;
  if (scope.kind === "teacher") {
    return students.filter((student) =>
      scope.modules.some((module) => moduleMatches(student.module, module))
    );
  }
  if (scope.kind === "student") {
    // Without a matched record there is nothing to show.
    return scope.record ? students.filter((s) => s.id === scope.record.id) : [];
  }
  return students;
}

/** Timetable entries visible to this scope. */
export function scopeTimetable(scope, entries) {
  if (scope.kind === "admin") return entries;
  if (scope.kind === "teacher") return scope.entries || [];
  if (scope.kind === "student") {
    // Their modules (by title match) and their group/programme cohort.
    return entries.filter(
      (entry) =>
        scope.modules.some((module) => moduleMatches(module, entry.module_title)) ||
        (scope.programme && norm(entry.group) && norm(scope.programme).includes(norm(entry.group)))
    );
  }
  return entries;
}

/** Generated exams visible to this scope. An exam lists its modules in module_name ("A + B"). */
export function scopeExams(scope, exams) {
  if (scope.kind === "admin") return exams;
  const myModules = scope.modules || [];
  return exams.filter((exam) => {
    const parts = (exam.module_name || "").split("+").map((part) => part.trim());
    return parts.some((part) => myModules.some((module) => moduleMatches(module, part)));
  });
}

/** Seat layouts visible to this scope: only seats for their own exams/modules. */
export function scopeLayout(scope, layout) {
  if (scope.kind === "admin") return layout;
  if (!layout) return layout;
  const myModules = scope.modules || [];
  const keepSeat = (seat) =>
    myModules.some((module) => moduleMatches(module, seat.module_name));
  const rooms = (layout.rooms || [])
    .map((room) => ({
      ...room,
      assignments: (room.assignments || []).filter(keepSeat),
    }))
    .filter((room) => room.assignments.length > 0);
  return { ...layout, rooms };
}
