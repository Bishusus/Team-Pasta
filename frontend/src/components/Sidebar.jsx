import React, { useEffect, useState } from "react";
import { colors, fonts } from "../theme";
import useScrollProgress from "../hooks/useScrollProgress";
import { navForRole } from "../roles";

export default function Sidebar({ active, onSelect, session, onSignOut, scope }) {
  const progress = useScrollProgress();

  // Scroll-spy: when scrolling a long page, keep the active nav item in
  // sync with whichever page section heading is currently in view.
  const [spiedTab, setSpiedTab] = useState(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const headings = Array.from(document.querySelectorAll("[data-page-section]"));
    if (!headings.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setSpiedTab(visible.target.getAttribute("data-page-section"));
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [active]);

  const highlighted = spiedTab || active;

  return (
    <aside
      className="sidebar"
      style={{
        width: 235,
        flexShrink: 0,
        alignSelf: "flex-start",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        background: "linear-gradient(180deg, #111827 0%, #0F172A 100%)",
        color: "#94A3B8",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "24px 16px",
        boxShadow: "4px 0 24px rgba(0, 0, 0, 0.12)",
      }}
    >
      <div>
        <div style={{ padding: "0 8px 22px", borderBottom: "1px solid #1E293B", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 15,
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)",
              }}
            >
              I
            </div>
            <div>
              <div style={{ fontFamily: fonts.display, fontSize: 16, color: "#F8FAFC", lineHeight: 1.1, fontWeight: 700 }}>
                ISLINGTON
              </div>
              <div style={{ fontSize: 10, color: "#64748B", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>
                COLLEGE
              </div>
            </div>
          </div>
          <div style={{ color: "#64748B", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600 }}>
            Academic Intelligence v2.0
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }} aria-label="Main navigation">
          {navForRole(session.role).map((item) => {
            const isActive = item.key === highlighted;
            return (
              <button
                key={item.key}
                onClick={() => onSelect(item.key)}
                aria-current={item.key === active ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: isActive ? "rgba(99, 102, 241, 0.15)" : "transparent",
                  color: isActive ? "#F8FAFC" : "#94A3B8",
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.25s ease, color 0.25s ease, transform 0.15s ease, box-shadow 0.25s ease",
                  borderLeft: isActive ? "3px solid #6366F1" : "3px solid transparent",
                  boxShadow: isActive ? "0 4px 12px rgba(99, 102, 241, 0.1)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "rgba(148, 163, 184, 0.08)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    display: "inline-block",
                    transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transform: isActive ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ padding: "14px 12px", background: "#1E293B", borderRadius: 8, fontSize: 11, color: "#94A3B8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981" }} />
          <strong style={{ color: "#F8FAFC" }}>System Live</strong>
        </div>
        <div>FastAPI & Supabase Connected</div>
        {session && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(148, 163, 184, 0.2)" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#F8FAFC", fontWeight: 700, fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {session.username}
              </div>
              <div style={{ color: "#64748B", fontSize: 10, marginTop: 1 }}>
                {session.roleLabel}
                {scope && scope.kind === "teacher" && scope.modules.length > 0 && (
                  <span> · {scope.modules.length} module{scope.modules.length === 1 ? "" : "s"}</span>
                )}
                {scope && scope.kind === "student" && scope.record && (
                  <span> · {scope.record.module}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              title="Sign out"
              style={{
                border: "1px solid rgba(148, 163, 184, 0.35)",
                borderRadius: 6,
                background: "transparent",
                color: "#94A3B8",
                fontSize: 10.5,
                fontWeight: 700,
                padding: "4px 8px",
                cursor: "pointer",
                transition: "color 0.2s ease, border-color 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#F8FAFC"; e.currentTarget.style.borderColor = "#F8FAFC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.35)"; }}
            >
              Sign out
            </button>
          </div>
        )}
        {/* Reading progress: fills as the user scrolls the main content */}
        <div
          style={{ marginTop: 10, height: 3, borderRadius: 2, background: "rgba(148, 163, 184, 0.18)", overflow: "hidden" }}
          role="progressbar"
          aria-label="Page scroll progress"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(progress * 100)}%`,
              borderRadius: 2,
              background: "linear-gradient(90deg, #6366F1, #8B5CF6)",
              transition: "width 0.1s linear",
            }}
          />
        </div>
      </div>
    </aside>
  );
}
