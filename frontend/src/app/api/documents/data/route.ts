import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8001";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("student_id") || "1";
    const response = await fetch(`${BACKEND_URL}/documents/data?student_id=${studentId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
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
