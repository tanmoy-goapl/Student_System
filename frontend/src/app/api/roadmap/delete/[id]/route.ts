import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = new URL(request.url).searchParams.get("student_id");
    if (!studentId) {
      return NextResponse.json({ detail: "student_id is required" }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/api/roadmap/delete/${id}?student_id=${encodeURIComponent(studentId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: "Backend server is not reachable." },
      { status: 503 }
    );
  }
}
