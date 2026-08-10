export interface PracticeMode {
  id: string;
  icon: string;
  title: string;
  description: string;
  isCurrent?: boolean;
}

export interface Difficulty {
  label: string;
  value: string;
}

export interface Subject {
  id: string;
  title: string;
  icon: string;
  color: string;
  weakAreas?: string[];
  practicedTopics?: string[];
  topics?: string[];
  isExpanded?: boolean;
  section?: string;
  semester?: string;
}

export interface SessionStats {
  attempted: number;
  accuracy: number;
  time: string;
  progress: number;
  total: number;
}

export interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: number;
  number: number;
  totalQuestions: number;
  category: string;
  topic: string;
  difficulty: string;
  mode: string;
  description: string;
  questionText: string;
  answers: Answer[];
  progressColor: string;
}

export interface SubmittedAnswer {
  questionId: number;
  answerId: string;
  isCorrect: boolean;
  timestamp: Date;
}

export interface SessionProgress {
  currentQuestion: number;
  totalQuestions: number;
  correctAnswers: number;
  skippedQuestions: number;
  timeElapsed: number;
  accuracy: number;
}

export const PRACTICE_MODES: PracticeMode[] = [
  {
    id: "weakness",
    icon: "alert-circle",
    title: "Weakness-Based",
    description: "AI targets your weak areas",
    isCurrent: true,
  },
  {
    id: "topic",
    icon: "book-2",
    title: "Topic-Based",
    description: "Practice a specific topic",
  },
  {
    id: "exam",
    icon: "clipboard-check",
    title: "Exam Simulation",
    description: "Full mock exam experience",
  },
  {
    id: "revision",
    icon: "bookmark",
    title: "Revision Mode",
    description: "Revisit bookmarked topics",
  },
];

// practicepage-data.ts

export interface Subject {
  id: string;
  title: string;
  icon: string;
  color: string;
  weakAreas?: string[];
  topics?: string[];
  isExpanded?: boolean;
  section?: string;
  semester?: string;
}

export const SUBJECTS: Subject[] = [
  {
    id: "physics",
    title: "Physics",
    icon: "Flask",
    color: "#a78bfa",

    weakAreas: [
      "Wave Optics",
      "Electrostatics",
      "Current Electricity",
      "Ray Optics",
      "Magnetism",
      "Modern Physics",
      "Thermodynamics",
      "Kinematics",
    ],

    isExpanded: true,
  },

  {
    id: "mathematics",
    title: "Mathematics",
    icon: "Function",
    color: "#60a5fa",

    weakAreas: [
      "Integration",
      "Differentiation",
      "Probability",
      "Matrices",
      "Determinants",
      "Complex Numbers",
      "Vector Algebra",
      "3D Geometry",
    ],

    isExpanded: false,
  },

  {
    id: "chemistry",
    title: "Chemistry",
    icon: "Molecule2",
    color: "#14b8a6",

    weakAreas: [
      "Organic Chemistry",
      "Chemical Bonding",
      "Electrochemistry",
      "Coordination Compounds",
      "Thermodynamics",
      "Redox Reactions",
      "Hydrocarbons",
      "Equilibrium",
    ],

    isExpanded: false,
  },
];
export const DIFFICULTIES: Difficulty[] = [
  { label: "Easy", value: "easy" },
  { label: "Mixed", value: "mixed" },
  { label: "Hard", value: "hard" },
];

export const SESSION_STATS: SessionStats = {
  attempted: 6,
  accuracy: 67,
  time: "18m",
  progress: 30,
  total: 40,
};

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 1,
    number: 1,
    totalQuestions: 20,
    category: "PHYSICS",
    topic: "Wave Optics",
    difficulty: "Hard",
    mode: "Weakness-Based",
    description:
      "AI-curated question",
    questionText:
      "In Young's double-slit experiment, the slits are separated by 0.5 mm and the screen is placed 1.0 m away. If monochromatic light of wavelength 600 nm is used, what is the fringe width?",
    answers: [
      { id: "A", text: "0.6 mm", isCorrect: false },
      { id: "B", text: "1.2 mm", isCorrect: true },
      { id: "C", text: "0.3 mm", isCorrect: false },
      { id: "D", text: "2.4 mm", isCorrect: false },
    ],
    progressColor: "bg-gradient-to-r from-emerald-500 via-cyan-500 to-red-500",
  },
];