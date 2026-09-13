# Islington Hackathon 2026 - Final Submission

## Academic Risk Identification & Examination Seating Management

---

## 1. Team Information

### Team Name

**Team-Pasta**

### Team Members

| Name | Role / Contribution |
|---|---|
| Bishesh | **Backend & Integration** • Backend/API development • Database integration • Connect different system components • Integrate the academic risk and seating functionality • Ensure frontend and backend communicate correctly |
| Arjav | **Frontend & Data Processing** • Build the user interface • Dashboard and student views • Risk visualization • Examination seating visualization • Support student/data processing |
| Tshering | **Algorithms & Prototyping** • Develop the academic risk-scoring logic • Develop the examination seating algorithm • Ensure algorithms are deterministic and logically correct • Rapidly prototype and validate algorithmic solutions • Testing & Reliability |
| Prithak | **Testing & Reliability** • Test the risk-scoring functionality • Test seating generation and constraints • Test APIs and integration • Find edge cases and bugs • Validate overall system reliability |

---

## 2. About the Project

### Project Name

**Team-Pasta Academic Intelligence and Examination Management Platform**

### Project Overview

The Academic Intelligence and Examination Management Platform is an integrated web system built for Islington College to address three critical administrative challenges: early identification of academically at-risk students, conflict-free examination seating management, and transparent classroom booking. The system processes student academic histories — including multi-exam test scores and attendance percentages — through a deterministic risk engine to categorize risk levels (HIGH, MEDIUM, LOW) alongside explainable risk factors. Concurrently, the platform automates exam schedule generation and calculates multi-module room seating arrangements. It employs interleaved candidate seating to eliminate same-module adjacency and cross-references timetable data to assign neutral invigilators free from teaching conflicts. Additionally, a timetable-aware classroom booking system lets students and staff reserve rooms only when the academic routine leaves them unoccupied, with database-level locking that makes double-booking structurally impossible. Built using FastAPI, SQLAlchemy ORM, PostgreSQL (Supabase), and React (Vite), the platform streamlines administrative workflows, improves institutional decision-making, and eliminates manual scheduling errors.

### Specific Problem Solved

Educational institutions struggle with manual academic tracking, causing struggling students to go unnoticed until final exams. Simultaneously, manual exam seating planning is prone to seat double-booking, room capacity overruns, and invigilator conflicts of interest — while everyday classroom reservations managed through noticeboards and informal channels lead to the same rooms being promised to multiple groups. Team-Pasta solved this by unifying automated data-driven risk profiling with intelligent, constraint-aware exam schedule and seating layout generation, plus a timetable-aware classroom booking system that guarantees conflict-free room reservations.

---

## 3. Features

### Feature 1: Academic Command Center (Executive Dashboard)

**Screenshot**

[ Screenshot: Academic Command Center Overview ]
(Displays summary metric cards for Total Students, High-Risk Students, Upcoming Exams, Database Connectivity status, Risk Distribution Progress Bars, Priority Alerts, and Attendance Warnings)

**Description**

The Academic Command Center serves as the central administrative hub. It aggregates real-time institutional metrics, backend database connection status via `/health`, calculated risk counts, upcoming exam schedules, priority high-risk student alerts, and low attendance notifications (<75%). Users interact with quick navigation buttons to jump directly into deep risk analysis, timetable schedules, or seating plans.

**What does your project do, and why is it useful?**

The Academic Command Center provides academic administrators with an immediate macro-level summary of institutional health and student performance. By surfacing high-risk candidates and upcoming exams on a single dashboard, staff can quickly pinpoint critical issues without navigating multiple spreadsheets. It eliminates data silos by connecting real-time backend state to an intuitive user interface. This proactive monitoring ensures early educational interventions and streamlined exam preparation.

---

### Feature 2: Multi-Factor Academic Risk Analysis & Student Profiling

**Screenshot**

[ Screenshot: Risk Analysis & Detailed Student Profile ]
(Displays risk distribution breakdown, multi-parameter filter dropdowns for Programme, Semester, Module, and Risk Level, and individual student risk profiles with score breakdown, reason lists, and performance trend charts)

**Description**

