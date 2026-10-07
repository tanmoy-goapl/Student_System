import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

// GET /api/chat/sessions?student_id=1
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("student_id");
    if (!studentId) return NextResponse.json([], { status: 400 });
    const response = await fetch(`${BACKEND_URL}/chat/sessions/${studentId}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
