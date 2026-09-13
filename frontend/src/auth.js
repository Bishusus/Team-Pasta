// Frontend-only authentication for demo purposes.
// No database, no hashing, no server round-trip: each role shares one
// universal password, and users are differentiated only by their username.
// The session lives in sessionStorage so a new tab always starts signed out.

const SESSION_KEY = "rte.session";

export const ROLES = [
  { key: "student", label: "Student", icon: "🎓", usernameHint: "Any username", password: "student123" },
  { key: "teacher", label: "Teacher", icon: "👨‍🏫", usernameHint: "Any username", password: "teacher123" },
  { key: "admin", label: "Administrator", icon: "🛡️", usernameHint: "Username: admin", password: "admin123" },
];

export function roleByKey(key) {
  return ROLES.find((role) => role.key === key) || null;
}

/**
 * Validates credentials for the selected role.
 * Returns { ok: true, session } or { ok: false, error }.
 * The session object is plain data — nothing is stored server-side.
 */
export function authenticate(roleKey, username, password) {
  const role = roleByKey(roleKey);
  if (!role) return { ok: false, error: "Select a role before signing in." };

  const cleanUsername = (username || "").trim();
  if (!cleanUsername) {
    return { ok: false, error: "Enter your username to continue." };
  }
  if (role.key === "admin" && cleanUsername.toLowerCase() !== "admin") {
    return { ok: false, error: "The administrator signs in with the username \"admin\"." };
  }
  if ((password || "") !== role.password) {
    return { ok: false, error: `Incorrect password for the ${role.label.toLowerCase()} role.` };
  }

  return {
    ok: true,
    session: {
      role: role.key,
      roleLabel: role.label,
      username: cleanUsername,
      signedInAt: new Date().toISOString(),
    },
  };
}

export function saveSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable (private mode) — session just won't persist */
  }
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Discard malformed or stale entries.
    if (!session || !roleByKey(session.role) || !session.username) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
