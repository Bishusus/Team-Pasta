import React, { useEffect, useMemo, useState } from "react";
import { colors, fonts } from "../theme";
import { fetchExamLayout, fetchExamSchedule, generateExamSchedule } from "../services/api";

const panelStyle = { background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 22 };
const seatColors = ["#DCE7FF", "#FBE3D5", "#DDF3E6", "#F4E4FA", "#FFF0C7", "#DDF1F4"];

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function moduleColor(moduleName, modules) {
  return seatColors[Math.max(0, modules.indexOf(moduleName)) % seatColors.length];
}

export default function ExamSeatingPage({ isAdmin, role, identity, onLogin }) {
  const [schedule, setSchedule] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const exams = await fetchExamSchedule();
      setSchedule(exams);
      const nextId = selectedId && exams.some((exam) => exam.id === selectedId) ? selectedId : exams[0]?.id;
      setSelectedId(nextId ?? null);
      const selectedExam = exams.find((exam) => exam.id === nextId);
      const canViewLayout = isAdmin || role === "STUDENT" || (role === "TEACHER" && selectedExam?.invigilator === identity);
      if (nextId && canViewLayout) setLayout(await fetchExamLayout(nextId));
      else setLayout(null);
    } catch (reason) {
      setError(reason.message || "Unable to load exam seating.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selectExam = async (examId) => {
    setSelectedId(examId);
    const exam = schedule.find((item) => item.id === examId);
    const canViewLayout = isAdmin || role === "STUDENT" || (role === "TEACHER" && exam?.invigilator === identity);
    if (!canViewLayout) {
      setLayout(null);
      setError("Only the assigned invigilator can view this seating arrangement.");
      return;
    }
    setError(null);
    setLayout(await fetchExamLayout(examId));
  };

  const regenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await generateExamSchedule();
      await load();
    } catch (reason) {
      setError(reason.message || "Unable to regenerate exam seating.");
    } finally {
      setGenerating(false);
    }
  };

  const modules = useMemo(() => [...new Set(layout?.rooms.flatMap((room) => room.assignments.map((seat) => seat.module_name)) ?? [])].sort(), [layout]);

  return (
    <div style={{ padding: "30px 36px 40px", flex: 1, minWidth: 0 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 24 }}>
        <div><div style={{ fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600, marginBottom: 7 }}>Assessment operations · room allocation</div><h1 style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, margin: 0 }}>Exam schedule & seating</h1><p style={{ fontSize: 15, color: colors.textMuted, margin: "5px 0 0" }}>Every candidate, room, bench, and invigilator in one view.</p></div>
        {isAdmin ? <button type="button" onClick={regenerate} disabled={generating} style={{ border: `1px solid ${colors.border}`, borderRadius: 6, padding: "9px 13px", background: colors.card, color: colors.ink, fontWeight: 600, cursor: generating ? "wait" : "pointer" }}>{generating ? "Generating..." : "Regenerate layout"}</button> : <button type="button" onClick={onLogin} style={{ border: `1px solid ${colors.border}`, borderRadius: 6, padding: "9px 13px", background: colors.card, color: colors.ink, fontWeight: 600, cursor: "pointer" }}>Admin login to regenerate</button>}
      </header>
      {error && <div style={{ marginBottom: 18, padding: 13, background: "#FDF2F2", border: "1px solid #F87171", borderRadius: 8, color: "#991B1B", fontSize: 13 }}>{error}</div>}
      {loading ? <p style={{ color: colors.textMuted }}>Loading exam allocation...</p> : !schedule.length ? <section style={panelStyle}><p style={{ color: colors.textMuted, margin: 0 }}>No generated exams are available.</p></section> : <>
        <section style={{ ...panelStyle, padding: 0, overflow: "hidden", marginBottom: 18 }}>
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}><thead><tr>{["Date", "Time", "Module", "Invigilator", "Candidates", "View"].map((heading) => <th key={heading} style={{ padding: "13px 14px", textAlign: "left", color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, borderBottom: `1px solid ${colors.borderLight}` }}>{heading}</th>)}</tr></thead><tbody>{schedule.map((exam) => <tr key={exam.id} style={{ background: selectedId === exam.id ? "#F3F6FF" : colors.card }}><td style={{ padding: "12px 14px", fontSize: 13 }}>{formatDate(exam.exam_date)}</td><td style={{ padding: "12px 14px", fontFamily: fonts.mono, fontSize: 12 }}>{exam.start_time}</td><td style={{ padding: "12px 14px", fontWeight: 600, fontSize: 13 }}>{exam.module_name}</td><td style={{ padding: "12px 14px", color: colors.textBody, fontSize: 13 }}>{exam.invigilator}</td><td style={{ padding: "12px 14px", fontFamily: fonts.mono, fontSize: 12 }}>{exam.student_count}</td><td style={{ padding: "12px 14px" }}><button type="button" onClick={() => selectExam(exam.id)} style={{ border: "none", background: "none", color: colors.low.text, fontWeight: 600, cursor: "pointer" }}>View layout</button></td></tr>)}</tbody></table></div>
        </section>
        {layout && <section style={panelStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap", marginBottom: 20 }}><div><h2 style={{ color: colors.ink, fontSize: 19, margin: 0 }}>{layout.exam.module_name}</h2><p style={{ color: colors.textMuted, fontSize: 13, margin: "5px 0 0" }}>{formatDate(layout.exam.exam_date)} · {layout.exam.start_time} · {layout.exam.invigilator}</p></div><div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{modules.map((module) => <span key={module} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: colors.textBody, fontSize: 12 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: moduleColor(module, modules), border: `1px solid ${colors.border}` }} />{module}</span>)}</div></div>{layout.rooms.map((room) => { const seats = new Map(room.assignments.map((seat) => [`${seat.row}-${seat.column}`, seat])); return <div key={room.id} style={{ marginBottom: 26 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><h3 style={{ color: colors.ink, fontSize: 15, margin: 0 }}>{room.name}</h3><span style={{ color: colors.textMuted, fontSize: 12 }}>{room.assignments.length} / {room.capacity} seats</span></div><div style={{ display: "grid", gridTemplateColumns: `repeat(${room.columns}, minmax(42px, 1fr))`, gap: 6, maxWidth: 900 }}>{Array.from({ length: room.rows * room.columns }, (_, index) => { const row = Math.floor(index / room.columns) + 1; const column = (index % room.columns) + 1; const seat = seats.get(`${row}-${column}`); return <div key={`${row}-${column}`} title={seat ? `${seat.student_name} · ${seat.student_id}` : "Available seat"} style={{ aspectRatio: "1.4", border: `1px solid ${seat ? colors.border : colors.borderLight}`, borderRadius: 4, background: seat ? moduleColor(seat.module_name, modules) : colors.page, padding: 5, minWidth: 0, overflow: "hidden" }}><div style={{ fontFamily: fonts.mono, color: colors.textMuted, fontSize: 9 }}>{row}-{column}</div>{seat && <div style={{ color: colors.ink, fontSize: 10, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 5 }}>{seat.student_id}</div>}</div>; })}</div></div>; })}</section>}
      </>}
    </div>
  );
}