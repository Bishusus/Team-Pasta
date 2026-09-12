import React, { useEffect, useState } from "react";
import { fonts, colors } from "../theme";
import RiskBadge from "../components/RiskBadge";
import AttendanceBar from "../components/AttendanceBar";
import { fetchStudentById } from "../services/api";

function formatDate(date) {
  if (!date) return "Not provided";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(date));
}

const detailLabel = { fontSize: 12, color: colors.textMuted, marginBottom: 5 };
const detailValue = { fontSize: 15, color: colors.ink, fontWeight: 600 };

export default function StudentDetailPage({ studentId, onBack }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    setStudent(null);
    setError(null);
    fetchStudentById(studentId)
      .then((data) => {
        setStudent(data);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return <div style={{ padding: "32px 36px", color: colors.textMuted }}>Loading student risk profile...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "30px 36px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: colors.low.text, cursor: "pointer", fontWeight: 600, padding: 0, marginBottom: 20 }}>← Back to Risk Analysis</button>
        <div style={{ padding: 24, background: "#FDF2F2", border: "1px solid #F87171", borderRadius: 10, color: "#991B1B" }}>
          <strong>{error.status === 404 ? "Student not found" : "Could not load student risk details"}</strong>
          <p style={{ margin: "8px 0 0", fontSize: 13 }}>{error.status === 404 ? `No student was found for ID ${studentId}.` : error.message}</p>
        </div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div style={{ padding: "30px 36px 40px", flex: 1, minWidth: 0 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: colors.low.text, cursor: "pointer", fontWeight: 600, padding: 0, marginBottom: 20 }}>← Back to Risk Analysis</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600, marginBottom: 7 }}>Student risk profile</div>
          <h1 style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink, margin: 0 }}>{student.name}</h1>
          <div style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted, marginTop: 6 }}>{student.id}</div>
        </div>
        <RiskBadge level={student.riskLevel} />
      </div>

      <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 24, marginBottom: 18 }}>
        <h2 style={{ fontSize: 16, color: colors.ink, margin: "0 0 18px" }}>Student information</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "18px 24px" }}>
          <div><div style={detailLabel}>Full name</div><div style={detailValue}>{student.name}</div></div>
          <div><div style={detailLabel}>Student ID</div><div style={{ ...detailValue, fontFamily: fonts.mono }}>{student.id}</div></div>
          <div><div style={detailLabel}>Programme</div><div style={detailValue}>{student.programme || "Not provided"}</div></div>
          <div><div style={detailLabel}>Semester</div><div style={detailValue}>{student.semester || "Not provided"}</div></div>
          <div><div style={detailLabel}>Module</div><div style={detailValue}>{student.module || "Not provided"}</div></div>
          <div><div style={detailLabel}>Exam date</div><div style={detailValue}>{formatDate(student.examDate)}</div></div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 24 }}>
          <h2 style={{ fontSize: 16, color: colors.ink, margin: "0 0 18px" }}>Academic performance</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
            <div><div style={detailLabel}>Exam 1</div><div style={{ ...detailValue, fontFamily: fonts.mono, fontSize: 20 }}>{student.exam1Score ?? "-"}%</div></div>
            <div><div style={detailLabel}>Exam 2</div><div style={{ ...detailValue, fontFamily: fonts.mono, fontSize: 20 }}>{student.exam2Score ?? "-"}%</div></div>
            <div><div style={detailLabel}>Final exam</div><div style={{ ...detailValue, fontFamily: fonts.mono, fontSize: 20 }}>{student.examScore ?? "-"}%</div></div>
            <div><div style={detailLabel}>Attendance</div><AttendanceBar value={student.attendance ?? 0} /></div>
          </div>
        </section>

        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 24 }}>
          <h2 style={{ fontSize: 16, color: colors.ink, margin: "0 0 18px" }}>Risk assessment</h2>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <strong style={{ fontFamily: fonts.mono, fontSize: 32, color: colors.ink }}>{student.riskScore ?? "-"}</strong>
            <span style={{ color: colors.textMuted, fontSize: 13 }}>/ 100 risk score</span>
          </div>
          <div style={{ height: 8, background: colors.borderLight, borderRadius: 4, overflow: "hidden", margin: "12px 0 18px" }}>
            <div style={{ width: `${Math.min(Math.max(student.riskScore ?? 0, 0), 100)}%`, height: "100%", background: colors[student.riskLevel?.toLowerCase()]?.dot || colors.ink }} />
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>Risk reasons</div>
          {student.riskReasons.length > 0 ? (
            <ul style={{ paddingLeft: 18, margin: 0, color: colors.textBody, fontSize: 13, lineHeight: 1.7 }}>
              {student.riskReasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          ) : <p style={{ margin: 0, color: colors.textMuted, fontSize: 13 }}>No risk factors recorded.</p>}
        </section>
      </div>

      <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 24, marginTop: 18 }}>
        <h2 style={{ fontSize: 16, color: colors.ink, margin: "0 0 18px" }}>Performance trend</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, alignItems: "end", minHeight: 150 }}>
          {[{ label: "Exam 1", value: student.exam1Score }, { label: "Exam 2", value: student.exam2Score }, { label: "Final", value: student.examScore }].map((exam) => (
            <div key={exam.label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, marginBottom: 7 }}>{exam.value ?? "-"}%</div>
              <div style={{ height: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ width: "min(52px, 60%)", height: `${Math.min(Math.max(exam.value ?? 0, 0), 100)}%`, minHeight: exam.value == null ? 0 : 4, background: colors.ink, borderRadius: "5px 5px 0 0" }} />
              </div>
              <div style={{ fontSize: 12, color: colors.textBody, marginTop: 8 }}>{exam.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}