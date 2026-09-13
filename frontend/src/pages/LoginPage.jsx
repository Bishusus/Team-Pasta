import React, { useState } from "react";
import { colors, fonts } from "../theme";
import { ROLES, authenticate, saveSession } from "../auth";

// Sign-in gate for the demo. Three roles share universal passwords:
// student → student123, teacher → teacher123, admin → admin123.
// The username only personalizes the session; it is not checked
// against any data source.
export default function LoginPage({ onSignIn }) {
  const [roleKey, setRoleKey] = useState("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const role = ROLES.find((item) => item.key === roleKey);

  const submit = (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    // Small delay purely so the button's pressed state is perceivable.
    setTimeout(() => {
      const result = authenticate(roleKey, username, password);
      if (result.ok) {
        saveSession(result.session);
        onSignIn(result.session);
      } else {
        setError(result.error);
        setSubmitting(false);
      }
    }, 250);
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 12px",
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    background: colors.card,
    color: colors.textBody,
    fontSize: 14,
    fontFamily: fonts.sans,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background:
          "radial-gradient(1100px 500px at 85% -10%, rgba(99, 102, 241, 0.14), transparent 60%), radial-gradient(900px 420px at -10% 110%, rgba(16, 185, 129, 0.10), transparent 55%), #F4F5F8",
      }}
    >
      <div
        className="page-transition"
        style={{
          width: "100%",
          maxWidth: 420,
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: "30px 30px 26px",
          boxShadow: "0 24px 60px -20px rgba(15, 23, 42, 0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 18,
              boxShadow: "0 6px 16px rgba(99, 102, 241, 0.4)",
            }}
          >
            I
          </div>
          <div>
            <div style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink, fontWeight: 700, lineHeight: 1.1 }}>
              Islington College
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, marginTop: 2 }}>
              Academic Intelligence
            </div>
          </div>
        </div>

        <h1 style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, margin: "0 0 4px" }}>Sign in</h1>
        <p style={{ fontSize: 13.5, color: colors.textMuted, margin: "0 0 20px" }}>
          Choose your role and enter your username.
        </p>

        {/* Role selector */}
        <div role="radiogroup" aria-label="Sign in as" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18 }}>
          {ROLES.map((item) => {
            const active = item.key === roleKey;
            return (
              <button
                key={item.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setRoleKey(item.key);
                  setError(null);
                }}
                style={{
                  border: active ? `2px solid ${colors.ink}` : `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: "10px 6px",
                  background: active ? "#F3F5FF" : colors.card,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "border-color 0.2s ease, background 0.2s ease, transform 0.15s ease",
                  transform: active ? "translateY(-1px)" : "none",
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? colors.ink : colors.textMuted }}>
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={role && role.key === "admin" ? "admin" : "e.g. bishesh"}
              autoComplete="username"
              autoFocus
              style={{ ...inputStyle, marginTop: 5 }}
            />
          </label>
          <label style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Universal role password"
              autoComplete="current-password"
              style={{ ...inputStyle, marginTop: 5 }}
            />
          </label>

          {error && (
            <div
              className="fade-in-up"
              role="alert"
              style={{ background: colors.high.bg, color: colors.high.text, border: `1px solid ${colors.high.dot}55`, borderRadius: 8, padding: "10px 12px", fontSize: 13 }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 4,
              border: "none",
              borderRadius: 8,
              padding: "12px 14px",
              background: colors.ink,
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.7 : 1,
              transition: "opacity 0.2s ease, transform 0.15s ease",
            }}
          >
            {submitting ? "Signing in…" : `Continue as ${role ? role.label : ""}`}
          </button>
        </form>

        {/* Demo credentials — this build intentionally has no user database */}
        <div
          style={{
            marginTop: 18,
            padding: "12px 14px",
            background: colors.page,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 8,
            fontSize: 12,
            color: colors.textMuted,
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: colors.ink }}>Demo passwords</strong> (shared per role)
          <div>🎓 Students — <code style={{ fontFamily: fonts.mono }}>student123</code></div>
          <div>👨‍🏫 Teachers — <code style={{ fontFamily: fonts.mono }}>teacher123</code></div>
          <div>🛡️ Admin — username <code style={{ fontFamily: fonts.mono }}>admin</code>, password <code style={{ fontFamily: fonts.mono }}>admin123</code></div>
        </div>
      </div>
    </div>
  );
}
