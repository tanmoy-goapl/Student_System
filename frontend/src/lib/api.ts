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
  role: "student" | "admin" = "student",
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
  file: File
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("student_id", String(studentId));
  form.append("file", file);
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
