import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export async function GET(req: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/recent-activity`, {
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Backend server is not reachable." }, { status: 503 });
  }
}
