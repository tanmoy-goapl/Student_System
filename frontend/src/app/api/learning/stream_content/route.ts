import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get("topic");
    const studentId = searchParams.get("student_id");
    if (!studentId) {
      return NextResponse.json({ detail: "student_id is required" }, { status: 400 });
    }
    const subject = searchParams.get("subject");
    let url = `${BACKEND_URL}/learning/stream_content`;
    const backendParams = new URLSearchParams();
    if (topic) backendParams.append("topic", topic);
    backendParams.append("student_id", studentId);
    if (subject) backendParams.append("subject", subject);
    const bypassCache = searchParams.get("bypass_cache");
    if (bypassCache) backendParams.append("bypass_cache", bypassCache);
    
    const q = backendParams.toString();
    if (q) url += `?${q}`;
    
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: request.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        { detail: `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    // Return the streaming response directly
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { detail: "Backend server is not reachable." },
      { status: 503 }
    );
  }
}
