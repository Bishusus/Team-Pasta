// Role-based access for the demo. Every role sees a scoped subset of the app;
// scoping itself (which rows) lives in scope.js — this file decides WHICH
// pages a role can open at all.

export const ROLE_NAV = {
  admin: [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "risk", label: "Risk Analysis", icon: "⚠️" },
    { key: "timetable", label: "Timetable", icon: "📅" },
    { key: "booking", label: "Classroom Booking", icon: "🔑" },
    { key: "seating", label: "Exam Seating", icon: "🗺️" },
    { key: "admit-card", label: "Admit Cards", icon: "🎫" },
  ],
  teacher: [
    { key: "dashboard", label: "My Dashboard", icon: "📊" },
    { key: "risk", label: "Student Risk", icon: "⚠️" },
    { key: "timetable", label: "My Timetable", icon: "📅" },
    { key: "seating", label: "My Exams", icon: "🗺️" },
    { key: "admit-card", label: "Admit Cards", icon: "🎫" },
  ],
  student: [
    { key: "dashboard", label: "My Dashboard", icon: "📊" },
    { key: "timetable", label: "My Timetable", icon: "📅" },
    { key: "booking", label: "Book a Class", icon: "🔑" },
    { key: "seating", label: "My Exams", icon: "🗺️" },
    { key: "admit-card", label: "My Admit Card", icon: "🎫" },
  ],
};

export const DEFAULT_TAB = {
  admin: "dashboard",
  teacher: "dashboard",
  student: "dashboard",
};

export function navForRole(roleKey) {
  return ROLE_NAV[roleKey] || ROLE_NAV.student;
}

export function canView(roleKey, tabKey) {
  return navForRole(roleKey).some((item) => item.key === tabKey);
}
