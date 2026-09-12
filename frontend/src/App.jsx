import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import RiskAnalysisPage from "./pages/RiskAnalysisPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import { fetchAllStudents, fetchHealth, fetchRiskResults, fetchRiskSummary } from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setSummaryLoading(true);
    setSummaryError(null);
    setHealthLoading(true);

    const [riskResult, studentResult, summaryResult, healthResult] = await Promise.allSettled([
      fetchRiskResults(),
      fetchAllStudents(),
      fetchRiskSummary(),
      fetchHealth(),
    ]);

    if (riskResult.status === "fulfilled") {
      const semesterById = studentResult.status === "fulfilled"
        ? new Map(studentResult.value.map((student) => [student.id, student.semester]))
        : new Map();
      const studentsById = studentResult.status === "fulfilled"
        ? new Map(studentResult.value.map((student) => [student.id, student]))
        : new Map();
      setStudents(riskResult.value.map((student) => ({
        ...studentsById.get(student.id),
        ...student,
        semester: semesterById.get(student.id) ?? student.semester,
      })));
    } else {
      setStudents([]);
      setError(riskResult.reason.message || "Unable to load student risk records.");
    }

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value);
    } else {
      setSummary(null);
      setSummaryError(summaryResult.reason.message || "Unable to load risk summary.");
    }

    if (healthResult.status === "fulfilled") {
      setHealth(healthResult.value);
    } else {
      setHealth(null);
    }

    setLoading(false);
    setSummaryLoading(false);
    setHealthLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectStudent = (id) => {
    setSelectedStudentId(id);
  };

  const handleBackToDashboard = () => {
    setSelectedStudentId(null);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F5F8" }}>
      <Sidebar active={activeTab} onSelect={(key) => { setActiveTab(key); setSelectedStudentId(null); }} />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {selectedStudentId ? (
          <StudentDetailPage 
            studentId={selectedStudentId} 
            onBack={handleBackToDashboard} 
          />
        ) : activeTab === "dashboard" ? (
          <DashboardPage 
            students={students}
            summary={summary}
            summaryLoading={summaryLoading}
            summaryError={summaryError}
            health={health}
            healthLoading={healthLoading}
            loading={loading} 
            error={error} 
            onRetry={loadData}
            onNavigate={setActiveTab}
            onSelectStudent={handleSelectStudent}
          />
        ) : activeTab === "risk" ? (
          <RiskAnalysisPage
            students={students}
            summary={summary}
            summaryLoading={summaryLoading}
            summaryError={summaryError}
            loading={loading}
            error={error}
            onRetry={loadData}
            onSelectStudent={handleSelectStudent}
          />
        ) : (
          <PlaceholderPage title="Exam Seating" />
        )}
      </main>
    </div>
  );
}