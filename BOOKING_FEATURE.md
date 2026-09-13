# Feature 6: Conflict-Free Classroom Booking System

> Paste each part below into the matching section of the submission document. Numbering continues from the existing document (Features 1–5, Differentiators 1–5).

---

## 3. Features

Feature 6: Conflict-Free Classroom Booking System

Screenshot
[ Screenshot: Classroom Booking Page ]
(Displays day/start/end time selectors, live classroom availability cards showing block name, room number and capacity, a booking details form with "Booked by" and "Purpose" fields, and an existing bookings timeline for the selected day)

Description
The booking subsystem ([BookingPage.jsx](frontend/src/pages/BookingPage.jsx), [api.py](backend/api.py#L256-L322), [models.py](backend/models.py#L133-L148)) allows students and staff to reserve classrooms for study groups, meetings, and exam reviews directly from the platform. Availability is checked in real time against two sources — the master weekly timetable ([timetable_loader.py](backend/timetable_loader.py)), where a room occupied by a scheduled class is automatically excluded, and previously confirmed bookings — with room-name normalization so "LT 1" and "LT01" are recognized as the same room. Reservations are validated against campus opening hours (07:00–17:00), and a PostgreSQL advisory transaction lock guarantees that two users submitting simultaneously can never double-book the same room; the second request receives an explicit 409 conflict response. Every booking records the requester, purpose, day, and time window, and is saved centrally so it immediately appears in everyone else's availability check.

What does your project do, and why is it useful?
Institutions typically manage room reservations through informal channels — noticeboards, group chats, or word of mouth — leading to double-booked rooms and disputes over who reserved a space. This feature makes room availability authoritative and self-service: students can see exactly which rooms are free at any time slot because the system knows the academic routine, not just other bookings. The database-level locking eliminates the classic race condition where two people book the same room at the same moment, which manual or naive systems cannot prevent. It turns idle classroom capacity into a managed, transparent resource.

---

## 4. Key Differentiators

What Makes Your Project Different?

| Unique Point | Short Explanation |
|---|---|
| 6. Timetable-Aware Double-Booking Prevention | Classroom availability is computed from the live academic routine plus existing reservations, and protected by a PostgreSQL advisory lock, making simultaneous double-bookings structurally impossible rather than merely discouraged. |

---

## 5. Main User Roles

| User | Main Responsibilities |
|---|---|
| Student | Views weekly timetable schedules, module exam dates, and assigned examination room seating details; books classrooms for study groups and peer sessions with real-time availability checking. |

> Note: replace the existing "Student (Read-Only View)" row with the above, since booking adds a write capability for students.

---

## 6. Technical Implementation

Frontend — add to the page-level views list:

[BookingPage.jsx](frontend/src/pages/BookingPage.jsx)

APIs / Integrations — add to the REST API endpoint list ([api.py](backend/api.py)):

GET /bookings/availability: Returns all classrooms with a real-time available flag, cross-referenced against timetable classes and existing bookings.
GET /bookings: Lists classroom bookings, optionally filtered by day.
POST /bookings: Creates a validated reservation (opening-hours and overlap checks, advisory-locked to prevent double-booking); returns 409 on conflict.

Database — add to the relational schemas ([models.py](backend/models.py)):

classroom_bookings: Stores room reservations with classroom reference, day, start/end time, requester, and purpose.

Testing & Verification — updated sentence:

Test Suite: 28 automated Pytest unit and integration tests ([tests/](tests/)) covering risk scoring rules, exam pairing, seating constraint validation, classroom booking availability and conflict handling, timetable loaders, API endpoint contracts, and end-to-end student data flows.

> Note: verify the test count with `pytest -q` before submitting and adjust "28" if the total has changed.
