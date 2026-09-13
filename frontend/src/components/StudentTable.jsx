import React, { useMemo, useState } from "react";
import { colors, fonts } from "../theme";
import RiskBadge from "./RiskBadge";
import AttendanceBar from "./AttendanceBar";
import { exportToCsv } from "../utils/exportCsv";

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
  userSelect: "none",
};

const cell = {
  padding: "12px 16px",
  fontSize: 14,
  color: colors.textBody,
  borderBottom: `1px solid ${colors.borderLight}`,
  whiteSpace: "nowrap",
};

const csvHeaders = [
  { label: "Student ID", key: "id" },
  { label: "Full Name", key: "name" },
  { label: "Programme", key: "programme" },
  { label: "Semester", key: "semester" },
  { label: "Module", key: "module" },
  { label: "Attendance %", key: "attendance" },
  { label: "Exam 1 Score", key: "exam1Score" },
  { label: "Exam 2 Score", key: "exam2Score" },
  { label: "Final Exam Score", key: "examScore" },
  { label: "Risk Score", key: "riskScore" },
  { label: "Risk Level", key: "riskLevel" },
  { label: "Risk Reasons", key: "riskReasons" },
];

export default function StudentTable({ students, onSelectStudent, showReasons = false }) {
  const [sortField, setSortField] = useState("riskScore");
  const [sortDirection, setSortDirection] = useState("desc");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === "string") {
        const res = valA.localeCompare(valB);
        return sortDirection === "asc" ? res : -res;
      }
      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
  }, [students, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, currentPage, pageSize]);

  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  const handleExportCsv = () => {
    exportToCsv("Student_Risk_Report.csv", sortedStudents, csvHeaders);
  };

  const columnCount = showReasons ? 9 : 8;

  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
      {/* Table Header Controls */}
      <div style={{ padding: "12px 16px", background: colors.page, borderBottom: `1px solid ${colors.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 13, color: colors.textMuted }}>
          Showing <strong>{sortedStudents.length ? (currentPage - 1) * pageSize + 1 : 0}</strong> - <strong>{Math.min(currentPage * pageSize, sortedStudents.length)}</strong> of <strong>{sortedStudents.length}</strong> students
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label style={{ fontSize: 12, color: colors.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
            Per page:
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ border: `1px solid ${colors.border}`, borderRadius: 6, padding: "4px 8px", background: colors.card, color: colors.textBody, fontSize: 12 }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!students.length}
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.card,
              borderRadius: 6,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 600,
              color: colors.ink,
              cursor: students.length ? "pointer" : "not-allowed",
            }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...headerCell, cursor: "pointer" }} onClick={() => handleSort("id")}>
                Student ID{renderSortIndicator("id")}
              </th>
              <th style={{ ...headerCell, cursor: "pointer" }} onClick={() => handleSort("name")}>
                Name{renderSortIndicator("name")}
              </th>
              <th style={{ ...headerCell, cursor: "pointer" }} onClick={() => handleSort("programme")}>
                Programme{renderSortIndicator("programme")}
              </th>
              <th style={{ ...headerCell, cursor: "pointer" }} onClick={() => handleSort("module")}>
                Module{renderSortIndicator("module")}
              </th>
              <th style={{ ...headerCell, cursor: "pointer" }} onClick={() => handleSort("attendance")}>
                Attendance{renderSortIndicator("attendance")}
              </th>
              <th style={{ ...headerCell, cursor: "pointer" }} onClick={() => handleSort("examScore")}>
                Final score{renderSortIndicator("examScore")}
              </th>
              <th style={{ ...headerCell, cursor: "pointer" }} onClick={() => handleSort("riskScore")}>
                Risk score{renderSortIndicator("riskScore")}
              </th>
              <th style={{ ...headerCell, cursor: "pointer" }} onClick={() => handleSort("riskLevel")}>
                Risk level{renderSortIndicator("riskLevel")}
              </th>
              {showReasons && <th style={headerCell}>Risk reasons</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={columnCount} style={{ ...cell, textAlign: "center", color: "#8C90A0", padding: "28px 16px" }}>
                  No students match your search.
                </td>
              </tr>
            ) : (
              paginatedStudents.map((s) => (
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
                  <td style={{ ...cell, fontFamily: fonts.mono }}>{s.examScore ?? "-"}</td>
                  <td style={{ ...cell, fontFamily: fonts.mono, fontWeight: 600 }}>{s.riskScore ?? "-"}</td>
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

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div style={{ padding: "12px 16px", background: colors.page, borderTop: `1px solid ${colors.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            style={{ border: `1px solid ${colors.border}`, background: colors.card, padding: "5px 12px", borderRadius: 6, cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: 12 }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: 12, color: colors.textMuted }}>
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            style={{ border: `1px solid ${colors.border}`, background: colors.card, padding: "5px 12px", borderRadius: 6, cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: 12 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}