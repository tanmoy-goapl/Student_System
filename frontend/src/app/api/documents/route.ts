import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001"

// GET /api/documents?student_id=1
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("student_id");
    if (!studentId) {
      return NextResponse.json({ detail: "student_id is required" }, { status: 400 });
    }
    const response = await fetch(`${BACKEND_URL}/documents/${encodeURIComponent(studentId)}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// DELETE /api/documents?document_id=5
export async function DELETE(req: NextRequest) {
  try {
    const documentId = req.nextUrl.searchParams.get("document_id");
    const userId = req.nextUrl.searchParams.get("user_id");
    if (!documentId || !userId) {
      return NextResponse.json({ detail: "document_id and user_id are required" }, { status: 400 });
    }
    const response = await fetch(`${BACKEND_URL}/documents/${encodeURIComponent(documentId)}?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Backend not reachable." }, { status: 503 });
  }
}

