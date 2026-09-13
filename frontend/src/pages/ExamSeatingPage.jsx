import React, { useEffect, useMemo, useState } from "react";
import { colors, fonts } from "../theme";
import SeatModal from "../components/SeatModal";
import Toast from "../components/Toast";
import { fetchExamLayout, fetchExamSchedule, generateExamSchedule } from "../services/api";
import { scopeExams, scopeLayout } from "../scope";
import { exportToCsv } from "../utils/exportCsv";

const panelStyle = { background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 22 };
const seatColors = ["#DCE7FF", "#FBE3D5", "#DDF3E6", "#F4E4FA", "#FFF0C7", "#DDF1F4"];

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function moduleColor(moduleName, modules) {
  return seatColors[Math.max(0, modules.indexOf(moduleName)) % seatColors.length];
}

export default function ExamSeatingPage({ onSelectStudent, scope, session }) {
  const [schedule, setSchedule] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [layout, setLayout] = useState(null);
  const [allLayouts, setAllLayouts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [seatFilter, setSeatFilter] = useState("all"); // 'all' | 'occupied' | 'empty'
  const [isPrintMode, setIsPrintMode] = useState(false);

  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedSeatRoom, setSelectedSeatRoom] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const exams = await fetchExamSchedule();
      setSchedule(exams);
      const nextId = selectedId && exams.some((exam) => exam.id === selectedId) ? selectedId : exams[0]?.id;
      setSelectedId(nextId ?? null);

      if (exams.length > 0) {
        const layouts = await Promise.all(
          exams.map(async (exam) => {
            try {
              const l = await fetchExamLayout(exam.id);
              return { id: exam.id, layout: l };
            } catch {
              return { id: exam.id, layout: null };
            }
          })
        );
        const map = {};
        layouts.forEach((item) => {
          if (item.layout) map[item.id] = item.layout;
        });
        setAllLayouts(map);
        if (nextId && map[nextId]) {
          setLayout(map[nextId]);
        }
      } else {
        setLayout(null);
        setAllLayouts({});
      }
    } catch (reason) {
      setError(reason.message || "Unable to load exam seating.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selectExam = async (examId) => {
    setSelectedId(examId);
    if (allLayouts[examId]) {
      setLayout(allLayouts[examId]);
    } else {
      const l = await fetchExamLayout(examId);
      setLayout(l);
      setAllLayouts((prev) => ({ ...prev, [examId]: l }));
    }
  };

  const regenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await generateExamSchedule();
      await load();
      setToastMessage("Exam schedule and seating layouts regenerated successfully!");
    } catch (reason) {
      setError(reason.message || "Unable to regenerate exam seating.");
    } finally {
      setGenerating(false);
    }
  };

  const visibleSchedule = useMemo(
    () => (scope ? scopeExams(scope, schedule) : schedule),
    [schedule, scope]
  );

  const visibleLayout = useMemo(
    () => (scope ? scopeLayout(scope, layout) : layout),
    [layout, scope]
  );

  const modules = useMemo(() => [...new Set(visibleLayout?.rooms.flatMap((room) => room.assignments.map((seat) => seat.module_name)) ?? [])].sort(), [visibleLayout]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    Object.values(allLayouts).forEach((examLayout) => {
      examLayout.rooms.forEach((room) => {
        room.assignments.forEach((seat) => {
          if (
            seat.student_id?.toLowerCase().includes(q) ||
            seat.student_name?.toLowerCase().includes(q)
          ) {
            results.push({
              exam: examLayout.exam,
              room,
              seat,
            });
          }
        });
      });
    });
    return results;
  }, [allLayouts, searchQuery]);

  const handleSelectSearchResult = (result) => {
    selectExam(result.exam.id);
  };

  const handleExportSeatingPlan = () => {
    if (!visibleLayout) return;
    const flatRows = visibleLayout.rooms.flatMap((room) =>
      room.assignments.map((seat) => ({
        examTitle: visibleLayout.exam.module_name,
        examDate: visibleLayout.exam.exam_date,
        startTime: visibleLayout.exam.start_time,
        invigilator: visibleLayout.exam.invigilator,
        roomName: room.name,
        seatNumber: seat.seat_number,
        row: seat.row,
        column: seat.column,
        studentId: seat.student_id,
        studentName: seat.student_name,
        moduleName: seat.module_name,
      }))
    );

    const headers = [
      { label: "Exam Title", key: "examTitle" },
      { label: "Date", key: "examDate" },
      { label: "Start Time", key: "startTime" },
      { label: "Invigilator", key: "invigilator" },
      { label: "Room", key: "roomName" },
      { label: "Seat Number", key: "seatNumber" },
      { label: "Row", key: "row" },
      { label: "Column", key: "column" },
      { label: "Student ID", key: "studentId" },
      { label: "Student Name", key: "studentName" },
      { label: "Module", key: "moduleName" },
    ];

    exportToCsv(`${visibleLayout.exam.module_name}_Seating_Plan.csv`, flatRows, headers);
    setToastMessage("Seating plan exported as CSV!");
  };

  const handlePrint = () => {
    window.print();
  };

  const totalAssigned = visibleLayout ? visibleLayout.rooms.reduce((sum, r) => sum + r.assignments.length, 0) : 0;
  const totalCapacity = visibleLayout ? visibleLayout.rooms.reduce((sum, r) => sum + r.capacity, 0) : 0;
  const utilizationPct = totalCapacity ? Math.round((totalAssigned / totalCapacity) * 100) : 0;

  return (
    <div className="page-transition" style={{ padding: "30px 36px 40px", flex: 1, minWidth: 0 }}>
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} type="success" />

      <header data-page-section="seating" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600, marginBottom: 7 }}>Assessment operations · room allocation</div>
          <h1 style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, margin: 0 }}>
            {session?.role === "student" ? "My exam seating" : session?.role === "teacher" ? "My module exams" : "Exam schedule & seating"}
          </h1>
          <p style={{ fontSize: 15, color: colors.textMuted, margin: "5px 0 0" }}>
            {session?.role === "student"
              ? "Your exams, rooms, and assigned benches."
              : session?.role === "teacher"
                ? "Exams for the modules you teach, and the halls you invigilate."
                : "Every candidate, room, bench, and invigilator in one view."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {layout && (
            <>
              <button type="button" onClick={handlePrint} style={{ border: `1px solid ${colors.border}`, borderRadius: 6, padding: "9px 13px", background: colors.card, color: colors.ink, fontWeight: 600, cursor: "pointer" }}>
                🖨️ Print Hall Notice
              </button>
              <button type="button" onClick={handleExportSeatingPlan} style={{ border: `1px solid ${colors.border}`, borderRadius: 6, padding: "9px 13px", background: colors.card, color: colors.ink, fontWeight: 600, cursor: "pointer" }}>
                📥 Export Layout CSV
              </button>
            </>
          )}
          {session?.role === "admin" && (
            <button type="button" onClick={regenerate} disabled={generating} style={{ border: `1px solid ${colors.border}`, borderRadius: 6, padding: "9px 13px", background: colors.card, color: colors.ink, fontWeight: 600, cursor: generating ? "wait" : "pointer" }}>
              {generating ? "Generating..." : "Regenerate layout"}
            </button>
          )}
        </div>
      </header>

      {error && <div style={{ marginBottom: 18, padding: 13, background: "#FDF2F2", border: "1px solid #F87171", borderRadius: 8, color: "#991B1B", fontSize: 13 }}>{error}</div>}

      {/* Student Seat Lookup Bar */}
      <section style={{ ...panelStyle, marginBottom: 18, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 15, color: colors.ink, margin: 0, fontWeight: 700 }}>🔍 Student Seat Lookup</h2>
            <p style={{ fontSize: 12, color: colors.textMuted, margin: "3px 0 0" }}>Find candidate seat assignments instantly across all examination halls.</p>
          </div>
          <input
            type="text"
            placeholder="Search student ID or Name (e.g. STU-001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search student ID or Name for seat lookup"
            style={{
              minWidth: 280,
              padding: "8px 12px",
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              fontSize: 13,
              background: colors.page,
              color: colors.ink,
            }}
          />
        </div>

        {searchQuery.trim() !== "" && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.borderLight}` }}>
            {searchResults.length === 0 ? (
              <div style={{ color: colors.textMuted, fontSize: 13 }}>
                No seat assignments found matching "<strong>{searchQuery}</strong>".
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>Found {searchResults.length} matching candidate seat assignment(s):</div>
                {searchResults.map((res, index) => (
                  <div
                    key={`${res.exam.id}-${res.room.id}-${res.seat.seat_number}-${index}`}
                    onClick={() => handleSelectSearchResult(res)}
                    style={{
                      padding: "10px 14px",
                      background: "#F0F4FF",
                      border: "1px solid #6B7CF0",
                      borderRadius: 8,
                      display: "flex",
                      justify: "space-between",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <strong style={{ color: colors.ink }}>{res.seat.student_name}</strong> <span style={{ fontFamily: fonts.mono, color: colors.textMuted }}>({res.seat.student_id})</span>
                      <div style={{ fontSize: 12, color: colors.textBody, marginTop: 2 }}>
                        Module: <strong>{res.seat.module_name}</strong> | Room: <strong>{res.room.name}</strong> | Bench: <strong>Seat {res.seat.seat_number}</strong> (Row {res.seat.row}, Col {res.seat.column})
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 12, color: colors.textMuted }}>
                      <div>{formatDate(res.exam.exam_date)}</div>
                      <div>{res.exam.start_time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {loading ? (
        <p style={{ color: colors.textMuted }}>Loading exam allocation...</p>
      ) : !schedule.length ? (
        <section style={panelStyle}>
          <p style={{ color: colors.textMuted, margin: 0 }}>No generated exams are available.</p>
        </section>
      ) : visibleSchedule.length === 0 ? (
        <section style={panelStyle}>
          <p style={{ color: colors.textMuted, margin: 0 }}>
            {session?.role === "teacher"
              ? "None of the generated exams cover the modules you teach."
              : session?.role === "student"
                ? "No exams are scheduled for your modules yet."
                : "No generated exams are available."}
          </p>
        </section>
      ) : (
        <>
          <section style={{ ...panelStyle, padding: 0, overflow: "hidden", marginBottom: 18 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr>
                    {["Date", "Time", "Module", "Invigilator", "Candidates", "View"].map((heading) => (
                      <th key={heading} style={{ padding: "13px 14px", textAlign: "left", color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, borderBottom: `1px solid ${colors.borderLight}` }}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleSchedule.map((exam) => (
                    <tr key={exam.id} style={{ background: selectedId === exam.id ? "#F3F6FF" : colors.card }}>
                      <td style={{ padding: "12px 14px", fontSize: 13 }}>{formatDate(exam.exam_date)}</td>
                      <td style={{ padding: "12px 14px", fontFamily: fonts.mono, fontSize: 12 }}>{exam.start_time}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, fontSize: 13 }}>{exam.module_name}</td>
                      <td style={{ padding: "12px 14px", color: colors.textBody, fontSize: 13 }}>{exam.invigilator}</td>
                      <td style={{ padding: "12px 14px", fontFamily: fonts.mono, fontSize: 12 }}>{exam.student_count}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <button type="button" onClick={() => selectExam(exam.id)} style={{ border: "none", background: "none", color: colors.low.text, fontWeight: 600, cursor: "pointer" }}>
                          View layout
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {visibleLayout && (
            <section style={panelStyle} className="print-area">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap", marginBottom: 20 }}>
                <div>
                  <h2 style={{ color: colors.ink, fontSize: 19, margin: 0 }}>{visibleLayout.exam.module_name}</h2>
                  <p style={{ color: colors.textMuted, fontSize: 13, margin: "5px 0 0" }}>
                    {formatDate(visibleLayout.exam.exam_date)} · {visibleLayout.exam.start_time} · Invigilator: <strong>{visibleLayout.exam.invigilator}</strong>
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  {/* Filter Seat View Controls */}
                  <div style={{ display: "flex", gap: 6, background: colors.page, padding: 3, borderRadius: 6, border: `1px solid ${colors.borderLight}` }}>
                    <button
                      type="button"
                      onClick={() => setSeatFilter("all")}
                      style={{ border: "none", background: seatFilter === "all" ? colors.card : "transparent", color: colors.ink, padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      All Seats
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeatFilter("occupied")}
                      style={{ border: "none", background: seatFilter === "occupied" ? colors.card : "transparent", color: colors.ink, padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      Occupied
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeatFilter("empty")}
                      style={{ border: "none", background: seatFilter === "empty" ? colors.card : "transparent", color: colors.ink, padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      Empty
                    </button>
                  </div>

                  <div style={{ fontSize: 12, color: colors.textMuted }}>
                    Utilization: <strong style={{ color: colors.ink }}>{utilizationPct}%</strong> ({totalAssigned} / {totalCapacity})
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {modules.map((module) => (
                      <span key={module} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: colors.textBody, fontSize: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: moduleColor(module, modules), border: `1px solid ${colors.border}` }} />
                        {module}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Utilization Gauge Bar */}
              <div style={{ height: 6, background: colors.borderLight, borderRadius: 3, overflow: "hidden", marginBottom: 20 }}>
                <div
                  style={{
                    width: `${utilizationPct}%`,
                    height: "100%",
                    background: utilizationPct > 95 ? "#EF4444" : utilizationPct > 80 ? "#F59E0B" : "#10B981",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              {visibleLayout.rooms.map((room) => {
                const seats = new Map(room.assignments.map((seat) => [`${seat.row}-${seat.column}`, seat]));
                return (
                  <div key={room.id} style={{ marginBottom: 26 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <h3 style={{ color: colors.ink, fontSize: 15, margin: 0 }}>{room.name}</h3>
                      <span style={{ color: colors.textMuted, fontSize: 12 }}>{room.assignments.length} / {room.capacity} seats assigned</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${room.columns}, minmax(42px, 1fr))`, gap: 6, maxWidth: 900 }}>
                      {Array.from({ length: room.rows * room.columns }, (_, index) => {
                        const row = Math.floor(index / room.columns) + 1;
                        const column = (index % room.columns) + 1;
                        const seat = seats.get(`${row}-${column}`);

                        if (seatFilter === "occupied" && !seat) return null;
                        if (seatFilter === "empty" && seat) return null;

                        const isMatched = searchQuery.trim() !== "" && seat && (
                          seat.student_id?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                          seat.student_name?.toLowerCase().includes(searchQuery.trim().toLowerCase())
                        );

                        return (
                          <div
                            key={`${row}-${column}`}
                            onClick={() => {
                              if (seat) {
                                setSelectedSeat(seat);
                                setSelectedSeatRoom(room);
                              }
                            }}
                            title={seat ? `Click to view ${seat.student_name} (${seat.student_id})` : "Available seat"}
                            className="seat-cell"
                            style={{
                              "--seat-delay": `${Math.min(index * 12, 360)}ms`,
                              aspectRatio: "1.4",
                              border: isMatched ? "2px solid #2563EB" : `1px solid ${seat ? colors.border : colors.borderLight}`,
                              borderRadius: 4,
                              background: isMatched ? "#FEF08A" : seat ? moduleColor(seat.module_name, modules) : colors.page,
                              padding: 5,
                              minWidth: 0,
                              overflow: "hidden",
                              boxShadow: isMatched ? "0 0 8px rgba(37, 99, 235, 0.6)" : "none",
                              transform: isMatched ? "scale(1.05)" : "none",
                              cursor: seat ? "pointer" : "default",
                              transition: "border 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
                            }}
                          >
                            <div style={{ fontFamily: fonts.mono, color: isMatched ? "#1E3A8A" : colors.textMuted, fontSize: 9, fontWeight: isMatched ? 700 : 400 }}>
                              R{row}-C{column}
                            </div>
                            {seat && (
                              <div style={{ color: colors.ink, fontSize: 10, fontWeight: isMatched ? 700 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 4 }}>
                                {seat.student_id}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}

      {/* Candidate Seat Detail Modal */}
      {selectedSeat && (
        <SeatModal
          seat={selectedSeat}
          room={selectedSeatRoom}
          exam={visibleLayout?.exam}
          onClose={() => {
            setSelectedSeat(null);
            setSelectedSeatRoom(null);
          }}
          onSelectStudent={onSelectStudent}
        />
      )}
    </div>
  );
}