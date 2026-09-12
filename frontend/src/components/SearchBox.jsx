import React from "react";
import { colors } from "../theme";

// Controlled text input. Parent owns the value so it can filter the
// student list on every keystroke.
export default function SearchBox({ value, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: "9px 12px",
        maxWidth: 320,
        width: "100%",
      }}
    >
      <span aria-hidden="true" style={{ color: "#8C90A0", fontSize: 14 }}>
        🔍
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name or student ID"
        style={{
          border: "none",
          outline: "none",
          fontSize: 14,
          width: "100%",
          background: "transparent",
          color: colors.ink,
        }}
      />
    </div>
  );
}
