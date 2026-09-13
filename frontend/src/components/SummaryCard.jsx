import React, { useEffect, useState } from "react";
import { colors, fonts } from "../theme";
import useCountUp from "../hooks/useCountUp";

// One summary number, e.g. "Total students: 12".
// `tone` picks the accent color: "neutral" | "high" | "medium" | "low"
// The number counts up when it loads, and the card lifts on hover.
export default function SummaryCard({ label, value, tone = "neutral" }) {
  const toneColor = {
    neutral: colors.ink,
    high: colors.high.dot,
    medium: colors.medium.dot,
    low: colors.low.dot,
  }[tone];

  const [hovered, setHovered] = useState(false);
  const animated = useCountUp(value);

  // Keep the glow accent in sync with the theme, defined once here.
  const [accent, setAccent] = useState(toneColor);
  useEffect(() => setAccent(toneColor), [toneColor]);

  const isNumber = typeof value === "number";

  return (
    <div
      className="elevate-card summary-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: colors.card,
        border: `1px solid ${hovered ? accent : colors.border}`,
        borderRadius: 10,
        padding: "18px 20px",
        flex: "1 1 180px",
        minWidth: 160,
        position: "relative",
        overflow: "hidden",
        boxShadow: hovered ? "0 12px 28px -6px rgba(15, 23, 42, 0.12)" : "var(--card-shadow)",
        transition: "border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease",
        transform: hovered ? "translateY(-3px)" : "none",
      }}
    >
      {/* Tone accent bar that expands on hover */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: accent,
          opacity: hovered ? 1 : 0.35,
          transform: hovered ? "scaleY(1)" : "scaleY(0.55)",
          transformOrigin: "top",
          transition: "opacity 0.25s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>{label}</div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 30,
          fontWeight: 600,
          color: toneColor,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {isNumber ? animated : value}
      </div>
      {/* Soft radial glow behind the number, revealed on hover */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: -28,
          bottom: -28,
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
