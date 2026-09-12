import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import { MOCK_STUDENTS } from "./data/mockStudents";
import "./index.css";

// Simple state-based "routing" — no react-router needed for a
// hackathon build. Swap this for react-router later if the project
// grows past four pages.
export default function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F5F6FA" }}>
      <Sidebar active={page} onSelect={setPage} />

      {page === "dashboard" && <DashboardPage students={MOCK_STUDENTS} />}
      {page === "students" && <PlaceholderPage title="Students" />}
      {page === "risk" && <PlaceholderPage title="Risk Analysis" />}
      {page === "seating" && <PlaceholderPage title="Exam Seating" />}
    </div>
  );
}
