import React, { useState } from "react";
import { colors, fonts } from "../theme";
import { login } from "../services/api";

export default function LoginPage({ onLogin, onCancel }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      onLogin(await login(username, password));
    } catch (reason) {
      setError(reason.message || "Admin login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: colors.page, padding: 24 }}>
      <form onSubmit={submit} style={{ width: "min(100%, 390px)", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 28, boxShadow: "0 18px 45px rgba(20, 33, 61, .10)" }}>
        <div style={{ color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 8 }}>RTE Islington College</div>
        <h1 style={{ fontFamily: fonts.display, color: colors.ink, fontSize: 28, margin: "0 0 6px" }}>Sign in</h1>
        <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 22px" }}>Use your college account to open your role-specific dashboard.</p>
        <label style={{ display: "grid", gap: 6, color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>Username<input required value={username} onChange={(event) => setUsername(event.target.value)} style={{ padding: 10, border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14 }} /></label>
        <label style={{ display: "grid", gap: 6, color: colors.textMuted, fontSize: 12, marginBottom: 16 }}>Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} style={{ padding: 10, border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 14 }} /></label>
        {error && <p style={{ color: colors.high.text, fontSize: 13, margin: "0 0 14px" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: "100%", border: 0, borderRadius: 6, padding: 11, background: colors.ink, color: "#FFF", fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
    </main>
  );
}
