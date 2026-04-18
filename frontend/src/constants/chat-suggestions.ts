type Suggestion = {
  h: string;
  t?: string; // 👈 optional
};

export const ROLE_SUGGESTIONS: Record<
  "admin" | "student" | "professor",
  Suggestion[]
> = {
  admin: [
    { h: "Which classes are underperforming?", t: "See ranked class list by score" },
    { h: "Compare teacher performance", t: "Side-by-side teacher metrics" },
    { h: "Identify low engagement students", t: "At-risk learners by activity" },
    { h: "Generate performance report", t: "Structured institutional report" },
    { h: "Suggest improvements", t: "AI-recommended action plan" },
    { h: "Usage analytics overview", t: "Platform activity breakdown" },
  ],

  student: [
    { h: "Resume optimization" },
    { h: "Strengthen weak areas" },
    { h: "Personalized training curriculum" },
    { h: "Explain simply" },
  ],

  professor: [
    { h: "Which students are struggling?", t: "See at-risk learners ranked by performance" },
    { h: "Generate a quiz", t: "Auto-create questions from your materials" },
    { h: "Create an assignment", t: "Structured problem set for your class" },
    { h: "Explain a topic simply", t: "Student-friendly breakdown of any concept" },
    { h: "Summarize a topic", t: "Concise notes from documents or textbook" },
  ],
};