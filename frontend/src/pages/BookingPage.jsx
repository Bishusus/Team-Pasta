import React, { useEffect, useState } from "react";
import { colors, fonts } from "../theme";
import { approveBooking, createBooking, fetchBookingAvailability, fetchBookings, rejectBooking } from "../services/api";

const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI"];
const panelStyle = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: 22,
};

export default function BookingPage({ role }) {
  const isAdmin = role === "ADMIN";
  const [form, setForm] = useState({ day: "MON", startTime: "12:00", endTime: "13:00", classroomId: "", bookedBy: "", purpose: "" });
  const [classrooms, setClassrooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

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
    setNotice(null);
    try {
      await createBooking({
        classroom_id: Number(form.classroomId),
        day: form.day,
        start_time: form.startTime,
        end_time: form.endTime,
        booked_by: form.bookedBy,
        purpose: form.purpose,
      });
      setNotice("Classroom booked successfully.");
      setForm((current) => ({ ...current, bookedBy: "", purpose: "" }));
      await loadAvailability();
    } catch (reason) {
      setNotice(reason.message || "Booking could not be completed.");
      await loadAvailability();
    }
  };

  const updateBooking = async (bookingId, approved) => {
    try {
      if (approved) await approveBooking(bookingId);
      else await rejectBooking(bookingId);
      await loadAvailability();
    } catch (reason) {
      setNotice(reason.message || "Booking status could not be updated.");
    }
  };

  const inputStyle = { width: "100%", padding: "10px 11px", border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textBody, background: colors.card, fontSize: 13 };
  const availableLabel = loading ? "Checking routine..." : `${classrooms.length} classroom${classrooms.length === 1 ? "" : "s"} available`;

  return (
    <div style={{ padding: "30px 36px 40px", flex: 1, minWidth: 0 }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600, marginBottom: 7 }}>Islington College · Facilities</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, margin: 0 }}>Classroom Booking</h1>
        <p style={{ fontSize: 15, color: colors.textMuted, margin: "5px 0 0" }}>Reserve rooms only when the academic routine leaves them unoccupied.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, .9fr)", gap: 18, alignItems: "start" }}>
        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
            <div><h2 style={{ color: colors.ink, fontSize: 17, margin: 0 }}>Find a free classroom</h2><p style={{ color: colors.textMuted, fontSize: 13, margin: "4px 0 0" }}>Availability is checked against the Supabase timetable and existing bookings.</p></div>
            <span style={{ color: colors.low.text, fontSize: 12, fontWeight: 600 }}>{availableLabel}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
            <label style={{ color: colors.textMuted, fontSize: 12 }}>Day<select value={form.day} onChange={(event) => update("day", event.target.value)} style={inputStyle}>{days.map((day) => <option key={day}>{day}</option>)}</select></label>
            <label style={{ color: colors.textMuted, fontSize: 12 }}>Starts<input type="time" value={form.startTime} onChange={(event) => update("startTime", event.target.value)} style={inputStyle} /></label>
            <label style={{ color: colors.textMuted, fontSize: 12 }}>Ends<input type="time" value={form.endTime} onChange={(event) => update("endTime", event.target.value)} style={inputStyle} /></label>
          </div>
          {error ? <div style={{ color: colors.high.text, fontSize: 13 }}>{error} <button type="button" onClick={loadAvailability} style={{ border: 0, background: "none", color: colors.high.text, fontWeight: 700, cursor: "pointer" }}>Try again</button></div> : loading ? <p style={{ color: colors.textMuted, fontSize: 13 }}>Reading the routine...</p> : classrooms.length === 0 ? <p style={{ color: colors.textMuted, fontSize: 13 }}>No rooms are free during this window. Try another time.</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>{classrooms.map((classroom) => <label key={classroom.id} style={{ display: "block", padding: 14, border: `1px solid ${form.classroomId === String(classroom.id) ? colors.low.dot : colors.border}`, borderRadius: 8, cursor: "pointer" }}><input type="radio" name="classroom" value={classroom.id} checked={form.classroomId === String(classroom.id)} onChange={(event) => update("classroomId", event.target.value)} style={{ marginRight: 8 }} /><strong style={{ color: colors.ink, fontSize: 14 }}>{classroom.block_name} {classroom.room_number}</strong><div style={{ marginTop: 7, color: colors.textMuted, fontSize: 12 }}>Capacity {classroom.capacity}</div></label>)}</div>}
        </section>

        <section style={panelStyle}>
          <h2 style={{ color: colors.ink, fontSize: 17, margin: "0 0 4px" }}>Booking details</h2>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 16px" }}>The reservation is saved centrally for other staff to see.</p>
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <label style={{ color: colors.textMuted, fontSize: 12 }}>Booked by<input required value={form.bookedBy} onChange={(event) => update("bookedBy", event.target.value)} placeholder="Your name or team" style={inputStyle} /></label>
            <label style={{ color: colors.textMuted, fontSize: 12 }}>Purpose<input required value={form.purpose} onChange={(event) => update("purpose", event.target.value)} placeholder="Meeting, workshop, study group" style={inputStyle} /></label>
            <button type="submit" disabled={!form.classroomId || loading} style={{ marginTop: 4, border: 0, borderRadius: 6, padding: "11px 14px", background: form.classroomId && !loading ? colors.ink : colors.border, color: "#FFF", fontWeight: 700, cursor: form.classroomId && !loading ? "pointer" : "not-allowed" }}>{isAdmin ? "Book selected classroom" : "Request classroom booking"}</button>
          </form>
          {notice && <p style={{ margin: "14px 0 0", color: notice.includes("successfully") ? colors.low.text : colors.high.text, fontSize: 13 }}>{notice}</p>}
        </section>
      </div>

      <section style={{ ...panelStyle, marginTop: 18 }}>
        <h2 style={{ color: colors.ink, fontSize: 17, margin: "0 0 4px" }}>Bookings for {form.day}</h2>
        <p style={{ color: colors.textMuted, fontSize: 13, margin: "0 0 14px" }}>Existing reservations are included in the availability check.</p>
        {bookings.length === 0 ? <p style={{ color: colors.textMuted, fontSize: 13, margin: 0 }}>No bookings recorded for this day.</p> : <div style={{ display: "grid", gap: 0 }}>{bookings.map((booking) => <div key={booking.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "11px 0", borderTop: `1px solid ${colors.borderLight}`, fontSize: 13 }}><span style={{ color: colors.ink, fontWeight: 600 }}>{booking.room}</span><span style={{ color: colors.textMuted }}>{booking.start_time} - {booking.end_time} · {booking.purpose} ({booking.booked_by}) · <strong>{booking.status}</strong></span>{isAdmin && booking.status === "PENDING" && <span style={{ display: "flex", gap: 6 }}><button type="button" onClick={() => updateBooking(booking.id, true)} style={{ border: 0, borderRadius: 5, padding: "5px 8px", background: colors.low.bg, color: colors.low.text, cursor: "pointer" }}>Approve</button><button type="button" onClick={() => updateBooking(booking.id, false)} style={{ border: 0, borderRadius: 5, padding: "5px 8px", background: colors.high.bg, color: colors.high.text, cursor: "pointer" }}>Reject</button></span>}</div>)}</div>}
      </section>
    </div>
  );
}