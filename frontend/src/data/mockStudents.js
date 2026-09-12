// Mock data for the RTE Academic Intelligence dashboard.
//
// Once the backend/CSV pipeline is ready, replace this file's export
// with a fetch call (e.g. in a useEffect or a data-fetching hook).
// Every component below expects the SAME shape as this array, so as
// long as the real data matches these fields, nothing else changes.
//
// riskLevel is one of: "HIGH" | "MEDIUM" | "LOW"
// riskScore is a number from 0 (safest) to 100 (highest risk)

export const MOCK_STUDENTS = [
  { id: "STU-1042", name: "Aarav Sharma", programme: "BSc Computer Science", module: "Data Structures", attendance: 92, examScore: 78, riskLevel: "LOW", riskScore: 12 },
  { id: "STU-1043", name: "Priya Thapa", programme: "BSc Computer Science", module: "Data Structures", attendance: 61, examScore: 44, riskLevel: "HIGH", riskScore: 84 },
  { id: "STU-1044", name: "Bishal Gurung", programme: "BEng Civil Engineering", module: "Structural Analysis", attendance: 74, examScore: 58, riskLevel: "MEDIUM", riskScore: 53 },
  { id: "STU-1045", name: "Sita Rai", programme: "BSc Computer Science", module: "Algorithms", attendance: 55, examScore: 39, riskLevel: "HIGH", riskScore: 91 },
  { id: "STU-1046", name: "Kiran Basnet", programme: "BA Economics", module: "Microeconomics", attendance: 88, examScore: 81, riskLevel: "LOW", riskScore: 9 },
  { id: "STU-1047", name: "Anjali Karki", programme: "BEng Civil Engineering", module: "Structural Analysis", attendance: 69, examScore: 61, riskLevel: "MEDIUM", riskScore: 48 },
  { id: "STU-1048", name: "Rohan Magar", programme: "BSc Computer Science", module: "Algorithms", attendance: 45, examScore: 31, riskLevel: "HIGH", riskScore: 95 },
  { id: "STU-1049", name: "Nisha Adhikari", programme: "BA Economics", module: "Macroeconomics", attendance: 95, examScore: 87, riskLevel: "LOW", riskScore: 6 },
  { id: "STU-1050", name: "Suman Lama", programme: "BEng Civil Engineering", module: "Fluid Mechanics", attendance: 72, examScore: 55, riskLevel: "MEDIUM", riskScore: 57 },
  { id: "STU-1051", name: "Deepa Shrestha", programme: "BSc Computer Science", module: "Data Structures", attendance: 90, examScore: 76, riskLevel: "LOW", riskScore: 15 },
  { id: "STU-1052", name: "Milan Tamang", programme: "BA Economics", module: "Microeconomics", attendance: 58, examScore: 42, riskLevel: "HIGH", riskScore: 88 },
  { id: "STU-1053", name: "Sabina KC", programme: "BEng Civil Engineering", module: "Fluid Mechanics", attendance: 80, examScore: 68, riskLevel: "MEDIUM", riskScore: 39 },
];
