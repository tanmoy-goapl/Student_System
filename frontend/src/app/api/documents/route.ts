import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001"

// GET /api/documents?student_id=1
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("student_id");
    const response = await fetch(`${BACKEND_URL}/documents/${studentId}`);
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
    const response = await fetch(`${BACKEND_URL}/documents/${documentId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Backend not reachable." }, { status: 503 });
  }
}

