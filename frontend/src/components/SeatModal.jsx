import React from "react";
import { colors, fonts } from "../theme";
import RiskBadge from "./RiskBadge";
import AttendanceBar from "./AttendanceBar";

export default function SeatModal({ seat, exam, room, onClose, onSelectStudent, onAdmitCard }) {
  if (!seat) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(3px)",
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          maxWidth: 520,
          width: "100%",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
          padding: 24,
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            fontSize: 20,
            color: colors.textMuted,
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <div style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
          Candidate Seat Allocation
        </div>

        <h2 style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink, margin: "0 0 4px" }}>
          {seat.student_name}
        </h2>
        <div style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted, marginBottom: 18 }}>
          {seat.student_id}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, background: colors.page, padding: 14, borderRadius: 8, marginBottom: 18, border: `1px solid ${colors.borderLight}` }}>
          <div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>Assigned Seat</div>
            <div style={{ fontSize: 16, color: colors.ink, fontWeight: 700, fontFamily: fonts.mono }}>
              Seat {seat.seat_number} (Row {seat.row}, Col {seat.column})
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>Hall & Room</div>
            <div style={{ fontSize: 14, color: colors.ink, fontWeight: 600 }}>
              {room?.name || "Exam Room"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>Module Exam</div>
            <div style={{ fontSize: 13, color: colors.ink, fontWeight: 600 }}>
              {seat.module_name}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>Invigilator</div>
            <div style={{ fontSize: 13, color: colors.ink }}>
              {exam?.invigilator || "Assigned Officer"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: `1px solid ${colors.borderLight}` }}>
          <div style={{ fontSize: 12, color: colors.textMuted }}>
            Date & Time: <strong>{exam?.exam_date}</strong> at <strong>{exam?.start_time}</strong>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {onSelectStudent && (
              <button
                type="button"
                onClick={() => {
                  onSelectStudent(seat.student_id);
                  onClose();
                }}
                style={{
                  border: "none",
                  background: colors.ink,
                  color: "#FFF",
                  borderRadius: 6,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                View Full Profile →
              </button>
            )}
            {onAdmitCard && exam && (
              <button
                type="button"
                onClick={() => onAdmitCard({ studentId: seat.student_id, examId: exam.id })}
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.card,
                  color: colors.ink,
                  borderRadius: 6,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🎫 Admit Card
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
