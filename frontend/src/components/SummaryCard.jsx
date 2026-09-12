import React from "react";
import { colors, fonts } from "../theme";

// One summary number, e.g. "Total students: 12".
// `tone` picks the accent color: "neutral" | "high" | "medium" | "low"
export default function SummaryCard({ label, value, tone = "neutral" }) {
  const toneColor = {
    neutral: colors.ink,
    high: colors.high.dot,
    medium: colors.medium.dot,
    low: colors.low.dot,
  }[tone];

  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: "18px 20px",
        flex: "1 1 180px",
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: fonts.mono, fontSize: 30, fontWeight: 600, color: toneColor, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
