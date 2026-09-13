import React, { useMemo, useState } from "react";
import { colors, fonts } from "../theme";
import SummaryCard from "../components/SummaryCard";
import SearchBox from "../components/SearchBox";
import StudentTable from "../components/StudentTable";
import RiskBadge from "../components/RiskBadge";
import AttendanceBar from "../components/AttendanceBar";
import { Reveal } from "../hooks/useReveal";
import { exportToCsv } from "../utils/exportCsv";

const selectStyle = {
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  background: colors.card,
  color: colors.ink,
  padding: "8px 12px",
  fontSize: 13,
  minWidth: 140,
};

const distribution = [
  { key: "HIGH", label: "High risk", tone: "high" },
  { key: "MEDIUM", label: "Medium risk", tone: "medium" },
  { key: "LOW", label: "Low risk", tone: "low" },
];

export default function RiskAnalysisPage({ students, summary, summaryLoading, summaryError, loading, error, onRetry, onSelectStudent, session, scope }) {
  const [level, setLevel] = useState("HIGH");
  const [programme, setProgramme] = useState("");
  const [semester, setSemester] = useState("");
  const [module, setModule] = useState("");
  const [query, setQuery] = useState("");
  const [minRiskScore, setMinRiskScore] = useState(0);
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'cards'

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
      const matchesScore = (student.riskScore ?? 0) >= minRiskScore;
      const matchesQuery = !normalizedQuery
        || student.name?.toLowerCase().includes(normalizedQuery)
        || student.id?.toLowerCase().includes(normalizedQuery);
      return matchesLevel && matchesProgramme && matchesSemester && matchesModule && matchesScore && matchesQuery;
    });
  }, [students, level, programme, semester, module, minRiskScore, query]);

  const handleClearFilters = () => {
    setLevel("");
    setProgramme("");
    setSemester("");
    setModule("");
    setQuery("");
    setMinRiskScore(0);
  };

  return (
    <div className="page-transition" style={{ padding: "30px 36px 40px", flex: 1, minWidth: 0 }}>
      <header data-page-section="risk" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600, marginBottom: 7 }}>
            Academic Intelligence
          </div>
          <h1 style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink, margin: 0 }}>
            {session?.role === "student" ? "My risk profile" : session?.role === "teacher" ? "Student risk — my modules" : "Risk analysis"}
          </h1>
          <p style={{ fontSize: 14, color: colors.textMuted, margin: "4px 0 0" }}>
            {session?.role === "student"
              ? "Your attendance and performance signals, explained."
              : session?.role === "teacher"
                ? "Students in modules you teach, ranked by academic risk."
                : "Focus attention on students whose academic signals need review."}
          </p>
          {scope?.kind === "teacher" && scope.matched && (
            <div style={{ marginTop: 10, display: "inline-block", padding: "6px 12px", background: "#E7F4ED", color: "#1E5738", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
              Modules: {scope.modules.join(", ")}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, background: colors.card, border: `1px solid ${colors.border}`, padding: 4, borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            style={{
              border: "none",
              background: viewMode === "table" ? colors.ink : "transparent",
              color: viewMode === "table" ? "#FFF" : colors.textMuted,
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📋 Table View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            style={{
              border: "none",
              background: viewMode === "cards" ? colors.ink : "transparent",
              color: viewMode === "cards" ? "#FFF" : colors.textMuted,
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🎴 Card Grid
          </button>
        </div>
      </header>

      <Reveal style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <SummaryCard label="Total students" value={summaryLoading ? "-" : counts.total} tone="neutral" />
        <SummaryCard label="High risk" value={summaryLoading ? "-" : counts.high} tone="high" />
        <SummaryCard label="Medium risk" value={summaryLoading ? "-" : counts.medium} tone="medium" />
        <SummaryCard label="Low risk" value={summaryLoading ? "-" : counts.low} tone="low" />
      </Reveal>

      <Reveal delay={60} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 22, marginBottom: 22 }}>
        <h2 style={{ fontSize: 16, color: colors.ink, margin: "0 0 18px" }}>Risk distribution</h2>
        <div style={{ display: "grid", gap: 14 }}>
          {distribution.map((item) => {
            const value = counts[item.key === "HIGH" ? "high" : item.key === "MEDIUM" ? "medium" : "low"];
            const percentage = counts.total ? (value / counts.total) * 100 : 0;
            return (
              <div key={item.key} style={{ display: "grid", gridTemplateColumns: "105px 1fr 42px", alignItems: "center", gap: 12 }}>
                <div style={{ color: colors.textBody, fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                <div style={{ height: 9, background: colors.borderLight, borderRadius: 5, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${percentage}%`,
                      height: "100%",
                      background: colors[item.tone].dot,
                      borderRadius: 5,
                      transition: "width 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  />
                </div>
                <div style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted, textAlign: "right" }}>{value}</div>
              </div>
            );
          })}
        </div>
      </Reveal>

      {summaryError && (
        <div style={{ padding: 16, marginBottom: 18, background: "#FDF2F2", border: "1px solid #F87171", borderRadius: 10, color: "#991B1B", fontSize: 13 }}>
          Risk summary unavailable: {summaryError}
        </div>
      )}

      {/* Filter Controls Bar */}
      <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, color: colors.ink, margin: 0 }}>Filter Candidates</h2>
            <p style={{ fontSize: 13, color: colors.textMuted, margin: "2px 0 0" }}>{filteredStudents.length} student records matching active filters</p>
          </div>
          <SearchBox value={query} onChange={setQuery} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
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

          {/* Risk Score Range Slider */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: colors.page, padding: "6px 12px", borderRadius: 8, border: `1px solid ${colors.borderLight}` }}>
            <span style={{ fontSize: 12, color: colors.textMuted, whiteSpace: "nowrap" }}>Min Risk Score: <strong>{minRiskScore}</strong></span>
            <input
              type="range"
              min="0"
              max="100"
              value={minRiskScore}
              onChange={(e) => setMinRiskScore(Number(e.target.value))}
              style={{ width: 100, accentColor: colors.ink }}
            />
          </div>

          <button
            type="button"
            onClick={handleClearFilters}
            style={{ border: "none", background: "none", color: colors.low.text, fontSize: 13, fontWeight: 600, cursor: "pointer", marginLeft: "auto" }}
          >
            Clear filters
          </button>
        </div>
      </section>

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
          viewMode === "table" ? (
            <StudentTable students={filteredStudents} onSelectStudent={onSelectStudent} showReasons />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {filteredStudents.map((s, index) => (
                <div
                  key={s.id}
                  onClick={() => onSelectStudent && onSelectStudent(s.id)}
                  className="elevate-card"
                  style={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: 18,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justify: "space-between",
                    animation: "fadeInUp 0.4s ease both",
                    animationDelay: `${Math.min(index * 40, 400)}ms`,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <h3 style={{ fontSize: 16, color: colors.ink, margin: 0, fontWeight: 700 }}>{s.name}</h3>
                        <div style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{s.id}</div>
                      </div>
                      <RiskBadge level={s.riskLevel} />
                    </div>

                    <div style={{ fontSize: 13, color: colors.textBody, marginBottom: 12 }}>
                      <div><strong>Prog:</strong> {s.programme} ({s.semester})</div>
                      <div><strong>Module:</strong> {s.module}</div>
                    </div>
                  </div>

                  <div style={{ paddingTop: 12, borderTop: `1px solid ${colors.borderLight}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: colors.textMuted }}>Attendance:</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: colors.ink }}>{s.attendance}%</span>
                    </div>
                    <AttendanceBar value={s.attendance} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 12 }}>
                      <span style={{ color: colors.textMuted }}>Risk Score:</span>
                      <strong style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.ink }}>{s.riskScore}/100</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 32, textAlign: "center", color: colors.textMuted }}>
            No students match the selected risk filters.
          </div>
        )
      )}
    </div>
  );
}
