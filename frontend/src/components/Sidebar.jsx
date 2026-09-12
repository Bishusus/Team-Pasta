import React from "react";
import { colors, fonts } from "../theme";

// The four sections of the app. To add a new page, add an entry here
// and a matching case in App.jsx.
export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "students", label: "Students" },
  { key: "risk", label: "Risk Analysis" },
  { key: "seating", label: "Exam Seating" },
];

export default function Sidebar({ active, onSelect }) {
  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        background: colors.ink,
        color: "#C9CEDD",
        display: "flex",
        flexDirection: "column",
        padding: "22px 14px",
      }}
    >
      <div style={{ padding: "0 10px 22px", borderBottom: "1px solid #26304F", marginBottom: 14 }}>
        <div style={{ fontFamily: fonts.display, fontSize: 18, color: "#FFFFFF", lineHeight: 1.25 }}>
          RTE Academic
          <br />
          Intelligence
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 7,
                border: "none",
                background: isActive ? "#1F2C4E" : "transparent",
                color: isActive ? "#FFFFFF" : "#C9CEDD",
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                textAlign: "left",
                borderLeft: isActive ? "3px solid #6B7CF0" : "3px solid transparent",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
