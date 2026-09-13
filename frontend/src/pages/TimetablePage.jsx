import React, { useEffect, useState } from "react";
import { colors, fonts } from "../theme";
import { fetchTimetable } from "../services/api";

const panelStyle = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: 22,
};

const dayOrder = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5 };

function timeValue(timeSlot) {
  const startTime = timeSlot?.split(" - ")[0];
  const parsed = Date.parse(`01/01/2000 ${startTime}`);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export default function TimetablePage({ scopedEntries, scope }) {
  // Entries come pre-scoped from App (teacher → their classes,
  // student → their modules/cohort, admin → everything).
  const entries = Array.isArray(scopedEntries) ? scopedEntries : [];
  const [filters, setFilters] = useState({ day: "", module: "", group: "", lecturer: "" });
  const loading = false;
  const error = null;

  const scopeNote =
    scope?.kind === "teacher"
      ? scope.matched
        ? "Showing only the classes you teach."
        : "Sign in with a username matching a lecturer name (e.g. \"rabin adhikari\") to see your classes."
      : scope?.kind === "student"
        ? scope.matched
          ? "Showing classes for your modules and cohort."
          : "Sign in with your full name as recorded by the college to see your classes."
        : null;

  const options = {
    day: [...new Set(entries.map((entry) => entry.day))].sort((a, b) => (dayOrder[a] ?? 99) - (dayOrder[b] ?? 99)),
    module: [...new Set(entries.map((entry) => entry.module_code))].sort(),
    group: [...new Set(entries.map((entry) => entry.group))].sort(),
    lecturer: [...new Set(entries.map((entry) => entry.lecturer))].sort(),
  };
  const filteredEntries = entries.filter((entry) => (
    (!filters.day || entry.day === filters.day)
    && (!filters.module || entry.module_code === filters.module)
    && (!filters.group || entry.group === filters.group)
    && (!filters.lecturer || entry.lecturer === filters.lecturer)
  )).sort((a, b) => {
    const dayDifference = (dayOrder[a.day] ?? 99) - (dayOrder[b.day] ?? 99);
    return dayDifference || timeValue(a.time_slot) - timeValue(b.time_slot) || a.room.localeCompare(b.room);
  });
  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
  };
  const selectStyle = {
    minWidth: 0,
    padding: "8px 10px",
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    background: colors.card,
    color: colors.textBody,
    fontSize: 13,
  };

  return (
    <div className="page-transition" style={{ padding: "30px 36px 40px", flex: 1, minWidth: 0 }}>
      <header data-page-section="timetable" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600, marginBottom: 7 }}>
          Islington College · Academic Intelligence
        </div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, margin: 0 }}>
          Timetable
        </h1>
        <p style={{ fontSize: 15, color: colors.textMuted, margin: "5px 0 0" }}>
          {scope?.kind === "teacher"
            ? "Your teaching schedule across the week."
            : scope?.kind === "student"
              ? "Classes for your modules and cohort."
              : "Classes, rooms, modules, and lecturers across the academic schedule."}
        </p>
        {scopeNote && (
          <div style={{ marginTop: 10, display: "inline-block", padding: "6px 12px", background: scope.matched === false ? "#FBF2E3" : "#E7F4ED", color: scope.matched === false ? "#7A5218" : "#1E5738", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
            {scopeNote}
          </div>
        )}
      </header>

      <section style={panelStyle}>
        {loading ? (
          <p style={{ color: colors.textMuted, margin: 0 }}>Loading timetable...</p>
        ) : error ? (
          <div style={{ color: "#991B1B" }}>
            <strong>We couldn’t load the timetable.</strong>
            <p style={{ margin: "6px 0 12px", fontSize: 13 }}>{error}</p>
            <button onClick={loadTimetable} style={{ border: "none", borderRadius: 6, padding: "7px 13px", background: "#991B1B", color: "#FFF", cursor: "pointer" }}>
              Try again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <p style={{ color: colors.textMuted, margin: 0 }}>No timetable entries available.</p>
        ) : (
          <>
            <div style={{ padding: 14, marginBottom: 18, background: colors.page, border: `1px solid ${colors.borderLight}`, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span style={{ color: colors.ink, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Filter schedule</span>
                <span style={{ color: colors.textMuted, fontSize: 12 }}>Sunday to Friday</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              {              [
                ["day", "All days", options.day],
                ["module", "All modules", options.module],
                ...(scope?.kind === "admin" ? [["group", "All groups", options.group]] : []),
                ...(scope?.kind === "admin" ? [["lecturer", "All lecturers", options.lecturer]] : []),
              ].map(([name, placeholder, values]) => (
                <select key={name} value={filters[name]} onChange={(event) => updateFilter(name, event.target.value)} style={selectStyle} aria-label={placeholder}>
                  <option value="">{placeholder}</option>
                  {values.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              ))}
              <button type="button" onClick={() => setFilters({ day: "", module: "", group: "", lecturer: "" })} style={{ border: "none", background: "none", color: colors.low.text, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                Clear filters
              </button>
              </div>
            </div>
            <div style={{ marginBottom: 12, color: colors.textMuted, fontSize: 12 }}>
              Showing {filteredEntries.length} of {entries.length} timetable entries
            </div>
            {filteredEntries.length === 0 ? (
              <p style={{ padding: "18px 0 0", borderTop: `1px solid ${colors.borderLight}`, color: colors.textMuted, fontSize: 13 }}>No timetable entries match these filters.</p>
            ) : <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr>
                  {["Day", "Time", "Module", "Class", "Group / Cohort", "Lecturer", "Room"].map((heading) => (
                    <th key={heading} style={{ padding: "0 12px 12px 0", textAlign: "left", color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, borderBottom: `1px solid ${colors.borderLight}` }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, index) => (
                  <tr key={entry.id} style={{ background: index % 2 ? colors.page : colors.card }}>
                    <td style={{ padding: "13px 12px 13px 0", color: colors.ink, fontSize: 12, fontWeight: 700, borderBottom: `1px solid ${colors.borderLight}` }}>{entry.day}</td>
                    <td style={{ padding: "13px 12px 13px 0", color: colors.textBody, fontSize: 13, borderBottom: `1px solid ${colors.borderLight}` }}>{entry.time_slot}</td>
                    <td style={{ padding: "13px 12px 13px 0", borderBottom: `1px solid ${colors.borderLight}` }}><div style={{ color: colors.ink, fontSize: 13, fontWeight: 600 }}>{entry.module_code}</div><div style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>{entry.module_title}</div></td>
                    <td style={{ padding: "13px 12px 13px 0", color: colors.textBody, fontSize: 13, borderBottom: `1px solid ${colors.borderLight}` }}>{entry.class_type}</td>
                    <td style={{ padding: "13px 12px 13px 0", color: colors.textBody, fontSize: 13, borderBottom: `1px solid ${colors.borderLight}` }}>{entry.group} · {entry.section_cohort}</td>
                    <td style={{ padding: "13px 12px 13px 0", color: colors.textBody, fontSize: 13, borderBottom: `1px solid ${colors.borderLight}` }}>{entry.lecturer}</td>
                    <td style={{ padding: "13px 0 13px 0", color: colors.textBody, fontSize: 13, borderBottom: `1px solid ${colors.borderLight}` }}>{entry.room}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>}
          </>
        )}
      </section>
    </div>
  );
}
