import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get("topic");
    const studentId = searchParams.get("student_id");
    let url = `${BACKEND_URL}/learning/content`;
    const backendParams = new URLSearchParams();
    if (topic) backendParams.append("topic", topic);
    if (studentId) backendParams.append("student_id", studentId);
    
    const q = backendParams.toString();
    if (q) url += `?${q}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { detail: "Backend server is not reachable." },
      { status: 503 }
    );
  }
}
