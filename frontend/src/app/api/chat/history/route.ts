import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001"

// GET /api/chat/history?student_id=1
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("student_id");
    const sessionId = req.nextUrl.searchParams.get("session_id");
    const url = sessionId 
      ? `${BACKEND_URL}/chat/history/${studentId}?session_id=${sessionId}`
      : `${BACKEND_URL}/chat/history/${studentId}`;
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// DELETE /api/chat/history?student_id=1
export async function DELETE(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("student_id");
    const sessionId = req.nextUrl.searchParams.get("session_id");
    const url = sessionId 
      ? `${BACKEND_URL}/chat/history/${studentId}?session_id=${sessionId}`
      : `${BACKEND_URL}/chat/history/${studentId}`;
    const response = await fetch(url, {
      method: "DELETE",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Backend not reachable." }, { status: 503 });
  }
}

