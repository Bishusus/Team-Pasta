import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import RiskAnalysisPage from "./pages/RiskAnalysisPage";
import TimetablePage from "./pages/TimetablePage";
import ExamSeatingPage from "./pages/ExamSeatingPage";
import BookingPage from "./pages/BookingPage";
import LoginPage from "./pages/LoginPage";
import BackToTop from "./components/BackToTop";
import { fetchHealth, fetchRiskResults, fetchTimetable } from "./services/api";
import { loadSession, clearSession } from "./auth";
import { navForRole, canView } from "./roles";
import { buildScope, scopeStudents, scopeTimetable, scopeExams } from "./scope";

export default function App() {
  // Demo auth: session lives in sessionStorage only. Until a valid role
  // session exists, the whole app is replaced by the sign-in gate.
  const [session, setSession] = useState(() => loadSession());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [students, setStudents] = useState([]);
  const [timetableEntries, setTimetableEntries] = useState([]);
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

    const [riskResult, healthResult, timetableResult] = await Promise.allSettled([
      fetchRiskResults(),
      fetchHealth(),
      fetchTimetable(),
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

    if (timetableResult.status === "fulfilled") {
      setTimetableEntries(Array.isArray(timetableResult.value) ? timetableResult.value : []);
    } else {
      setTimetableEntries([]);
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

  const handleSignOut = () => {
    clearSession();
    setSession(null);
    setSelectedStudentId(null);
    setActiveTab("dashboard");
  };

  // Row-level scope for the signed-in user (teacher→their modules,
  // student→their own records, admin→everything).
  const scope = React.useMemo(
    () => buildScope(session || { role: "admin", username: "" }, students, timetableEntries),
    [session, students, timetableEntries]
  );
  const scopedStudents = React.useMemo(() => scopeStudents(scope, students), [scope, students]);
  const scopedTimetable = React.useMemo(() => scopeTimetable(scope, timetableEntries), [scope, timetableEntries]);
  const scopedSummary = React.useMemo(() => ({
    total_students: scopedStudents.length,
    high_risk: scopedStudents.filter((student) => student.riskLevel === "HIGH").length,
    medium_risk: scopedStudents.filter((student) => student.riskLevel === "MEDIUM").length,
    low_risk: scopedStudents.filter((student) => student.riskLevel === "LOW").length,
  }), [scopedStudents]);

  // Return to the top of the page whenever the view changes, so a new
  // tab always starts from its header instead of a mid-scroll position.
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab, selectedStudentId]);

  // Keep the active tab within the role's allowed pages.
  React.useEffect(() => {
    if (session && !canView(session.role, activeTab)) {
      setActiveTab("dashboard");
    }
  }, [session, activeTab]);

  if (!session) {
    return <LoginPage onSignIn={setSession} />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F5F8" }}>
      <Sidebar
        active={activeTab}
        session={session}
        scope={scope}
        onSignOut={handleSignOut}
        onSelect={(key) => { setActiveTab(key); setSelectedStudentId(null); }}
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div key={selectedStudentId ? `student-${selectedStudentId}` : activeTab} className="page-transition" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {selectedStudentId ? (
          <StudentDetailPage 
            studentId={selectedStudentId} 
            onBack={handleBackToDashboard} 
          />
        ) : activeTab === "dashboard" ? (
          <DashboardPage 
            students={scopedStudents}
            summary={scopedSummary}
            summaryLoading={summaryLoading}
            summaryError={summaryError}
            health={health}
            healthLoading={healthLoading}
            loading={loading} 
            error={error} 
            onRetry={loadData}
            onNavigate={setActiveTab}
            onSelectStudent={handleSelectStudent}
            session={session}
          />
        ) : activeTab === "risk" ? (
          <RiskAnalysisPage
            students={scopedStudents}
            summary={scopedSummary}
            summaryLoading={summaryLoading}
            summaryError={summaryError}
            loading={loading}
            error={error}
            onRetry={loadData}
            onSelectStudent={handleSelectStudent}
            session={session}
            scope={scope}
          />
        ) : activeTab === "timetable" ? (
          <TimetablePage scopedEntries={scopedTimetable} scope={scope} />
        ) : activeTab === "booking" ? (
          <BookingPage session={session} />
        ) : (
          <ExamSeatingPage onSelectStudent={handleSelectStudent} scope={scope} session={session} />
        )}
        </div>
      </main>
      <BackToTop />
    </div>
  );
}