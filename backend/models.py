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
		UniqueConstraint(
			"exam_id", "room_id", "row", "column", name="uq_exam_seat"
		),
	)

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"), index=True)
	student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
	room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), index=True)
	row: Mapped[int] = mapped_column(Integer)
	column: Mapped[int] = mapped_column(Integer)
	seat_number: Mapped[str] = mapped_column(String(30))

	exam: Mapped[Exam] = relationship(back_populates="seat_assignments")
	student: Mapped[Student] = relationship(back_populates="seat_assignments")
	room: Mapped[Room] = relationship(back_populates="seat_assignments")
