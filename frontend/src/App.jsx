import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import RiskAnalysisPage from "./pages/RiskAnalysisPage";
import TimetablePage from "./pages/TimetablePage";
import ExamSeatingPage from "./pages/ExamSeatingPage";
import BookingPage from "./pages/BookingPage";
import { fetchHealth, fetchRiskResults } from "./services/api";

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

    const [riskResult, healthResult] = await Promise.allSettled([
      fetchRiskResults(),
      fetchHealth(),
    ]);

    if (riskResult.status === "fulfilled") {
      const riskStudents = riskResult.value;
      setStudents(riskStudents);
      setSummary({
        total_students: riskStudents.length,
        high_risk: riskStudents.filter((student) => student.riskLevel === "HIGH").length,
        medium_risk: riskStudents.filter((student) => student.riskLevel === "MEDIUM").length,
        low_risk: riskStudents.filter((student) => student.riskLevel === "LOW").length,
      });
      setSummaryError(null);
    } else {
      setStudents([]);
      setError(riskResult.reason.message || "Unable to load student risk records.");
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
        ) : activeTab === "timetable" ? (
          <TimetablePage />
        ) : activeTab === "booking" ? (
          <BookingPage />
        ) : (
          <ExamSeatingPage />
        )}
      </main>
    </div>
  );
}