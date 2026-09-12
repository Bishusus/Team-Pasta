
import os
import pandas as pd


# Required columns in students.csv
REQUIRED_COLUMNS = [
    "student_id",
    "full_name",
    "programme",
    "semester",
    "module_name",
    "exam_date",
    "attendance_percentage",
    "exam_1_score",
    "exam_2_score",
    "final_exam_score",
]


def validate_csv_file(file_path):
    """
    Check that the CSV exists, is readable, and contains
    all required columns.
    """

    # Check if file exists
    if not os.path.exists(file_path):
        return False, f"File not found: {file_path}"

    # Check file extension
    if not file_path.lower().endswith(".csv"):
        return False, "File is not a CSV."

    # Try reading the CSV
    try:
        df = pd.read_csv(file_path, encoding="utf-8")

    except UnicodeDecodeError:
        return False, "File is not UTF-8 encoded."

    except Exception as e:
        return False, f"Failed to read CSV: {e}"

    # Check required columns
    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        return False, (
            "Missing required columns: "
            + ", ".join(missing_columns)
        )

    # Check that the CSV contains data
    if df.empty:
        return False, "CSV file contains no student records."

    return True, ""


def clean_data(df):
    """
    Clean the CSV data and convert values
    into appropriate data types.
    """

    # Replace empty/whitespace-only cells with NaN
    df = df.replace(r"^\s*$", pd.NA, regex=True)

    # Remove whitespace from text fields
    string_columns = df.select_dtypes(include=["object"]).columns

    for column in string_columns:
        df[column] = df[column].astype(str).str.strip()

    # Convert numeric columns
    numeric_columns = [
        "attendance_percentage",
        "exam_1_score",
        "exam_2_score",
        "final_exam_score",
    ]

    for column in numeric_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    # Convert exam date
    df["exam_date"] = pd.to_datetime(
        df["exam_date"],
        errors="coerce"
    )

    # Remove rows missing essential student information
    df = df.dropna(
        subset=[
            "student_id",
            "full_name",
            "programme",
            "semester",
            "module_name",
            "exam_date",
            "attendance_percentage",
        ]
    )

    # Keep attendance and exam scores between 0 and 100
    for column in numeric_columns:
        df[column] = df[column].clip(
            lower=0,
            upper=100
        )

    return df


def transform_data(df):
    """
    Standardize student information.
    """

    # Student IDs in uppercase
    df["student_id"] = df["student_id"].str.upper()

    # Student names in title case
    df["full_name"] = df["full_name"].str.title()

    return df


def load_students(file_path):
    """
    Main CSV loading function.

    Returns:
        students, error

    On success:
        students = list of student dictionaries
        error = None

    On failure:
        students = None
        error = error message
    """

    # -------------------------
    # 1. Validate CSV
    # -------------------------
    is_valid, message = validate_csv_file(file_path)

    if not is_valid:
        return None, message

    # -------------------------
    # 2. Read CSV
    # -------------------------
    try:
        df = pd.read_csv(
            file_path,
            encoding="utf-8"
        )

    except Exception as e:
        return None, f"Failed to parse CSV: {e}"

    # -------------------------
    # 3. Clean data
    # -------------------------
    df = clean_data(df)

    if df.empty:
        return None, (
            "No valid student records found "
            "after cleaning."
        )

    # -------------------------
    # 4. Transform data
    # -------------------------
    df = transform_data(df)

    # -------------------------
    # 5. Convert to dictionaries
    # -------------------------
    students = df.to_dict(
        orient="records"
    )

    # Convert pandas Timestamp to string
    for student in students:
        if pd.notna(student["exam_date"]):
            student["exam_date"] = (
                student["exam_date"]
                .strftime("%Y-%m-%d")
            )

    return students, None


# =========================================================
# TEST THE LOADER DIRECTLY
# =========================================================

if __name__ == "__main__":

    # csv_loader.py is inside /backend
    current_dir = os.path.dirname(
        os.path.abspath(__file__)
    )

    # Move one level up to project root
    project_root = os.path.dirname(current_dir)

    # Find students.csv inside /data
    csv_path = os.path.join(
        project_root,
        "data",
        "students.csv"
    )

    print(f"Loading CSV: {csv_path}")

    students, error = load_students(csv_path)

    if error:

        print("\nCSV LOADING FAILED")
        print(error)

    else:

        print("\nCSV LOADING SUCCESSFUL")
        print(f"Students loaded: {len(students)}")

        for student in students:
            print("\nStudent:")
            for key, value in student.items():
                print(f"  {key}: {value}")

