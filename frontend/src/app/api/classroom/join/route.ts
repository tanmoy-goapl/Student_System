import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export async function POST(request: Request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const body = await request.json();
    if (!body?.student_id) {
      return NextResponse.json({ success: false, error: "Missing student_id" }, { status: 400 });
    }
    const response = await fetch(`${BACKEND_URL}/classroom/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      return NextResponse.json({ success: false, error: "Request timed out. The server is taking too long to respond." }, { status: 504 });
    }
    return NextResponse.json({ success: false, error: "Backend request failed" }, { status: 500 });
  }
}
