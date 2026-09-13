import React, { useEffect, useMemo, useState } from "react";
import { colors, fonts } from "../theme";
import Toast from "../components/Toast";
import { fetchAdmitCard, fetchExamSchedule } from "../services/api";

const panelStyle = { background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 22 };

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date(value));
}

function timeRange(start, end) {
  const fmt = (t) => {
    const [h, m] = (t || "00:00").split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m || 0).padStart(2, "0")} ${suffix}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

/** The printable, official-looking admit card document. */
function AdmitCardDocument({ card }) {
  const { student, exam, room, seat } = card;
  return (
    <div
      className="admit-card-document"
      style={{
        background: "#FFFFFF",
        border: `2px solid ${colors.ink}`,
        borderRadius: 12,
        maxWidth: 640,
        margin: "0 auto",
        overflow: "hidden",
        boxShadow: "0 18px 44px -18px rgba(15, 23, 42, 0.28)",
      }}
    >
      {/* Institution header */}
      <div style={{ background: colors.ink, color: "#FFFFFF", padding: "18px 26px", display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          I
        </div>
        <div>
          <div style={{ fontFamily: fonts.display, fontSize: 19, fontWeight: 700, lineHeight: 1.15 }}>
            Islington College
          </div>
          <div style={{ fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase", color: "#B9C2D8", fontWeight: 700, marginTop: 2 }}>
            Academic Intelligence · Examination Cell
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 11, color: "#B9C2D8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
          Admit Card
        </div>
      </div>

      {/* Identity block: the four things an invigilator checks first */}
      <div style={{ padding: "22px 26px 8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.1, fontWeight: 700 }}>
              Candidate
            </div>
            <div style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, fontWeight: 700, marginTop: 3 }}>
              {student.full_name}
            </div>
            <div style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.textBody, marginTop: 3 }}>
              {student.student_id}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.1, fontWeight: 700 }}>
              Seat
            </div>
            <div style={{ fontFamily: fonts.mono, fontSize: 26, color: colors.ink, fontWeight: 700, marginTop: 3 }}>
              {seat.seat_number}
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              Row {seat.row} · Column {seat.column}
            </div>
          </div>
        </div>
      </div>

      {/* Detail grid */}
      <div style={{ padding: "14px 26px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16 }}>
        {[
          { label: "Examination", value: exam.module_name, wide: true },
          { label: "Date", value: formatDate(exam.exam_date) },
          { label: "Time", value: timeRange(exam.start_time, exam.end_time), mono: true },
          { label: "Room / Hall", value: room.name, mono: true },
          { label: "Duration", value: `${exam.duration_minutes} minutes`, mono: true },
          { label: "Module", value: seat.module_name },
          { label: "Invigilator", value: exam.invigilator || "Assigned officer" },
          { label: "Programme", value: [student.programme, student.semester].filter(Boolean).join(" · ") || "—" },
        ].map((item) => (
          <div key={item.label} style={item.wide ? { gridColumn: "1 / -1" } : undefined}>
            <div style={{ fontSize: 10.5, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>
              {item.label}
            </div>
            <div
              style={{
                fontSize: item.wide ? 15 : 13.5,
                color: colors.textBody,
                fontWeight: 600,
                fontFamily: item.mono ? fonts.mono : fonts.sans,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Footer strip */}
      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          padding: "12px 26px",
          background: colors.page,
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          fontSize: 11.5,
          color: colors.textMuted,
        }}
      >
        <span>Carry this card and your student ID to the examination hall.</span>
        <span style={{ fontFamily: fonts.mono }}>Arrive 15 minutes early</span>
      </div>
    </div>
  );
}

export default function AdmitCardPage({ session, scope, initialRequest }) {
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [studentId, setStudentId] = useState("");
  const [examId, setExamId] = useState("");
  const [card, setCard] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchExamSchedule()
      .then((exams) => { if (!cancelled) setSchedule(Array.isArray(exams) ? exams : []); })
      .catch(() => { if (!cancelled) setSchedule([]); })
      .finally(() => { if (!cancelled) setScheduleLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Students only see their own exams: default the picker to their scope.
  useEffect(() => {
    if (session?.role === "student" && scope?.kind === "student" && scope.record) {
      setStudentId(scope.record.id);
    }
  }, [session, scope]);

  // Deep-link from the seating page: pre-fill both pickers and fetch once
  // the exam list has landed.
  useEffect(() => {
    if (initialRequest) {
      setStudentId(initialRequest.studentId || "");
      setExamId(initialRequest.examId ? String(initialRequest.examId) : "");
    }
  }, [initialRequest]);

  const loadCard = async (event) => {
    event?.preventDefault();
    if (!studentId.trim() || !examId) return;
    setCardLoading(true);
    setCardError(null);
    setCard(null);
    try {
      const data = await fetchAdmitCard(examId, studentId.trim());
      setCard(data);
      setToast("Admit card loaded from the current seating plan.");
    } catch (reason) {
      const status = reason?.status;
      if (status === 409) {
        setCardError({ title: "Not registered for this exam", detail: "This candidate is not sitting the selected examination. Check the student ID and exam selection." });
      } else if (status === 404 && /not been assigned/i.test(reason.message)) {
        setCardError({ title: "Seat not yet assigned", detail: "A seat has not yet been assigned for this examination. Admit cards become available once seating is generated." });
      } else if (status === 404) {
        setCardError({ title: /exam-schedule/.test(reason.message) ? "Exam not found" : "Student not found", detail: "Check the student ID and examination selection, then try again." });
      } else {
        setCardError({ title: "Could not load the admit card", detail: "Something went wrong while fetching the card. Please try again." });
      }
    } finally {
      setCardLoading(false);
    }
  };

  const selectedExam = useMemo(() => schedule.find((exam) => String(exam.id) === String(examId)) || null, [schedule, examId]);

  const inputStyle = {
    width: "100%",
    minWidth: 0,
    padding: "10px 12px",
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    background: colors.card,
    color: colors.textBody,
    fontSize: 14,
    fontFamily: fonts.sans,
  };

  return (
    <div className="page-transition" style={{ padding: "30px 36px 40px", flex: 1, minWidth: 0 }}>
      <Toast message={toast} onClose={() => setToast(null)} type="success" />

      <header data-page-section="admit-card" className="print-hide" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600, marginBottom: 7 }}>
          Assessment operations · candidate documents
        </div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, margin: 0 }}>
          {session?.role === "student" ? "My admit card" : "Digital admit card"}
        </h1>
        <p style={{ fontSize: 15, color: colors.textMuted, margin: "5px 0 0" }}>
          Generated straight from the seating plan — no seat is ever reassigned here.
        </p>
      </header>

      {/* Selection form (hidden when printing) */}
      <section className="print-hide" style={{ ...panelStyle, marginBottom: 22 }}>
        <form onSubmit={loadCard} style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label style={{ display: "grid", gap: 6, minWidth: 0, fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>
              Student ID
              <input
                type="text"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                placeholder="e.g. STU-001"
                aria-label="Student ID"
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 6, minWidth: 0, fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>
              Examination
              <select
                value={examId}
                onChange={(event) => setExamId(event.target.value)}
                aria-label="Examination"
                disabled={scheduleLoading}
                style={{ ...inputStyle, textOverflow: "ellipsis" }}
              >
                <option value="">{scheduleLoading ? "Loading exams…" : "Select an exam…"}</option>
                {schedule.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {formatDate(exam.exam_date)} · {exam.start_time} · {exam.module_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="submit"
              disabled={cardLoading || !studentId.trim() || !examId}
              style={{
                border: "none",
                borderRadius: 8,
                padding: "11px 18px",
                background: colors.ink,
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 14,
                cursor: cardLoading ? "wait" : "pointer",
                opacity: cardLoading || !studentId.trim() || !examId ? 0.55 : 1,
              }}
            >
              {cardLoading ? "Loading admit card…" : "Fetch admit card"}
            </button>
            {selectedExam && (
              <span style={{ fontSize: 12.5, color: colors.textMuted }}>
                {selectedExam.student_count} candidates · invigilator {selectedExam.invigilator}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* States */}
      {cardLoading && (
        <section className="print-hide" style={panelStyle}>
          <p style={{ color: colors.textMuted, margin: 0 }}>Loading admit card…</p>
        </section>
      )}

      {!cardLoading && cardError && (
        <section
          className="print-hide"
          role="alert"
          style={{ ...panelStyle, border: `1px solid ${colors.high.dot}55`, background: colors.high.bg }}
        >
          <strong style={{ color: colors.high.text, fontSize: 15 }}>{cardError.title}</strong>
          <p style={{ margin: "8px 0 0", fontSize: 13.5, color: colors.high.text }}>{cardError.detail}</p>
        </section>
      )}

      {!cardLoading && !cardError && card && (
        <section className="print-area">
          <div className="print-hide" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                padding: "9px 14px",
                background: colors.card,
                color: colors.ink,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              🖨️ Print admit card
            </button>
          </div>
          <AdmitCardDocument card={card} />
        </section>
      )}

      {!cardLoading && !cardError && !card && !scheduleLoading && (
        <section className="print-hide" style={panelStyle}>
          <p style={{ color: colors.textMuted, margin: 0, fontSize: 14 }}>
            Pick a candidate and an examination above to view their admit card.
            {session?.role === "student" && " Your exams are listed automatically."}
          </p>
        </section>
      )}
    </div>
  );
}
