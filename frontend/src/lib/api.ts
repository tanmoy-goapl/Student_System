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

export interface DepartmentOption {
  id: number | string;
  code: string;
  name: string;
  is_active?: boolean;
  student_count?: number;
  professor_count?: number;
  course_count?: number;
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
): Promise<{ id: number; name: string | null; department: string | null; department_name?: string | null; email: string; role: string; is_active: boolean; created_at: string }[]> {
  return request("/api/admin/users?admin_id=" + encodeURIComponent(String(adminId)), {
    method: "GET",
  });
}

export async function listAdminDepartments(adminId: number): Promise<DepartmentOption[]> {
  return request<DepartmentOption[]>("/api/admin/departments?admin_id=" + encodeURIComponent(String(adminId)), {
    method: "GET",
  });
}

export async function createDepartment(
  adminId: number,
  code: string,
  name: string
): Promise<DepartmentOption> {
  return request<DepartmentOption>("/api/admin/departments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admin_id: adminId, code, name }),
  });
}

export async function updateUserDepartment(
  adminId: number,
  userId: number,
  department: string | null
): Promise<{ id: number; department: string | null; department_name?: string | null }> {
  return request("/api/admin/users/" + userId + "/department", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admin_id: adminId, department }),
  });
}

export async function listClassroomDepartments(professorId?: number): Promise<DepartmentOption[]> {
  const query = professorId ? "?professor_id=" + encodeURIComponent(String(professorId)) : "";
  const data = await request<{ departments: DepartmentOption[] }>("/api/classroom/departments" + query, {
    method: "GET",
  });
  return data.departments;
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
  form.append("readable_by", readableBy);
  return request<UploadResponse>("/api/upload", { method: "POST", body: form });
}

// -- Chat --

export async function updateDailyGoal(userId: number, pointsToAdd: number, subjectName: string) {
    return request<any>("/api/settings/daily-goal", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, points: pointsToAdd, subject: subjectName })
    });
}

// -- Classroom Curriculum API --

export async function uploadClassCurriculum(classId: number, file: File, userId: number) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId.toString());
    
    const res = await fetch(`/api/classroom/${classId}/curriculum/upload`, {
        method: "POST",
        body: formData,
    });
    
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
}

export async function getClassCurriculum(classId: number, userId: number) {
    return request<any>(`/api/classroom/${classId}/curriculum?user_id=${userId}`, {
        method: "GET",
    });
}

export async function regenerateClassCurriculum(classId: number, userId: number) {
    return request<any>(`/api/classroom/${classId}/curriculum/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
    });
}

export async function updateClassCurriculum(classId: number, curriculumData: any, userId: number) {
    return request<any>(`/api/classroom/${classId}/curriculum`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, curriculum: curriculumData })
    });
}

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

export async function getAIActions(studentId?: string | number): Promise<AIActionCardResponse[]> {
  const url = studentId ? `/api/cards?student_id=${studentId}` : "/api/cards";
  return request<AIActionCardResponse[]>(url, {
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

export async function getPerformanceSidebar(studentId?: string | number): Promise<PerformanceSidebarResponse> {
  const url = studentId ? `/api/performance/sidebar?student_id=${studentId}` : "/api/performance/sidebar";
  return request<PerformanceSidebarResponse>(url, {
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

export async function getPerformanceMain(studentId?: string | number): Promise<PerformanceMainResponse> {
  const url = studentId ? `/api/performance/main?student_id=${studentId}` : "/api/performance/main";
  return request<PerformanceMainResponse>(url, {
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
  aiBehavioralInsights?: any[];
  dashboard_health?: string;
  revisionQueue?: any[];
  pending_dues?: {
    total: number;
    revision_due: number;
    quiz_due: number;
    reasons?: string[];
  };
  todays_focus?: {
    topic: string;
    reason: string;
    confidence: number;
    estimated_time: number;
  };
}

export async function getHomepageData(studentId?: string | number): Promise<HomepageDataResponse> {
  const url = studentId ? `/api/homepage/data?student_id=${studentId}` : "/api/homepage/data";
  return request<HomepageDataResponse>(url, {
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

export const getPracticeData = async (studentId?: number, classId?: number): Promise<PracticeDataResponse> => {
    const timestamp = new Date().getTime();
    const params = new URLSearchParams();
    if (studentId) params.append("student_id", studentId.toString());
    if (classId) params.append("class_id", classId.toString());
    params.append("_t", timestamp.toString());
    
    const url = `/api/practice/data?${params.toString()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to load practice data");
    return res.json();
};

// -- Practice Session --

export interface PracticeQuestion {
  id: number;
  topic: string;
  subtopic: string;
  difficulty: string;
  question: string;
  options: { id: string; text: string }[];
}

export interface StartSessionResponse {
  session_id: number;
  mode: string;
  topic: string;
  difficulty: string;
  total_questions: number;
  questions: PracticeQuestion[];
}

export async function startPracticeSession(
  studentId: number,
  mode: string,
  topic?: string,
  difficulty?: string,
  questionCount?: number
): Promise<StartSessionResponse> {
  return request<StartSessionResponse>("/api/practice/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_id: studentId,
      mode,
      topic: topic || undefined,
      difficulty: difficulty || "mixed",
      question_count: questionCount || 5,
    }),
  });
}

