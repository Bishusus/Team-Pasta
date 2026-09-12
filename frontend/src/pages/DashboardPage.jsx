import React, { useMemo } from "react";
import { colors, fonts } from "../theme";
import SummaryCard from "../components/SummaryCard";

const riskLevels = [
  { key: "HIGH", label: "High risk", tone: "high" },
  { key: "MEDIUM", label: "Medium risk", tone: "medium" },
  { key: "LOW", label: "Low risk", tone: "low" },
];

const panelStyle = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: 22,
};

const actionButton = {
  border: "none",
  background: "none",
  padding: 0,
  color: colors.low.text,
  fontWeight: 600,
  cursor: "pointer",
};

function formatDate(date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(date));
}

export default function DashboardPage({
  students,
  summary,
  summaryLoading,
  summaryError,
  health,
  healthLoading,
  loading,
  error,
  onRetry,
  onNavigate,
  onSelectStudent,
}) {
  const counts = {
    total: summary?.total_students ?? 0,
    high: summary?.high_risk ?? 0,
    medium: summary?.medium_risk ?? 0,
    low: summary?.low_risk ?? 0,
  };

  const upcomingExams = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exams = new Map();
    students.forEach((student) => {
      if (!student.examDate) return;
      const date = new Date(student.examDate);
      if (Number.isNaN(date.getTime()) || date < today) return;
      const key = `${student.module || "Academic examination"}-${student.examDate}`;
      exams.set(key, { module: student.module || "Academic examination", date: student.examDate });
    });
    return [...exams.values()].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3);
  }, [students]);

  const priorityAlerts = students.filter((student) => student.riskLevel === "HIGH").slice(0, 4);
  const attendanceAlerts = students.filter((student) => student.attendance != null && student.attendance < 75).slice(0, 4);

  if (loading && !students.length) {
    return <div style={{ padding: "32px 36px", color: colors.textMuted }}>Loading Islington College academic overview...</div>;
  }

  if (error && !students.length) {
    return (
      <div style={{ padding: "30px 36px" }}>
        <h1 style={{ fontFamily: fonts.display, color: colors.ink, margin: "0 0 8px" }}>Academic Command Center</h1>
        <div style={{ padding: 24, background: "#FDF2F2", border: "1px solid #F87171", borderRadius: 10, color: "#991B1B" }}>
          <strong>We couldn’t load the academic overview.</strong>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>{error}</p>
          <button onClick={onRetry} style={{ marginTop: 12, padding: "7px 13px", borderRadius: 6, background: "#991B1B", color: "#FFF", border: "none", cursor: "pointer" }}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page" style={{ padding: "30px 36px 40px", flex: 1, minWidth: 0 }}>
      <header style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600, marginBottom: 7 }}>Islington College · Academic Intelligence</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, margin: 0 }}>Academic Command Center</h1>
        <p style={{ fontSize: 15, color: colors.textMuted, margin: "5px 0 0" }}>Smarter systems. Stronger records.</p>
      </header>

      {summaryError && <div style={{ padding: 13, marginBottom: 18, background: "#FDF2F2", border: "1px solid #F87171", borderRadius: 10, color: "#991B1B", fontSize: 13 }}>Risk summary unavailable: {summaryError}</div>}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <SummaryCard label="Total students" value={summaryLoading ? "-" : counts.total} tone="neutral" />
        <SummaryCard label="High-risk students" value={summaryLoading ? "-" : counts.high} tone="high" />
        <SummaryCard label="Upcoming exams" value={upcomingExams.length} tone="medium" />
        <SummaryCard label="Academic records" value={healthLoading ? "-" : health?.database === "connected" ? "Connected" : "Unavailable"} tone="low" />
      </div>

      <div className="dashboard-primary-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)", gap: 18, marginBottom: 18 }}>
        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
            <div><h2 style={{ fontSize: 17, color: colors.ink, margin: 0 }}>Academic Risk Overview</h2><p style={{ fontSize: 13, color: colors.textMuted, margin: "4px 0 0" }}>Backend-calculated student risk distribution.</p></div>
            <button onClick={() => onNavigate("risk")} style={actionButton}>View Risk Analysis →</button>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {riskLevels.map((item) => {
              const value = counts[item.key === "HIGH" ? "high" : item.key === "MEDIUM" ? "medium" : "low"];
              const percentage = counts.total ? (value / counts.total) * 100 : 0;
              return <div key={item.key} style={{ display: "grid", gridTemplateColumns: "90px 1fr 30px", alignItems: "center", gap: 10 }}><span style={{ fontSize: 13, color: colors.textBody, fontWeight: 600 }}>{item.label}</span><div style={{ height: 8, background: colors.borderLight, borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${percentage}%`, height: "100%", background: colors[item.tone].dot }} /></div><span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, textAlign: "right" }}>{value}</span></div>;
            })}
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
            <div><h2 style={{ fontSize: 17, color: colors.ink, margin: 0 }}>Upcoming Academic Schedule</h2><p style={{ fontSize: 13, color: colors.textMuted, margin: "4px 0 0" }}>Exam dates recorded in the academic system.</p></div>
            <button onClick={() => onNavigate("seating")} style={actionButton}>Exam Seating →</button>
          </div>
          {upcomingExams.length ? upcomingExams.map((exam) => <div key={`${exam.module}-${exam.date}`} style={{ padding: "11px 0", borderTop: `1px solid ${colors.borderLight}`, display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: colors.textBody, fontSize: 13, fontWeight: 600 }}>{exam.module}</span><span style={{ color: colors.textMuted, fontSize: 12 }}>{formatDate(exam.date)} · Scheduled</span></div>) : <div style={{ padding: "18px 0", borderTop: `1px solid ${colors.borderLight}`, color: colors.textMuted, fontSize: 13 }}>No upcoming exams available.</div>}
        </section>
      </div>

      <div className="dashboard-secondary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18, marginBottom: 18 }}>
        <section style={panelStyle}>
          <h2 style={{ fontSize: 17, color: colors.ink, margin: "0 0 4px" }}>Academic Records</h2>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 14px" }}>Centralized records for institutional decisions.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderTop: `1px solid ${colors.borderLight}` }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: health?.database === "connected" ? colors.low.dot : colors.high.dot }} /><div><div style={{ color: colors.ink, fontWeight: 600, fontSize: 14 }}>{counts.total} student records</div><div style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>{healthLoading ? "Checking connection..." : health?.database === "connected" ? "Database connected · Student data available" : "Database connection unavailable"}</div></div></div>
        </section>

        <section style={panelStyle}>
          <h2 style={{ fontSize: 17, color: colors.ink, margin: "0 0 4px" }}>Exam Seating Overview</h2>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 14px" }}>A focused workspace for future room and seat allocation.</p>
          <div style={{ padding: "13px 0", borderTop: `1px solid ${colors.borderLight}`, color: colors.textMuted, fontSize: 13 }}>Ready for upcoming exam allocation.</div>
          <button onClick={() => onNavigate("seating")} style={actionButton}>Open Exam Seating →</button>
        </section>
      </div>

      <div className="dashboard-secondary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18 }}>
        <section style={panelStyle}>
          <h2 style={{ fontSize: 17, color: colors.ink, margin: "0 0 4px" }}>Priority Alerts</h2>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 10px" }}>High-risk students requiring review.</p>
          {priorityAlerts.length ? priorityAlerts.map((student) => <button key={student.id} onClick={() => { onNavigate("risk"); onSelectStudent(student.id); }} style={{ width: "100%", textAlign: "left", padding: "11px 0", border: "none", borderTop: `1px solid ${colors.borderLight}`, background: "none", display: "flex", justifyContent: "space-between", gap: 12, cursor: "pointer" }}><span style={{ color: colors.textBody, fontSize: 13 }}>{student.name}</span><span style={{ fontFamily: fonts.mono, color: colors.high.dot, fontSize: 12 }}>{student.riskScore}/100</span></button>) : <p style={{ color: colors.textMuted, fontSize: 13 }}>No high-risk alerts in the current data.</p>}
        </section>

        <section style={panelStyle}>
          <h2 style={{ fontSize: 17, color: colors.ink, margin: "0 0 4px" }}>Attendance Alerts</h2>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 10px" }}>Students below 75% attendance.</p>
          {attendanceAlerts.length ? attendanceAlerts.map((student) => <button key={student.id} onClick={() => { onNavigate("risk"); onSelectStudent(student.id); }} style={{ width: "100%", textAlign: "left", padding: "11px 0", border: "none", borderTop: `1px solid ${colors.borderLight}`, background: "none", display: "flex", justifyContent: "space-between", gap: 12, cursor: "pointer" }}><span style={{ color: colors.textBody, fontSize: 13 }}>{student.name}</span><span style={{ fontFamily: fonts.mono, color: colors.high.dot, fontSize: 12 }}>{student.attendance}%</span></button>) : <p style={{ color: colors.textMuted, fontSize: 13 }}>No attendance alerts in the current data.</p>}
        </section>
      </div>
    </div>
  );
}
