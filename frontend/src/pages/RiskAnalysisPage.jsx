import React, { useMemo, useState } from "react";
import { colors, fonts } from "../theme";
import SummaryCard from "../components/SummaryCard";
import SearchBox from "../components/SearchBox";
import StudentTable from "../components/StudentTable";

const selectStyle = {
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  background: colors.card,
  color: colors.ink,
  padding: "9px 32px 9px 11px",
  fontSize: 13,
  minWidth: 150,
};

const distribution = [
  { key: "HIGH", label: "High risk", tone: "high" },
  { key: "MEDIUM", label: "Medium risk", tone: "medium" },
  { key: "LOW", label: "Low risk", tone: "low" },
];

export default function RiskAnalysisPage({ students, summary, summaryLoading, summaryError, loading, error, onRetry, onSelectStudent }) {
  const [level, setLevel] = useState("HIGH");
  const [programme, setProgramme] = useState("");
  const [semester, setSemester] = useState("");
  const [module, setModule] = useState("");
  const [query, setQuery] = useState("");

  const programmes = useMemo(() => [...new Set(students.map((student) => student.programme).filter(Boolean))].sort(), [students]);
  const semesters = useMemo(() => [...new Set(students.map((student) => student.semester).filter(Boolean))].sort(), [students]);
  const modules = useMemo(() => [...new Set(students.map((student) => student.module).filter(Boolean))].sort(), [students]);
  const counts = {
    total: summary?.total_students ?? 0,
    high: summary?.high_risk ?? 0,
    medium: summary?.medium_risk ?? 0,
    low: summary?.low_risk ?? 0,
  };

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesLevel = !level || student.riskLevel === level;
      const matchesProgramme = !programme || student.programme === programme;
      const matchesSemester = !semester || String(student.semester) === String(semester);
      const matchesModule = !module || student.module === module;
      const matchesQuery = !normalizedQuery
        || student.name?.toLowerCase().includes(normalizedQuery)
        || student.id?.toLowerCase().includes(normalizedQuery);
      return matchesLevel && matchesProgramme && matchesSemester && matchesModule && matchesQuery;
    });
  }, [students, level, programme, semester, module, query]);

  return (
    <div style={{ padding: "30px 36px 40px", flex: 1, minWidth: 0 }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600, marginBottom: 7 }}>
          Academic Intelligence
        </div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink, margin: 0 }}>Risk analysis</h1>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: "4px 0 0" }}>
          Focus attention on students whose academic signals need review.
        </p>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <SummaryCard label="Total students" value={summaryLoading ? "-" : counts.total} tone="neutral" />
        <SummaryCard label="High risk" value={summaryLoading ? "-" : counts.high} tone="high" />
        <SummaryCard label="Medium risk" value={summaryLoading ? "-" : counts.medium} tone="medium" />
        <SummaryCard label="Low risk" value={summaryLoading ? "-" : counts.low} tone="low" />
      </div>

      <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 22, marginBottom: 22 }}>
        <h2 style={{ fontSize: 16, color: colors.ink, margin: "0 0 18px" }}>Risk distribution</h2>
        <div style={{ display: "grid", gap: 14 }}>
          {distribution.map((item) => {
            const value = counts[item.key === "HIGH" ? "high" : item.key === "MEDIUM" ? "medium" : "low"];
            const percentage = counts.total ? (value / counts.total) * 100 : 0;
            return (
              <div key={item.key} style={{ display: "grid", gridTemplateColumns: "105px 1fr 42px", alignItems: "center", gap: 12 }}>
                <div style={{ color: colors.textBody, fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                <div style={{ height: 9, background: colors.borderLight, borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${percentage}%`, height: "100%", background: colors[item.tone].dot, borderRadius: 5 }} />
                </div>
                <div style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted, textAlign: "right" }}>{value}</div>
              </div>
            );
          })}
        </div>
      </section>

      {summaryError && (
        <div style={{ padding: 16, marginBottom: 18, background: "#FDF2F2", border: "1px solid #F87171", borderRadius: 10, color: "#991B1B", fontSize: 13 }}>
          Risk summary unavailable: {summaryError}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, color: colors.ink, margin: 0 }}>Students requiring review</h2>
          <p style={{ fontSize: 13, color: colors.textMuted, margin: "4px 0 0" }}>{filteredStudents.length} records shown</p>
        </div>
        <SearchBox value={query} onChange={setQuery} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <select aria-label="Filter by risk level" value={level} onChange={(event) => setLevel(event.target.value)} style={selectStyle}>
          <option value="">All risk levels</option>
          <option value="HIGH">High risk</option>
          <option value="MEDIUM">Medium risk</option>
          <option value="LOW">Low risk</option>
        </select>
        <select aria-label="Filter by programme" value={programme} onChange={(event) => setProgramme(event.target.value)} style={selectStyle}>
          <option value="">All programmes</option>
          {programmes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select aria-label="Filter by semester" value={semester} onChange={(event) => setSemester(event.target.value)} style={selectStyle}>
          <option value="">All semesters</option>
          {semesters.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select aria-label="Filter by module" value={module} onChange={(event) => setModule(event.target.value)} style={selectStyle}>
          <option value="">All modules</option>
          {modules.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: colors.textMuted, background: colors.card, borderRadius: 10, border: `1px solid ${colors.border}` }}>
          Loading risk records...
        </div>
      )}

      {error && (
        <div style={{ padding: 24, background: "#FDF2F2", border: "1px solid #F87171", borderRadius: 10, color: "#991B1B" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>We couldn’t load the risk records.</p>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>{error}</p>
          <button onClick={onRetry} style={{ marginTop: 12, padding: "6px 12px", borderRadius: 6, background: "#991B1B", color: "#FFF", border: "none", cursor: "pointer" }}>Try again</button>
        </div>
      )}

      {!loading && !error && (
        filteredStudents.length ? (
          <StudentTable students={filteredStudents} onSelectStudent={onSelectStudent} showReasons />
        ) : (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 32, textAlign: "center", color: colors.textMuted }}>
            No students match the selected risk filters.
          </div>
        )
      )}
    </div>
  );
}
