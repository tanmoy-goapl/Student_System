import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";
    
    const response = await fetch(`${BACKEND_URL}/api/roadmap/complete_topic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to complete topic" },
      { status: 500 }
    );
  }
}
