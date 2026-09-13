import React, { useEffect, useState } from "react";
import { colors, fonts } from "../theme";
import Toast from "../components/Toast";
import { createBooking, fetchBookingAvailability, fetchBookings } from "../services/api";

const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI"];
const panelStyle = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: 22,
};

export default function BookingPage() {
  const [form, setForm] = useState({ day: "MON", startTime: "12:00", endTime: "13:00", classroomId: "", bookedBy: "", purpose: "" });
  const [classrooms, setClassrooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const loadAvailability = async () => {
    setLoading(true);
    setError(null);
    try {
      const [available, currentBookings] = await Promise.all([
        fetchBookingAvailability({ day: form.day, startTime: form.startTime, endTime: form.endTime }),
        fetchBookings(form.day),
      ]);
      setClassrooms(available.filter((classroom) => classroom.available));
      setBookings(currentBookings);
      setForm((current) => ({ ...current, classroomId: available.find((classroom) => classroom.available)?.id?.toString() || "" }));
    } catch (reason) {
      setClassrooms([]);
      setError(reason.message || "Unable to check classroom availability.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, [form.day, form.startTime, form.endTime]);

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    try {
      await createBooking({
        classroom_id: Number(form.classroomId),
        day: form.day,
        start_time: form.startTime,
        end_time: form.endTime,
        booked_by: form.bookedBy,
        purpose: form.purpose,
      });
      setToastMessage("Classroom booked successfully!");
      setForm((current) => ({ ...current, bookedBy: "", purpose: "" }));
      await loadAvailability();
    } catch (reason) {
      setToastMessage(reason.message || "Booking could not be completed.");
      await loadAvailability();
    }
  };

  const inputStyle = { width: "100%", padding: "10px 11px", border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textBody, background: colors.card, fontSize: 13 };
  const availableLabel = loading ? "Checking routine..." : `${classrooms.length} classroom${classrooms.length === 1 ? "" : "s"} available`;

  return (
    <div className="page-transition" style={{ padding: "30px 36px 40px", flex: 1, minWidth: 0 }}>
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} type="success" />

      <header data-page-section="booking" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600, marginBottom: 7 }}>Islington College · Facilities</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, margin: 0 }}>Classroom Booking</h1>
        <p style={{ fontSize: 15, color: colors.textMuted, margin: "5px 0 0" }}>Reserve rooms only when the academic routine leaves them unoccupied.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, .9fr)", gap: 18, alignItems: "start" }}>
        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
            <div>
              <h2 style={{ color: colors.ink, fontSize: 17, margin: 0 }}>Find a free classroom</h2>
              <p style={{ color: colors.textMuted, fontSize: 13, margin: "4px 0 0" }}>Availability is checked against the Supabase timetable and existing bookings.</p>
            </div>
            <span style={{ color: colors.low.text, fontSize: 12, fontWeight: 600 }}>{availableLabel}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
            <label style={{ color: colors.textMuted, fontSize: 12 }}>
              Day
              <select value={form.day} onChange={(event) => update("day", event.target.value)} style={inputStyle}>
                {days.map((day) => <option key={day}>{day}</option>)}
              </select>
            </label>
            <label style={{ color: colors.textMuted, fontSize: 12 }}>
              Starts
              <input type="time" value={form.startTime} onChange={(event) => update("startTime", event.target.value)} style={inputStyle} />
            </label>
            <label style={{ color: colors.textMuted, fontSize: 12 }}>
              Ends
              <input type="time" value={form.endTime} onChange={(event) => update("endTime", event.target.value)} style={inputStyle} />
            </label>
          </div>

          {error ? (
            <div style={{ color: colors.high.text, fontSize: 13 }}>
              {error} <button type="button" onClick={loadAvailability} style={{ border: 0, background: "none", color: colors.high.text, fontWeight: 700, cursor: "pointer" }}>Try again</button>
            </div>
          ) : loading ? (
            <p style={{ color: colors.textMuted, fontSize: 13 }}>Reading the routine...</p>
          ) : classrooms.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: 13 }}>No rooms are free during this window. Try another time.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {classrooms.map((classroom, index) => (
                <label
                  key={classroom.id}
                  className="elevate-card"
                  style={{
                    display: "block",
                    padding: 14,
                    position: "relative",
                    border: `1px solid ${form.classroomId === String(classroom.id) ? colors.low.dot : colors.border}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    background: form.classroomId === String(classroom.id) ? "#F0Fdf4" : colors.card,
                    animation: "fadeInUp 0.35s ease both",
                    animationDelay: `${Math.min(index * 45, 360)}ms`,
                  }}
                >
                  <input
                    type="radio"
                    name="classroom"
                    value={classroom.id}
                    checked={form.classroomId === String(classroom.id)}
                    onChange={(event) => update("classroomId", event.target.value)}
                    style={{ marginRight: 8 }}
                  />
                  <strong style={{ color: colors.ink, fontSize: 14 }}>{classroom.block_name} {classroom.room_number}</strong>
                  <div style={{ marginTop: 7, color: colors.textMuted, fontSize: 12 }}>Capacity {classroom.capacity} seats</div>
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: 10,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: colors.low.dot,
                      opacity: form.classroomId === String(classroom.id) ? 1 : 0,
                      transform: form.classroomId === String(classroom.id) ? "scale(1)" : "scale(0)",
                      transition: "opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  />
                </label>
              ))}
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <h2 style={{ color: colors.ink, fontSize: 17, margin: "0 0 4px" }}>Booking details</h2>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 16px" }}>The reservation is saved centrally for other staff to see.</p>
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <label style={{ color: colors.textMuted, fontSize: 12 }}>
              Booked by
              <input required value={form.bookedBy} onChange={(event) => update("bookedBy", event.target.value)} placeholder="Your name or department" style={inputStyle} />
            </label>
            <label style={{ color: colors.textMuted, fontSize: 12 }}>
              Purpose
              <input required value={form.purpose} onChange={(event) => update("purpose", event.target.value)} placeholder="Meeting, exam review, study group" style={inputStyle} />
            </label>
            <button
              type="submit"
              disabled={!form.classroomId || loading}
              style={{
                marginTop: 4,
                border: 0,
                borderRadius: 6,
                padding: "11px 14px",
                background: form.classroomId && !loading ? colors.ink : colors.border,
                color: "#FFF",
                fontWeight: 700,
                cursor: form.classroomId && !loading ? "pointer" : "not-allowed",
              }}
            >
              Book selected classroom
            </button>
          </form>
        </section>
      </div>

      {/* Existing Bookings Timeline List */}
      <section style={{ ...panelStyle, marginTop: 18 }}>
        <h2 style={{ color: colors.ink, fontSize: 17, margin: "0 0 4px" }}>Bookings for {form.day}</h2>
        <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 14px" }}>Existing reservations are included in the availability check.</p>
        {bookings.length === 0 ? (
          <p style={{ color: colors.textMuted, fontSize: 13, margin: 0 }}>No bookings recorded for this day.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {bookings.map((booking, index) => (
              <div
                key={booking.id}
                style={{
                  display: "flex",
                  justify: "space-between",
                  gap: 16,
                  padding: "12px 14px",
                  background: colors.page,
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: 8,
                  fontSize: 13,
                  animation: "fadeInUp 0.35s ease both",
                  animationDelay: `${Math.min(index * 50, 400)}ms`,
                }}
              >
                <div>
                  <strong style={{ color: colors.ink }}>{booking.room}</strong>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    Purpose: <strong>{booking.purpose}</strong> (Booked by: {booking.booked_by})
                  </div>
                </div>
                <div style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, alignSelf: "center" }}>
                  {booking.start_time} - {booking.end_time}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}