import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8001";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get("topic");
    const studentId = searchParams.get("student_id");
    if (!studentId) {
      return NextResponse.json({ detail: "student_id is required" }, { status: 400 });
    }
    const subject = searchParams.get("subject");
    const source = searchParams.get("source");
    const roadmapId = searchParams.get("roadmap_id");
    const classId = searchParams.get("class_id");
    const skipSidebar = searchParams.get("skip_sidebar");
    let url = `${BACKEND_URL}/learning/data`;
    const backendParams = new URLSearchParams();
    if (topic) backendParams.append("topic", topic);
    backendParams.append("student_id", studentId);
    if (subject) backendParams.append("subject", subject);
    if (source) backendParams.append("source", source);
    if (roadmapId) backendParams.append("roadmap_id", roadmapId);
    if (classId) backendParams.append("class_id", classId);
    if (skipSidebar) backendParams.append("skip_sidebar", skipSidebar);
    
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
