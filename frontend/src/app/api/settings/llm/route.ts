import { NextRequest, NextResponse } from "next/server";

// Proxy to backend /settings/llm (reuse same env name as other API routes)
const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001"

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/settings/llm`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { detail: "Backend server is not reachable." },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/settings/llm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { detail: "Backend server is not reachable." },
      { status: 503 }
    );
  }
}

