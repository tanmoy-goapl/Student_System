import type {
  LoginRequest,
  AuthResponse,
  UploadResponse,
  ChatRequest,
  ChatResponse,
} from "@/types";

// All requests go through Next.js API proxy routes (/api/*)
// so there are no CORS issues and no NEXT_PUBLIC_* env vars needed.

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || `Request failed (${res.status})`);
  }
  return data as T;
}

// -- Auth --

export async function login(body: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function register(body: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Admin: create user
export async function createUser(
  adminId: number,
  email: string,
  password: string,
  role: "student" | "admin" | "professor",
  name?: string,
  department?: string
): Promise<AuthResponse> {
  return request<AuthResponse>("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admin_id: adminId, name, department, email, password, role }),
  });
}

// Admin: list all users (via Next.js proxy)
export async function listUsers(
  adminId: number
): Promise<{ id: number; name: string | null; department: string | null; email: string; role: string; is_active: boolean; created_at: string }[]> {
  return request("/api/admin/users?admin_id=" + encodeURIComponent(String(adminId)), {
    method: "GET",
  });
}

// Admin: delete user (via Next.js proxy)
export async function deleteUser(adminId: number, userId: number): Promise<void> {
  await request(
    `/api/admin/users?user_id=${userId}&admin_id=${encodeURIComponent(String(adminId))}`,
    { method: "DELETE" }
  );
}

// -- Upload --

export async function uploadDocument(
  studentId: number,
  file: File,
  readableBy: string = "owner"        // ← ADD THIS
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("student_id", String(studentId));
  form.append("file", file);
  form.append("readable_by", readableBy);   // ← ADD THIS
  return request<UploadResponse>("/api/upload", { method: "POST", body: form });
}

// -- Chat --

export async function askQuestion(body: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// -- Settings: LLM selection --

export type LLMProvider = "gpt4o" | "llama";

export async function getLlmConfig(): Promise<{ provider: LLMProvider }> {
  return request<{ provider: LLMProvider }>("/api/settings/llm", {
    method: "GET",
  });
}

export async function updateLlmConfig(
  provider: LLMProvider
): Promise<{ provider: LLMProvider }> {
  return request<{ provider: LLMProvider }>("/api/settings/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
}

// -- AI Actions Cards --

export interface AIActionCardResponse {
  id: string;
  title: string;
  subtitle: string;
  action: string;
  iconName: string;
  iconClassName: string;
  cardClassName: string;
}

export async function getAIActions(): Promise<AIActionCardResponse[]> {
  return request<AIActionCardResponse[]>("/api/cards", {
    method: "GET",
  });
}

// -- Performance Sidebar --

export interface PerformanceSidebarResponse {
  insights: { id: number; color: string; iconName: string; text: string }[];
  weakTopics: { name: string; subject: string; questionsCount: number; percentage: number }[];
  statCards: { title: string; value: string; subtitle: string; color: string }[];
  actionCards: { title: string; subtitle: string; tag: string; color: string }[];
  readiness: { subject: string; value: number }[];
}

export async function getPerformanceSidebar(): Promise<PerformanceSidebarResponse> {
  return request<PerformanceSidebarResponse>("/api/performance/sidebar", {
    method: "GET",
  });
}

// -- Performance Main --

export interface PerformanceMainResponse {
  stats: {
    title: string;
    value: string;
    subtitle: string;
    badge: string;
    iconName: string;
    valueColor: string;
    iconColor: string;
  }[];
  mastery: {
    id: string;
    subject: string;
    iconName: string;
    progress: number;
    progressColor: string;
    topics: { name: string; progress: number; status: string }[];
  }[];
  trend: {
    labels: string[];
    accuracy: number[];
    practiceVolume: number[];
  };
}

export async function getPerformanceMain(): Promise<PerformanceMainResponse> {
  return request<PerformanceMainResponse>("/api/performance/main", {
    method: "GET",
  });
}

// -- Homepage Data --

export interface HomepageDataResponse {
  examOverview: any[];
  mentorCard: any;
  weaknessMap: any;
  studyPlan: any;
  performanceSnapshots: any[];
  aiAlerts: any[];
}

export async function getHomepageData(): Promise<HomepageDataResponse> {
  return request<HomepageDataResponse>("/api/homepage/data", {
    method: "GET",
  });
}

// -- Career Data --

export interface CareerDataResponse {
  careerKpi: any[];
  aiActions: any[];
  mockJobs: any[];
  mockSuggestions: any[];
  mockPhases: any[];
  mockInterviewQuestions: any[];
  skillGapData: any[];
  marketInsightsData: any[];
  aiRecommendationsData: any[];
  placementReadinessData: any;
  progressTrackingData: any[];
}

export async function getCareerData(): Promise<CareerDataResponse> {
  return request<CareerDataResponse>("/api/career/data", {
    method: "GET",
  });
}

// -- Practice Data --

export interface PracticeDataResponse {
  practiceModes: any[];
  subjects: any[];
  difficulties: any[];
  sessionStats: any;
  sampleQuestions: any[];
}

export async function getPracticeData(): Promise<PracticeDataResponse> {
  return request<PracticeDataResponse>("/api/practice/data", {
    method: "GET",
  });
}

// -- Learning Data --

export interface LearningDataResponse {
  sidebarData: any[];
  notesResponse: any;
  headerResponse: any;
  learningAssistantResponse: any;
  rightSidebarData: any;
}

export async function getLearningData(): Promise<LearningDataResponse> {
  return request<LearningDataResponse>("/api/learning/data", {
    method: "GET",
  });
}

// -- Documents Data --

export interface DocumentsDataResponse {
  kpis: any[];
  workspaces: any[];
  documents: any[];
}

export async function getDocumentsData(): Promise<DocumentsDataResponse> {
  return request<DocumentsDataResponse>("/api/documents/data", {
    method: "GET",
  });
}

// -- Settings Data --

export interface SettingsDataResponse {
  defaultModes: any[];
  responseStyles: any[];
  tones: any[];
}

export async function getSettingsData(): Promise<SettingsDataResponse> {
  return request<SettingsDataResponse>("/api/settings/data", {
    method: "GET",
  });
}

// -- Chat Sidebar Data --

export interface ChatSidebarDataResponse {
  STUDENT_DATA: any;
  PROFESSOR_DATA: any;
  ADMIN_DATA: any;
  ROLE_SUGGESTIONS: any;
}

export async function getChatSidebarData(): Promise<ChatSidebarDataResponse> {
  return request<ChatSidebarDataResponse>("/api/chat-sidebar/data", {
    method: "GET",
  });
}

