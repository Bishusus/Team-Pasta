import React from "react";
import { fonts } from "../theme";

// Thin bar showing attendance %, colored to give an at-a-glance signal.
export default function AttendanceBar({ value }) {
  const color = value < 65 ? "#C4432B" : value < 80 ? "#B8802A" : "#2E7D53";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 90 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "#EDEFF4", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color }} />
      </div>
      <span style={{ fontFamily: fonts.mono, fontSize: 12.5, color: "#40445A", width: 32 }}>{value}%</span>
    </div>
  );
}
