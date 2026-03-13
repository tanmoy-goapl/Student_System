import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// DELETE /api/chat/history/item?student_id=1&created_at=...
export async function DELETE(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const studentId = url.searchParams.get("student_id");
    const createdAt = url.searchParams.get("created_at");
    const role = url.searchParams.get("role") || "user";

    if (!studentId || !createdAt) {
      return NextResponse.json(
        { detail: "student_id and created_at are required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/chat/history-item?student_id=${encodeURIComponent(
        studentId
      )}&created_at=${encodeURIComponent(createdAt)}&role=${encodeURIComponent(
        role
      )}`,
      { method: "DELETE" }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { detail: "Backend not reachable." },
      { status: 503 }
    );
  }
}

