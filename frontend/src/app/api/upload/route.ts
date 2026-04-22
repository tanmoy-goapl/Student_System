import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://10.10.90.95:8001"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const response = await fetch(`${BACKEND_URL}/upload`, {
      method: "POST",
      body: formData,
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

