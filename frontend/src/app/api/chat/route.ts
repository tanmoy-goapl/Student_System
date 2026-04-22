import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://10.10.90.95:8001"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("student_id");
    const response = await fetch(`${BACKEND_URL}/chat/history/${studentId}`, {
      method: "DELETE",
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