export interface SubmitAnswerResponse {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  stats: {
    total_questions: number;
    answered: number;
    correct: number;
    accuracy: number;
    streak: number;
    points: number;
    avg_time_seconds: number;
    total_time_seconds: number;
  };
}

export async function submitPracticeAnswer(
  sessionId: number,
  questionId: number,
  answer: string,
  timeSpent: number
): Promise<SubmitAnswerResponse> {
  return request<SubmitAnswerResponse>(`/api/practice/session/${sessionId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question_id: questionId,
      answer,
      time_spent: timeSpent,
    }),
  });
}

export interface NextBatchResponse {
  questions: PracticeQuestion[];
  session_complete: boolean;
  difficulty?: string;
  stats?: any;
}

export async function getNextBatch(sessionId: number): Promise<NextBatchResponse> {
  return request<NextBatchResponse>(`/api/practice/session/${sessionId}/next-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export async function getSessionStatus(sessionId: number): Promise<any> {
  return request<any>(`/api/practice/session/${sessionId}/status`, {
    method: "GET",
  });
}

// -- Practice Topics & Performance --

export async function fetchDocumentAnalytics(
  docId: string
) {
  return request<{
    success: boolean;
    data: any;
  }>(`/api/documents/analytics?doc_id=${docId}`, {
    method: "GET",
  });
}

// ------------------------------------------------------------------
// CLASSROOM
// ------------------------------------------------------------------

export async function createClass(data: { name: string; course_code: string; department?: string; professor_id: number }) {
  return request<{
    success: boolean;
    class_id: number;
    code: string;
    course_code: string;
    department?: string;
    name: string;
  }>("/api/classroom/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteClass(classId: number, userId: number) {
  return request<{
    success: boolean;
    message: string;
  }>(`/api/classroom/${classId}?user_id=${userId}`, {
    method: "DELETE"
  });
}

export async function joinClass(data: { code: string; student_id: number }) {
  return request<{
    success: boolean;
    class_id: number;
    name: string;
    message?: string;
  }>("/api/classroom/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getMyClasses(userId: number) {
  return request<{
    success: boolean;
    role: string;
    classes: any[];
  }>(`/api/classroom/my_classes/${userId}`, {
    method: "GET",
  });
}

export async function deleteClassroom(classId: number, userId: number) {
  return request<{
    success: boolean;
    message?: string;
  }>(`/api/classroom/${classId}?user_id=${userId}`, {
    method: "DELETE",
  });
}

export async function getClassDetails(classId: number, userId: number) {
  return request<{
    success: boolean;
    class_id: number;
    name: string;
    code: string;
    course_code?: string;
    department?: "CS" | "AI";
    professor_name: string;
    student_count: number;
    created_at: string;
  }>(`/api/classroom/${classId}?user_id=${userId}`, {
    method: "GET",
  });
}

export async function uploadClassResource(classId: number, file: File, title: string, type: string, userId: number) {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  form.append("type", type);
  form.append("user_id", String(userId));
  
  return request<{
    success: boolean;
    resource?: {
      id: number;
      title: string;
      type: string;
    };
  }>(`/api/classroom/${classId}/resources/upload`, {
    method: "POST",
    body: form,
  });
}

export async function getClassResources(classId: number, userId: number) {
  return request<{
    success: boolean;
    resources: any[];
  }>(`/api/classroom/${classId}/resources?user_id=${userId}`, {
    method: "GET",
  });
}

export async function deleteClassResource(resourceId: number, userId: number) {
  return request<{
    success: boolean;
  }>(`/api/classroom/resource/${resourceId}?user_id=${userId}`, {
    method: "DELETE",
  });
}



export async function getStudentTopics(studentId: number): Promise<any> {
  return request<any>(`/api/practice/topics/${studentId}`, {
    method: "GET",
  });
}

export interface PracticePerformanceResponse {
  overall_accuracy: number;
  total_attempts: number;
  total_correct: number;
  weak_topics: {
    topic: string;
    subject: string;
    accuracy: number;
    reason?: string;
  }[];
  insights: {
    type: string;
    title: string;
    description: string;
    frequency: number;
  }[];
  topic_performances: any[];
  adaptive_engine?: {
    recommended_difficulty: string;
    study_pace: string;
    focus_topic: string;
    last_active: string;
  };
  suggested_next?: {
    title: string;
    topic: string;
    reason: string;
    action_url: string;
  }[];
}

export async function getStudentPerformance(studentId: number): Promise<PracticePerformanceResponse> {
  return request<PracticePerformanceResponse>(`/api/practice/performance/${studentId}`, {
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
  selectedTopic: string;
  selectedSubject?: string;
  quickActions?: any[];
}

export async function getLearningData(
  topic?: string, 
  studentId?: number, 
  subject?: string, 
  roadmapId?: number, 
  source?: string, 
  classId?: number,
  signal?: AbortSignal,
  skipSidebar?: boolean
): Promise<LearningDataResponse> {
  let url = "/api/learning/data";
  const params = new URLSearchParams();
  if (topic) params.append("topic", topic);
  if (studentId) params.append("student_id", studentId.toString());
  if (subject) params.append("subject", subject);
  if (roadmapId) params.append("roadmap_id", roadmapId.toString());
  if (source) params.append("source", source);
  if (classId) params.append("class_id", classId.toString());
  if (skipSidebar) params.append("skip_sidebar", "true");
  
  const q = params.toString();
  if (q) url += `?${q}`;
  
  return request<LearningDataResponse>(url, {
    method: "GET",
    signal,
  });
}

export interface LearningContentResponse {
  notesResponse: any;
  revision: any;
}

export async function getLearningContent(topic?: string, studentId?: number, subject?: string): Promise<LearningContentResponse> {
  let url = "/api/learning/content";
  const params = new URLSearchParams();
  if (topic) params.append("topic", topic);
  if (studentId) params.append("student_id", studentId.toString());
  if (subject) params.append("subject", subject);
  
  const q = params.toString();
  if (q) url += `?${q}`;
  
  return request<LearningContentResponse>(url, {
    method: "GET",
  });
}

export async function streamLearningContent(
  topic: string, 
  studentId: number, 
  subject?: string, 
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
  bypassCache: boolean = false
): Promise<string> {
  let url = "/api/learning/stream_content";
  const params = new URLSearchParams();
  params.append("topic", topic);
  params.append("student_id", studentId.toString());
  if (subject) params.append("subject", subject);
  if (bypassCache) params.append("bypass_cache", "true");
  
  const q = params.toString();
  if (q) url += `?${q}`;
  
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(url, {
    method: "GET",
    headers,
    signal
  });

  if (!response.body) throw new Error("ReadableStream not yet supported in this browser.");
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let isStreamActive = true;

  const handleAbort = () => {
    if (!isStreamActive) return;
    try {
      reader.cancel().catch(() => {});
    } catch (e) {}
  };

  if (signal) {
    signal.addEventListener("abort", handleAbort);
  }

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException("The user aborted a request.", "AbortError");
      }
      const { done, value } = await reader.read();
      if (signal?.aborted) {
        throw new DOMException("The user aborted a request.", "AbortError");
      }
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      if (onChunk) onChunk(fullText);
    }
  } finally {
    isStreamActive = false;
    if (signal) {
      signal.removeEventListener("abort", handleAbort);
    }
    try {
      reader.releaseLock();
    } catch (e) {}
  }
  
  return fullText;
}

export async function streamGenerateMaterial(
  topic: string,
  subject: string,
  userId: number,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
  classroomId?: string
): Promise<string> {
  let url = "/api/learning/generate_material/stream";
  const params = new URLSearchParams();
  params.append("topic", topic);
  params.append("subject", subject);
  params.append("user_id", userId.toString());
  if (classroomId) {
    params.append("classroom_id", classroomId);
  }
  const q = params.toString();
  if (q) url += `?${q}`;

  const response = await fetch(url, { method: "GET", signal });
  if (!response.body) throw new Error("ReadableStream not supported.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    if (onChunk) onChunk(fullText);
  }
  return fullText;
}

export async function streamExplainSimpler(
  studentId: number, 
  topicName: string, 
  onChunk?: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  let url = "/api/learning/explain/stream";
  const params = new URLSearchParams();
  params.append("student_id", studentId.toString());
  params.append("topic_name", topicName);
  const q = params.toString();
  if (q) url += `?${q}`;
  const response = await fetch(url, { method: "GET", signal });
  if (!response.body) throw new Error("ReadableStream not supported.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    if (onChunk) onChunk(fullText);
  }
  return fullText;
}

export async function streamGiveExamples(
  studentId: number, 
  topicName: string, 
  onChunk?: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  let url = "/api/learning/examples/stream";
  const params = new URLSearchParams();
  params.append("student_id", studentId.toString());
  params.append("topic_name", topicName);
  const q = params.toString();
  if (q) url += `?${q}`;
  const response = await fetch(url, { method: "GET", signal });
  if (!response.body) throw new Error("ReadableStream not supported.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    if (onChunk) onChunk(fullText);
  }
  return fullText;
}

export async function streamDocumentSummaryExample(
  professorId: number,
  documentId: string,
  onChunk?: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const cleanDocumentId = documentId.replace(/^db-/, "");
  const params = new URLSearchParams({
    professor_id: professorId.toString(),
    document_id: cleanDocumentId,
  });
  const response = await fetch(
    "/api/learning/summary-example/stream?" + params.toString(),
    { method: "GET", signal }
  );
  if (!response.ok) {
    let detail = "Failed to generate summary.";
    try {
      const error = await response.json();
      detail = error.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  if (!response.body) throw new Error("ReadableStream not supported.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    if (onChunk) onChunk(fullText);
  }
  return fullText;
}

export async function streamFlashcards(
  studentId: number, 
  topicName: string, 
  onChunk?: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  let url = "/api/learning/flashcard/stream";
  const params = new URLSearchParams();
  params.append("student_id", studentId.toString());
  params.append("topic_name", topicName);
  const q = params.toString();
  if (q) url += `?${q}`;
  const response = await fetch(url, { method: "GET", signal });
  if (!response.body) throw new Error("ReadableStream not supported.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    if (onChunk) onChunk(fullText);
  }
  return fullText;
}


export async function explainSimpler(studentId: number, topicName: string, topicContent?: string): Promise<any> {
  return request<any>("/api/learning/explain", {
    method: "POST",
    body: JSON.stringify({ student_id: studentId, topic_name: topicName, topic_content: topicContent }),
  });
}

export async function giveExamples(studentId: number, topicName: string, topicContent?: string): Promise<any> {
  return request<any>("/api/learning/examples", {
    method: "POST",
    body: JSON.stringify({ student_id: studentId, topic_name: topicName, topic_content: topicContent }),
  });
}

export async function summarizeTopic(studentId: number, topicName: string, topicContent?: string): Promise<any> {
  return request<any>("/api/learning/summarize", {
    method: "POST",
    body: JSON.stringify({ student_id: studentId, topic_name: topicName, topic_content: topicContent }),
  });
}

export async function getCheatSheet(studentId: number, topicName: string, topicContent?: string): Promise<any> {
  return request<any>("/api/learning/cheatsheet", {
    method: "POST",
    body: JSON.stringify({ student_id: studentId, topic_name: topicName, topic_content: topicContent }),
  });
}

export async function saveNotes(studentId: number, topicName: string, generatedNotes: string): Promise<any> {
  return request<any>("/api/learning/save-notes", {
    method: "POST",
    body: JSON.stringify({ student_id: studentId, topic_name: topicName, generated_notes: generatedNotes }),
  });
}

export async function addToRevision(studentId: number, topicName: string, priority: string = "high"): Promise<any> {
  return request<any>("/api/learning/revision", {
    method: "POST",
    body: JSON.stringify({ student_id: studentId, topic_name: topicName, priority }),
  });
}

// -- Documents Data --

export interface DocumentsDataResponse {
  kpis: any[];
  workspaces: any[];
  documents: any[];
}

export async function getDocumentsData(studentId?: number): Promise<DocumentsDataResponse> {
  const url = studentId ? `/api/documents/data?student_id=${studentId}` : "/api/documents/data";
  return request<DocumentsDataResponse>(url, {
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

export interface UserPreferences {
  default_mode: string;
  response_style: string;
  tone: string;
}

export async function getUserPreferences(): Promise<UserPreferences> {
  return request<UserPreferences>("/api/settings/preferences", {
    method: "GET",
  });
}

export async function updateUserPreferences(prefs: UserPreferences): Promise<UserPreferences> {
  return request<UserPreferences>("/api/settings/preferences", {
    method: "POST",
    body: JSON.stringify(prefs),
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

export async function deleteDocument(documentId: string): Promise<void> {
  const id = documentId.startsWith("db-") ? documentId.substring(3) : documentId;
  await request(`/api/documents?document_id=${id}`, {
    method: "DELETE",
  });
}

// -- Topic Completion --
export async function completeTopic(
  studentId: number,
  topic: string,
  taskType: "learning" | "quiz"
): Promise<{ success: boolean; message: string; already_completed?: boolean }> {
  return request("/api/roadmap/complete_topic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, topic, task_type: taskType }),
  });
}
