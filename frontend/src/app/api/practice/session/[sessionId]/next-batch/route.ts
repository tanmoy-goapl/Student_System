import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const studentId = req.nextUrl.searchParams.get("student_id");
    if (!studentId) {
      return NextResponse.json({ detail: "student_id is required" }, { status: 400 });
    }
    const response = await fetch(
      `${BACKEND_URL}/practice/session/${sessionId}/next-batch?student_id=${encodeURIComponent(studentId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { detail: "Backend server is not reachable." },
      { status: 503 }
    );
  }
}