This feature runs student data through a pure Python risk engine ([risk_engine.py](backend/risk_engine.py#L27-L130)) developed to evaluate attendance thresholds and performance declines across three independent exam intervals (Exam 1 to Exam 2, Exam 1 to Final Exam, Exam 2 to Final Exam). Each student receives a 0–100 risk score, a risk tier (HIGH, MEDIUM, LOW), and explicit human-readable reasons (e.g., "Significant performance decline (exam 1 to exam 2)", "Attendance below 60%", "Final exam below pass mark"). Administrators can filter candidates by programme, semester, module, or search by student ID/name, and open detailed profile pages ([StudentDetailPage.jsx](frontend/src/pages/StudentDetailPage.jsx#L15-L122)) featuring historical performance trend charts.

**What does your project do, and why is it useful?**

This feature translates raw gradebook and attendance data into actionable, explainable academic insights. Rather than relying on simple grade averages or opaque black-box scores, educators receive clear explanations detailing why a specific student is struggling. The interactive filtering allows academic leads to analyze specific cohorts or modules instantly. Early risk detection enables timely tutoring and mentoring interventions before final examinations.

---

### Feature 3: Automated Exam Schedule & Interleaved Room Seating Generator

**Screenshot**

[ Screenshot: Exam Schedule & Visual Seating Grid Layout ]
(Displays generated exam schedule table alongside an interactive room seating grid rendering candidate seat positions R-C, color-coded by module)

**Description**

The seating engine ([seating_engine.py](backend/seating_engine.py#L101-L324) & [exam_engine.py](backend/exam_engine.py#L135-L197)) automatically pairs modules, calculates room grid dimensions based on room capacity (8 columns for capacity ≤ 32, 10 columns for capacity > 32), and allocates candidate seats. For shared halls, it applies an interleaved seating algorithm (Odd columns: Module 1, Even columns: Module 2). For single-module rooms, it uses checkerboard spacing `(row + col) % 2 == 0` to prevent adjacent candidate copying. The UI ([ExamSeatingPage.jsx](frontend/src/pages/ExamSeatingPage.jsx#L16-L77)) provides a "Regenerate layout" control and visual room grids.

**What does your project do, and why is it useful?**

This feature automates the labor-intensive process of creating exam seating plans for large cohorts across multiple examination halls. By enforcing interleaved and checkerboard seating patterns programmatically, the system guarantees physical separation between students taking the same exam. It prevents room overcapacity errors and duplicate seat assignments entirely. Examination officers can generate, review, and print room allocations within seconds.

---

### Feature 4: Conflict-Free Cross-Invigilation Assignment

**Screenshot**

[ Screenshot: Invigilator Allocation Table ]
(Displays assigned neutral invigilators for scheduled exam sessions, showing module cross-referencing)

**Description**

The invigilation engine ([seating_engine.py](backend/seating_engine.py#L33-L98) & [exam_engine.py](backend/exam_engine.py#L26-L56)) cross-references institutional timetable records ([timetable_loader.py](backend/timetable_loader.py#L1-L40)) to extract subject teachers for all examinee modules. It dynamically selects invigilators from the lecturer pool while ensuring: (1) subject teachers NEVER invigilate their own module exams, and (2) no invigilator is double-booked across concurrent exam sessions.

**What does your project do, and why is it useful?**

This feature guarantees academic integrity and fairness by eliminating potential invigilator conflicts of interest. Manual staff scheduling frequently leads to oversight where subject teachers supervise their own students' exams or get double-booked in two halls at once. Automated conflict detection replaces manual checks with deterministic rules. It ensures proper staffing across all exam blocks without administrative overhead.

---

### Feature 5: Academic Timetable Management & Search Interface

**Screenshot**

[ Screenshot: Academic Timetable Schedule Browser ]
(Displays weekly timetable table with filters for Day, Module Code, Group/Cohort, and Lecturer)

**Description**

The timetable subsystem ([timetable_loader.py](backend/timetable_loader.py#L1-L40) & [TimetablePage.jsx](frontend/src/pages/TimetablePage.jsx#L20-L158)) ingests weekly class schedules and presents a searchable, filterable grid. Users can filter by day of week (Sunday–Friday), module code, student group/section cohort, class type, lecturer, or room number.

**What does your project do, and why is it useful?**

It consolidates master timetable data into a clean, queryable interface accessible to institutional staff. By serving as the authoritative source for room and lecturer availability, it directly feeds into the invigilation, exam scheduling, and classroom booking engines. Users can easily verify weekly room utilization and teaching duties. This central view prevents scheduling overlap across normal academic operations and exam periods.

---

### Feature 6: Conflict-Free Classroom Booking System

**Screenshot**

[ Screenshot: Classroom Booking Page ]
(Displays day/start/end time selectors, live classroom availability cards showing block name, room number and capacity, a booking details form with "Booked by" and "Purpose" fields, and an existing bookings timeline for the selected day)

**Description**

The booking subsystem ([BookingPage.jsx](frontend/src/pages/BookingPage.jsx), [api.py](backend/api.py#L256-L322), [models.py](backend/models.py#L133-L148)) allows students and staff to reserve classrooms for study groups, meetings, and exam reviews directly from the platform. Availability is checked in real time against two sources — the master weekly timetable ([timetable_loader.py](backend/timetable_loader.py#L1-L40)), where a room occupied by a scheduled class is automatically excluded, and previously confirmed bookings — with room-name normalization so "LT 1" and "LT01" are recognized as the same room. Reservations are validated against campus opening hours (07:00–17:00), and a PostgreSQL advisory transaction lock guarantees that two users submitting simultaneously can never double-book the same room; the second request receives an explicit 409 conflict response. Every booking records the requester, purpose, day, and time window, and is saved centrally so it immediately appears in everyone else's availability check.

**What does your project do, and why is it useful?**

Institutions typically manage room reservations through informal channels — noticeboards, group chats, or word of mouth — leading to double-booked rooms and disputes over who reserved a space. This feature makes room availability authoritative and self-service: students can see exactly which rooms are free at any time slot because the system knows the academic routine, not just other bookings. The database-level locking eliminates the classic race condition where two people book the same room at the same moment, which manual or naive systems cannot prevent. It turns idle classroom capacity into a managed, transparent resource.

---

## 4. Key Differentiators

### What Makes Your Project Different?

| Unique Point | Short Explanation |
|---|---|
| 1. Interleaved Multi-Module Room Sharing | Maximizes exam room capacity utilization by seating candidates from two different modules in alternating columns (Odd: Module A, Even: Module B), completely preventing same-module candidate copying without leaving 50% of seats empty. |
| 2. Conflict-Free Cross-Invigilation Rules | Dynamically checks master timetable records to enforce neutral invigilation. Subject lecturers are automatically barred from supervising exams for their own modules, maintaining strict academic integrity. |
| 3. Explainable Multi-Factor Risk Scoring | Computes a 0–100 risk score using independent sequential trend checks (Exam 1→2, 1→Final, 2→Final) and attendance thresholds, outputting transparent, human-readable reason strings rather than opaque scores. |
| 4. Dynamic Capacity-to-Grid Math & Visual Layouts | Automatically derives optimal row-and-column room grid dimensions from room capacity thresholds (≤32 capacity → 8 cols; >32 → 10 cols) and renders dynamic, interactive visual seat maps. |
| 5. Automated CSV Seed & PostgreSQL Persistence | Automatically cleans existing allocations and ingests CSV datasets (students.csv, timetable.csv, classrooms.csv) on application startup, seeding a PostgreSQL database via SQLAlchemy ORM for instant turn-key deployment. |
| 6. Timetable-Aware Double-Booking Prevention | Classroom booking availability is computed from the live academic routine plus existing reservations, and protected by a PostgreSQL advisory lock, making simultaneous double-bookings structurally impossible rather than merely discouraged. |

---

## 5. Main User Roles

| User | Main Responsibilities |
|---|---|
| Administrator / Exam Officer | Manages system data, triggers automated exam schedule and seating generation, views backend database health metrics, and oversees room, invigilator, and classroom booking allocations. |
| Academic Advisor / Lecturer | Views student academic risk profiles, inspects score decline reasons and attendance warnings, tracks cohort performance trends, and reviews assigned timetable schedules. |
| Student | Views weekly timetable schedules, module exam dates, and assigned examination room seating details; books classrooms for study groups and peer sessions with real-time availability checking. |

---

## 6. Technical Implementation

### Frontend

**Developer:** Arjav (Frontend & Data Processing)

**Framework & Libraries:** Built with React 18 and Vite for fast client-side rendering.

**Architecture:** Modular component hierarchy ([App.jsx](frontend/src/App.jsx#L10-L114)) with page-level views ([DashboardPage.jsx](frontend/src/pages/DashboardPage.jsx), [RiskAnalysisPage.jsx](frontend/src/pages/RiskAnalysisPage.jsx), [StudentDetailPage.jsx](frontend/src/pages/StudentDetailPage.jsx), [TimetablePage.jsx](frontend/src/pages/TimetablePage.jsx), [BookingPage.jsx](frontend/src/pages/BookingPage.jsx), [ExamSeatingPage.jsx](frontend/src/pages/ExamSeatingPage.jsx)) and reusable UI controls ([SummaryCard.jsx](frontend/src/components/SummaryCard.jsx), [RiskBadge.jsx](frontend/src/components/RiskBadge.jsx), [AttendanceBar.jsx](frontend/src/components/AttendanceBar.jsx), [StudentTable.jsx](frontend/src/components/StudentTable.jsx), [SearchBox.jsx](frontend/src/components/SearchBox.jsx), [SeatModal.jsx](frontend/src/components/SeatModal.jsx), [Toast.jsx](frontend/src/components/Toast.jsx), [Sidebar.jsx](frontend/src/components/Sidebar.jsx)).

**Styling:** Clean, professional design system leveraging central tokens ([theme.js](frontend/src/theme.js)) and responsive CSS grids/flexbox.

**State & API Integration:** Centralized API service module ([api.js](frontend/src/services/api.js#L1-L195)) wrapping native fetch requests with custom ApiError handling and data normalization functions.

### Backend & Core Logic

**Developers:** Bishesh (Backend & Integration) & Tshering (Algorithms & Prototyping)

**Framework:** Built with Python 3.13 and FastAPI framework, served asynchronously via Uvicorn.

**Architecture:** Modular application design separating API routing ([api.py](backend/api.py)), Lifespan startup hooks ([main.py](backend/main.py#L19-L30)), database ORM models ([models.py](backend/models.py)), CSV ingest loaders ([csv_loader.py](backend/csv_loader.py), [timetable_loader.py](backend/timetable_loader.py), [classroom_loader.py](backend/classroom_loader.py)), and isolated business logic engines:

- **Risk Engine** ([risk_engine.py](backend/risk_engine.py)): Pure, deterministic calculation module scoring student performance decline and attendance.
- **Seating & Invigilation Engine** ([seating_engine.py](backend/seating_engine.py)): Generates interleaved candidate seat placements and neutral invigilator assignments.
- **Exam Schedule Engine** ([exam_engine.py](backend/exam_engine.py)): Pairs module exam sessions and allocates room dimensions.
- **Classroom Booking Engine** ([api.py](backend/api.py#L28-L70)): Timetable cross-referencing, room-name normalization, opening-hours validation, interval overlap detection, and advisory-locked reservation creation.

### Database

**Engine & Drivers:** PostgreSQL database (hosted on Supabase cloud platform) integrated via SQLAlchemy 2.0 ORM and psycopg driver.

**Relational Schemas** ([models.py](backend/models.py)):

- **students:** Stores student profiles, academic scores (exam_1_score, exam_2_score, final_exam_score), attendance %, module, and exam date.
- **classrooms & rooms:** Stores physical campus blocks, room numbers, capacities, and grid dimensions.
- **timetable_entries:** Stores regular weekly class schedules, lecturer assignments, cohorts, and rooms.
- **exams & generated_exam_schedules:** Stores scheduled exam sessions, start times, durations, and assigned invigilators.
- **seat_assignments & generated_exam_seat_assignments:** Relational mapping of candidate student IDs to specific room seats (row, column, seat_number).
- **classroom_bookings:** Stores room reservations with classroom reference, day, start/end time, requester, and purpose.

**Data Lifecycle:** Managed via SQLAlchemy SessionLocal sessions with explicit `cascade="all, delete-orphan"` cleanup during plan regeneration.

### Testing & Verification

**Developer:** Prithak (Testing & Reliability)

**Test Suite:** 34 automated Pytest unit and integration tests ([tests/](tests/)) covering risk scoring rules, exam pairing, seating constraint validation, classroom booking availability and conflict handling, timetable loaders, API endpoint contracts, and end-to-end student data flows.

### APIs / Integrations

**REST API Endpoints** ([api.py](backend/api.py)):

- `GET /health`: Database connectivity ping.
- `GET /students` & `GET /students/{id}`: Fetches raw student records.
- `GET /risk`, `GET /risk-summary`, `GET /risk/{id}`: Calculates and returns student risk assessments.
- `GET /timetable`: Fetches filterable academic timetable entries.
- `GET /classrooms` & `GET /classrooms/{id}`: Fetches campus classroom inventory.
- `GET /bookings/availability?day=&start_time=&end_time=`: Returns all classrooms with a real-time available flag, cross-referenced against timetable classes and existing bookings.
- `GET /bookings?day=`: Lists classroom bookings, optionally filtered by day.
- `POST /bookings`: Creates a validated reservation (opening-hours 07:00–17:00 and overlap checks, advisory-locked to prevent double-booking); returns 409 on conflict.
- `GET /exam-schedule` & `POST /exam-schedule/generate`: Manages and triggers exam schedule generation.
- `GET /exam-schedule/{id}/layout`: Fetches room-by-room candidate seat layout grids.
- `GET /seating` & `POST /seating/generate`: Triggers and returns generated seating plans.

**Middleware:** CORSMiddleware configured to allow safe cross-origin communication between React frontend and FastAPI backend.

### Authentication

**Current Implementation:** Access control and authentication (e.g. JWT tokens, OAuth2, or password logins) were not implemented in the current hackathon repository. Endpoints are currently open for administrative demonstration.

---

## 7. Project Limitations

The following items were not completed within the hackathon timeframe:

- **Role-Based Authentication (RBAC):** User login, password hashing, and JWT token authentication were not implemented.
- **Real-Time Push Notifications:** WebSockets / SSE notifications for triggering real-time alerts when a student falls into high risk were simulated via dashboard polling.
- **Manual Drag-and-Drop Seat Swaps:** Interactive UI drag-and-drop overrides for seating arrangements were not built; seating plans are strictly algorithm-generated.
- **Live Institutional SIS/LMS Integration:** Direct API sync with existing college enterprise systems was simulated using robust CSV data import loaders.
- **Exporting Seating Plans to PDF/Excel:** One-click PDF/Excel export for printed exam hall door notices was not implemented.
- **Booking Management Tools:** Booking cancellation, editing, and approval workflows for administrators were not built; confirmed reservations persist until manually cleared in the database.

---

## 8. Future Improvements

Features planned for post-hackathon development include:

- **Role-Based JWT Authentication:** Implement secure login for Administrators, Lecturers, and Students with fine-grained permissions.
- **AI-Assisted Timetable & Exam Scheduling:** Incorporate machine-learning optimization algorithms to handle complex multi-room and multi-student elective constraints automatically.
- **Real-Time Notification System:** Integrate email and web-push notifications to alert academic advisors immediately when high-risk thresholds are crossed.
- **Mobile Application with QR Code Hall Passes:** Build a mobile app allowing students to view their exam seat location and present a digital QR code hall pass for invigilator scanning.
- **Direct Institutional SIS Integration:** Connect backend import pipelines directly to institutional Student Information Systems (SIS) via REST APIs.
- **Advanced Predictive Risk Analytics:** Expand the risk engine with machine learning regression models to forecast final exam outcomes based on early assessment trends.
- **Booking Approval Workflow & Calendar Sync:** Add administrator approval for classroom bookings, cancellation flows, and .ics calendar export so reservations sync with institutional calendars.
