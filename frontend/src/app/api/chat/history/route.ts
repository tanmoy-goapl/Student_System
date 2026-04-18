import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://10.10.90.95:8000"

// GET /api/chat/history?student_id=1
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("student_id");
    const response = await fetch(`${BACKEND_URL}/chat/history/${studentId}`);
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
    const response = await fetch(`${BACKEND_URL}/chat/history/${studentId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Backend not reachable." }, { status: 503 });
  }
}

