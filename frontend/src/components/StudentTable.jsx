import React from "react";
import { colors, fonts } from "../theme";
import RiskBadge from "./RiskBadge";
import AttendanceBar from "./AttendanceBar";

const headerCell = {
  textAlign: "left",
  padding: "10px 16px",
  fontSize: 12,
  fontWeight: 600,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: "nowrap",
};

const cell = {
  padding: "12px 16px",
  fontSize: 14,
  color: colors.textBody,
  borderBottom: `1px solid ${colors.borderLight}`,
  whiteSpace: "nowrap",
};

export default function StudentTable({ students, onSelectStudent, showReasons = false }) {
  const columnCount = showReasons ? 9 : 8;

  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={headerCell}>Student ID</th>
            <th style={headerCell}>Name</th>
            <th style={headerCell}>Programme</th>
            <th style={headerCell}>Module</th>
            <th style={headerCell}>Attendance</th>
            <th style={headerCell}>Final exam score</th>
            <th style={headerCell}>Risk score</th>
            <th style={headerCell}>Risk level</th>
            {showReasons && <th style={headerCell}>Risk reasons</th>}
          </tr>
        </thead>
        <tbody>
          {students.length === 0 ? (
            <tr>
              <td colSpan={columnCount} style={{ ...cell, textAlign: "center", color: "#8C90A0", padding: "28px 16px" }}>
                No students match your search.
              </td>
            </tr>
          ) : (
            students.map((s) => (
              <tr 
                key={s.id} 
                onClick={() => onSelectStudent && onSelectStudent(s.id)}
                style={{ cursor: onSelectStudent ? "pointer" : "default", transition: "background 0.15s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F8F9FC")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ ...cell, fontFamily: fonts.mono, color: colors.textMuted }}>{s.id}</td>
                <td style={{ ...cell, fontWeight: 500, color: "#1F2C4E" }}>{s.name}</td>
                <td style={cell}>{s.programme}</td>
                <td style={cell}>{s.module}</td>
                <td style={cell}>
                  <AttendanceBar value={s.attendance} />
                </td>
                <td style={{ ...cell, fontFamily: fonts.mono }}>{s.examScore}</td>
                <td style={{ ...cell, fontFamily: fonts.mono, fontWeight: 600 }}>{s.riskScore}</td>
                <td style={cell}>
                  <RiskBadge level={s.riskLevel} />
                </td>
                {showReasons && (
                  <td style={{ ...cell, whiteSpace: "normal", minWidth: 240, maxWidth: 340, lineHeight: 1.5 }}>
                    {s.riskReasons?.length ? s.riskReasons.join("; ") : "No risk factors recorded."}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}