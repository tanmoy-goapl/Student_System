import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const roadmapId = searchParams.get("roadmap_id");
    
    if (!studentId) {
      return NextResponse.json({ detail: "student_id is required" }, { status: 400 });
    }

    const query = roadmapId ? `?roadmap_id=${roadmapId}` : "";
    const response = await fetch(`${BACKEND_URL}/api/roadmap/current/${studentId}${query}`, {
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
