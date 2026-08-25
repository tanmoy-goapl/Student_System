import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001"

export async function POST(req: NextRequest) {
  try {
    const documentId = req.nextUrl.searchParams.get("document_id");
    const classroomId = req.nextUrl.searchParams.get("classroom_id");
    const userId = req.nextUrl.searchParams.get("user_id");
    if (!documentId || !classroomId || !userId) {
      return NextResponse.json({ detail: "document_id, classroom_id and user_id are required" }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/documents/publish?document_id=${documentId}&classroom_id=${classroomId}&user_id=${userId}`, {
      method: "POST",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Backend not reachable." }, { status: 503 });
  }
}
