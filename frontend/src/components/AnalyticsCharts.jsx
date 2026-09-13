import React, { useEffect, useState } from "react";
import { colors, fonts } from "../theme";
import useCountUp from "../hooks/useCountUp";

function prefersReducedMotion() {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function AnalyticsCharts({ summary, students }) {
  const high = summary?.high_risk ?? 0;
  const medium = summary?.medium_risk ?? 0;
  const low = summary?.low_risk ?? 0;
  const total = (summary?.total_students || students?.length) ?? 0;

  // Donut arcs draw themselves in sequence after mount.
  const [drawn, setDrawn] = useState(prefersReducedMotion());
  useEffect(() => {
    if (drawn) return undefined;
    const timer = setTimeout(() => setDrawn(true), 120);
    return () => clearTimeout(timer);
  }, [drawn]);

  const animatedTotal = useCountUp(total);

  // Compute SVG Donut Chart angles
  const highPct = total ? high / total : 0;
  const mediumPct = total ? medium / total : 0;
  const lowPct = total ? low / total : 0;

  const circumference = 2 * Math.PI * 40;
  const highDash = highPct * circumference;
  const mediumDash = mediumPct * circumference;
  const lowDash = lowPct * circumference;

  const highOffset = 0;
  const mediumOffset = -highDash;
  const lowOffset = -(highDash + mediumDash);

  const arcStyle = (dash, delay) => ({
    strokeDasharray: drawn ? `${dash} ${circumference}` : `0 ${circumference}`,
    transition: `stroke-dasharray 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
  });

  // Group module breakdown
  const moduleCounts = {};
  if (students && students.length) {
    students.forEach((s) => {
      const mod = s.module || "General";
      if (!moduleCounts[mod]) moduleCounts[mod] = { total: 0, high: 0 };
      moduleCounts[mod].total += 1;
      if (s.riskLevel === "HIGH") moduleCounts[mod].high += 1;
    });
  }

  const topModules = Object.entries(moduleCounts)
    .sort((a, b) => b[1].high - a[1].high)
    .slice(0, 4);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
      {/* SVG Donut Chart */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20 }}>
        <h3 style={{ fontSize: 15, color: colors.ink, margin: "0 0 14px", fontWeight: 700 }}>
          Risk Level Distribution
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 24, justifyContent: "center" }}>
          <div style={{ position: "relative", width: 110, height: 110 }}>
            <svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="50" cy="50" r="40" fill="transparent" stroke={colors.borderLight} strokeWidth="14" />
              {/* High Risk Arc */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={colors.high.dot}
                strokeWidth="14"
                strokeDashoffset={highOffset}
                style={arcStyle(highDash, 0)}
              />
              {/* Medium Risk Arc */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={colors.medium.dot}
                strokeWidth="14"
                strokeDashoffset={mediumOffset}
                style={arcStyle(mediumDash, 180)}
              />
              {/* Low Risk Arc */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={colors.low.dot}
                strokeWidth="14"
                strokeDashoffset={lowOffset}
                style={arcStyle(lowDash, 360)}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: 20, fontWeight: 700, color: colors.ink, fontVariantNumeric: "tabular-nums" }}>{animatedTotal}</span>
              <span style={{ fontSize: 10, color: colors.textMuted, textTransform: "uppercase" }}>Students</span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: colors.high.dot }} />
              <span style={{ color: colors.textBody }}>High ({high})</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: colors.medium.dot }} />
              <span style={{ color: colors.textBody }}>Medium ({medium})</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: colors.low.dot }} />
              <span style={{ color: colors.textBody }}>Low ({low})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Module Risk Bar Breakdown */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20 }}>
        <h3 style={{ fontSize: 15, color: colors.ink, margin: "0 0 14px", fontWeight: 700 }}>
          High Risk Candidates by Module
        </h3>
        <div style={{ display: "grid", gap: 10 }}>
          {topModules.length ? (
            topModules.map(([mod, stats]) => {
              const pct = stats.total ? (stats.high / stats.total) * 100 : 0;
              return (
                <div key={mod}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: colors.ink, fontWeight: 600 }}>{mod}</span>
                    <span style={{ color: colors.textMuted }}>{stats.high} / {stats.total} High Risk</span>
                  </div>
                  <div style={{ height: 6, background: colors.borderLight, borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width: drawn ? `${pct}%` : "0%",
                        height: "100%",
                        background: colors.high.dot,
                        borderRadius: 3,
                        transition: "width 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ color: colors.textMuted, fontSize: 12 }}>No module risk data available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
