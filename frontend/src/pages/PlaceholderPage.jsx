import React from "react";
import { fonts, colors } from "../theme";

// Reused for future sections such as Exam Seating until each
// gets its own real page. Delete this once all pages are built.
export default function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: "26px 32px", flex: 1 }}>
      <h1 style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, margin: 0 }}>{title}</h1>
      <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>
        This section isn't built yet — wire it up the same way as DashboardPage.jsx.
      </p>
    </div>
  );
}
