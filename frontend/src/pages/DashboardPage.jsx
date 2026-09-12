import React, { useState, useMemo } from "react";
import { fonts, colors } from "../theme";
import SummaryCard from "../components/SummaryCard";
import SearchBox from "../components/SearchBox";
import StudentTable from "../components/StudentTable";

export default function DashboardPage({ students }) {
  const [query, setQuery] = useState("");

  // Count students in each risk bucket for the summary cards.
  const counts = useMemo(() => {
    return students.reduce(
      (acc, s) => {
        acc.total += 1;
        if (s.riskLevel === "HIGH") acc.high += 1;
        if (s.riskLevel === "MEDIUM") acc.medium += 1;
        if (s.riskLevel === "LOW") acc.low += 1;
        return acc;
      },
      { total: 0, high: 0, medium: 0, low: 0 }
    );
  }, [students]);

  // Filter by name or student ID, case-insensitive.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [students, query]);

  return (
    <div style={{ padding: "26px 32px", flex: 1, minWidth: 0 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: "4px 0 0" }}>
          Academic risk overview across all enrolled students.
        </p>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <SummaryCard label="Total students" value={counts.total} tone="neutral" />
        <SummaryCard label="High risk" value={counts.high} tone="high" />
        <SummaryCard label="Medium risk" value={counts.medium} tone="medium" />
        <SummaryCard label="Low risk" value={counts.low} tone="low" />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.ink, margin: 0 }}>Student risk register</h2>
        <SearchBox value={query} onChange={setQuery} />
      </div>

      <StudentTable students={filtered} />
    </div>
  );
}
