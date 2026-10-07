export const STUDENT_DATA = {
  contextTitle: "AI Context Awareness",
  docsLoaded: 3,
  docsTotal: 3,
  docsReady: "All documents are indexed and ready for intelligent Q&A.",
  documents: [
    { name: "Quantum Physics Notes.pdf", type: "PDF", pages: 42, active: true },
    { name: "Calculus Textbook Ch1-5...", type: "PDF", pages: 118, active: true },
    { name: "Chemistry Lab Reports.d...", type: "DOC", pages: 24, active: false },
  ],
  stats: [
    { label: "Chats", value: "12" },
    { label: "Questions", value: "47" },
    { label: "Topics", value: "8" },
    { label: "Streak", value: "5d 🔥" },
  ],
};

export const PROFESSOR_DATA = {
  stats: [
    { label: "Students", value: "45", delta: "+2 this week", up: true },
    { label: "Avg Score", value: "71%", delta: "-3% vs last wk", up: false },
    { label: "Submissions", value: "38", delta: "+12 today", up: true },
    { label: "Resources", value: "12", delta: "+1 today", up: true },
  ],
  topicScores: [
    { label: "Mechanics", score: 84, color: "#6366f1" },
    { label: "Thermody.", score: 67, color: "#8b5cf6" },
    { label: "Optics", score: 52, color: "#f59e0b" },
    { label: "Electricity", score: 76, color: "#6366f1" },
    { label: "Quantum", score: 61, color: "#8b5cf6" },
  ],
  classAvg: 68,
  spotlight: [
    { name: "Aisha K.", initial: "A", score: 94, up: true },
    { name: "Marcus T.", initial: "M", score: 91, up: true },
    { name: "Sofia R.", initial: "S", score: 88, up: null },
    { name: "Liam P.", initial: "L", score: 52, up: false },
  ],
  alerts: [
    { level: "error", message: "Students with zero activity (5 days)", affected: 6 },
    { level: "warning", message: "Weak performance in Wave Optics", affected: 14 },
    { level: "info", message: "Assignments pending review", affected: 9 },
  ],
  quickActions: ["Create Quiz", "Assign Homework", "Upload Documents"],
  aiConfig: [
    { label: "Focus subject", value: "Physics" },
    { label: "Grade level", value: "Grade 12" },
    { label: "Difficulty bias", value: "Adaptive" },
  ],
};

export const ADMIN_DATA = {
  stats: [
    { label: "Total Students", value: "120", delta: "+8 this week", up: true },
    { label: "Documents", value: "45", delta: "+3 today", up: true },
    { label: "Questions Analyzed", value: "1,240", delta: "+124 today", up: true },
    { label: "Avg. Engagement", value: "68%", delta: "-4% vs last wk", up: false },
  ],
  engagementTrend: [72, 85, 78, 90, 65, 40, 38],
  trendLabels: ["M", "T", "W", "T", "F", "S", "S"],
  alerts: [
    { level: "error", message: "Students with zero activity (7 days)", affected: 14 },
    { level: "warning", message: "Low engagement in Math department", affected: 32 },
    { level: "info", message: "New documents pending indexing", affected: 5 },
  ],
  quickActions: ["Generate Report", "Add Users", "Upload Documents"],
  aiConfig: [
    { label: "Analysis depth", value: "Deep" },
    { label: "Data scope", value: "All Dept." },
    { label: "Alert sensitivity", value: "High" },
  ],
};