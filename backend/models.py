from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Student(Base):
	__tablename__ = "students"

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	student_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
	full_name: Mapped[str] = mapped_column(String(200))
	programme: Mapped[str] = mapped_column(String(200))
	semester: Mapped[str] = mapped_column(String(100))
	module_name: Mapped[str] = mapped_column(String(200))
	exam_date: Mapped[date] = mapped_column(Date)
	attendance_percentage: Mapped[float] = mapped_column(Float)
	exam_1_score: Mapped[float] = mapped_column(Float)
	exam_2_score: Mapped[float] = mapped_column(Float)
	final_exam_score: Mapped[float] = mapped_column(Float)

	seat_assignments: Mapped[list["SeatAssignment"]] = relationship(
		back_populates="student"
	)


class Exam(Base):
	__tablename__ = "exams"

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	name: Mapped[str] = mapped_column(String(200))
	exam_date: Mapped[str | None] = mapped_column(String(30), nullable=True)
	start_time: Mapped[str | None] = mapped_column(String(30), nullable=True)
	invigilator: Mapped[str | None] = mapped_column(String(200), nullable=True)
	classroom_id: Mapped[int | None] = mapped_column(
		ForeignKey("classrooms.id"), nullable=True, index=True
	)

	classroom: Mapped["Classroom | None"] = relationship(back_populates="exams")
	seat_assignments: Mapped[list["SeatAssignment"]] = relationship(
		back_populates="exam", cascade="all, delete-orphan"
	)


class Room(Base):
	__tablename__ = "rooms"

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	name: Mapped[str] = mapped_column(String(100), unique=True)
	rows: Mapped[int] = mapped_column(Integer)
	columns: Mapped[int] = mapped_column(Integer)

	seat_assignments: Mapped[list["SeatAssignment"]] = relationship(
		back_populates="room"
	)


class SeatAssignment(Base):
	__tablename__ = "seat_assignments"
	__table_args__ = (
		UniqueConstraint("exam_id", "student_id", name="uq_exam_student"),
	)

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"), index=True)
	student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
	room_id: Mapped[int | None] = mapped_column(
		ForeignKey("rooms.id"), nullable=True, index=True
	)
	classroom_id: Mapped[int | None] = mapped_column(
		ForeignKey("classrooms.id"), nullable=True, index=True
	)
	row: Mapped[int] = mapped_column(Integer)
	column: Mapped[int] = mapped_column(Integer)
	seat_number: Mapped[str] = mapped_column(String(30))

	exam: Mapped[Exam] = relationship(back_populates="seat_assignments")
	student: Mapped[Student] = relationship(back_populates="seat_assignments")
	room: Mapped[Room | None] = relationship(back_populates="seat_assignments")
	classroom: Mapped["Classroom | None"] = relationship(back_populates="seat_assignments")


class TimetableEntry(Base):
	__tablename__ = "timetable_entries"
	__table_args__ = (
		UniqueConstraint(
			"day",
			"time_slot",
			"group_name",
			"section_cohort",
			"class_type",
			"module_code",
			"module_title",
			"lecturer",
			"room",
			name="uq_timetable_entry",
		),
	)

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	day: Mapped[str] = mapped_column(String(20))
	time_slot: Mapped[str] = mapped_column(String(50))
	group_name: Mapped[str] = mapped_column(String(100))
	section_cohort: Mapped[str] = mapped_column(String(200))
	class_type: Mapped[str] = mapped_column(String(50))
	module_code: Mapped[str] = mapped_column(String(50))
	module_title: Mapped[str] = mapped_column(String(200))
	lecturer: Mapped[str] = mapped_column(String(200))
	room: Mapped[str] = mapped_column(String(100))
	duration_hours: Mapped[float] = mapped_column(Float)


class Classroom(Base):
	__tablename__ = "classrooms"
	__table_args__ = (
		UniqueConstraint("block_name", "room_number", name="uq_classroom_block_room"),
	)

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	block_name: Mapped[str] = mapped_column(String(100))
	room_number: Mapped[str] = mapped_column(String(50), index=True)
	capacity: Mapped[int] = mapped_column(Integer)

	exams: Mapped[list[Exam]] = relationship(back_populates="classroom")
	seat_assignments: Mapped[list[SeatAssignment]] = relationship(
		back_populates="classroom"
	)



class ExamSchedule(Base):
	__tablename__ = "generated_exam_schedules"
	__table_args__ = (
		UniqueConstraint("module_name", "exam_date", name="uq_generated_exam_module_date"),
	)

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	module_name: Mapped[str] = mapped_column(String(200))
	exam_date: Mapped[date] = mapped_column(Date, index=True)
	start_time: Mapped[str] = mapped_column(String(20))
	duration_minutes: Mapped[int] = mapped_column(Integer)
	invigilator: Mapped[str] = mapped_column("lecturer", String(200))
	student_count: Mapped[int] = mapped_column(Integer)

	seat_assignments: Mapped[list["ExamSeatAssignment"]] = relationship(
		back_populates="exam", cascade="all, delete-orphan"
	)


class ExamRoom(Base):
	__tablename__ = "generated_exam_rooms"

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	name: Mapped[str] = mapped_column(String(100), unique=True)
	rows: Mapped[int] = mapped_column(Integer)
	columns: Mapped[int] = mapped_column(Integer)
	capacity: Mapped[int] = mapped_column(Integer)

	seat_assignments: Mapped[list["ExamSeatAssignment"]] = relationship(
		back_populates="room"
	)


class ExamSeatAssignment(Base):
	__tablename__ = "generated_exam_seat_assignments"
	__table_args__ = (
		UniqueConstraint("exam_id", "student_id", name="uq_generated_exam_student"),
		UniqueConstraint(
			"exam_id", "room_id", "row", "column", name="uq_generated_exam_seat"
		),
	)

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	exam_id: Mapped[int] = mapped_column(ForeignKey("generated_exam_schedules.id"), index=True)
	student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
	room_id: Mapped[int] = mapped_column(ForeignKey("generated_exam_rooms.id"), index=True)
	row: Mapped[int] = mapped_column(Integer)
	column: Mapped[int] = mapped_column(Integer)
	seat_number: Mapped[str] = mapped_column(String(30))
	module_name: Mapped[str] = mapped_column(String(200))

	exam: Mapped[ExamSchedule] = relationship(back_populates="seat_assignments")
	student: Mapped[Student] = relationship()
	room: Mapped[ExamRoom] = relationship(back_populates="seat_assignments")

