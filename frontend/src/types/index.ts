// ── Auth ──────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user_id: number;
  role: "student" | "admin" | "teacher";
  message: string;
  name?: string | null;
  email?: string;
}

// ── Upload ────────────────────────────────────────────────
export interface UploadResponse {
  message: string;
  document_id: number;
  filename: string;
  chunks_created: number;
}

// ── Chat ──────────────────────────────────────────────────
export interface ChatRequest {
  student_id: number;
  question: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  answer: string;
  history: Message[];
}

// ── API Error ─────────────────────────────────────────────
export interface ApiError {
  detail: string;
}
