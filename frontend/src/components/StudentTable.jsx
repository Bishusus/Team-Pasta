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

// Renders whatever `students` array it's given. Filtering/searching
// happens in the parent (DashboardPage) — this component just displays.
export default function StudentTable({ students }) {
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
            <th style={headerCell}>Risk level</th>
            <th style={headerCell}>Risk score</th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 && (
            <tr>
              <td colSpan={8} style={{ ...cell, textAlign: "center", color: "#8C90A0", padding: "28px 16px" }}>
                No students match your search.
              </td>
            </tr>
          )}

          {students.map((s) => (
            <tr key={s.id}>
              <td style={{ ...cell, fontFamily: fonts.mono, color: colors.textMuted }}>{s.id}</td>
              <td style={{ ...cell, fontWeight: 500 }}>{s.name}</td>
              <td style={cell}>{s.programme}</td>
              <td style={cell}>{s.module}</td>
              <td style={cell}>
                <AttendanceBar value={s.attendance} />
              </td>
              <td style={{ ...cell, fontFamily: fonts.mono }}>{s.examScore}</td>
              <td style={cell}>
                <RiskBadge level={s.riskLevel} />
              </td>
              <td style={{ ...cell, fontFamily: fonts.mono, fontWeight: 600 }}>{s.riskScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
