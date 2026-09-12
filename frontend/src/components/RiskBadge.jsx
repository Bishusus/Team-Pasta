import React from "react";
import { colors } from "../theme";

// Small colored dot + label. `level` must be "HIGH" | "MEDIUM" | "LOW".
export default function RiskBadge({ level }) {
  const style = { HIGH: colors.high, MEDIUM: colors.medium, LOW: colors.low }[level];

  if (!style) return null; // guards against unexpected data

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px 3px 8px",
        borderRadius: 999,
        background: style.bg,
        color: style.text,
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: style.dot }} />
      {level.charAt(0) + level.slice(1).toLowerCase()}
    </span>
  );
}
