import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathStr = resolvedParams.path.join("/");
    const { searchParams } = new URL(req.url);
    
    let url = `${BACKEND_URL}/learning/${pathStr}`;
    const q = searchParams.toString();
    if (q) url += `?${q}`;

    const isStream = pathStr.endsWith("/stream");

    if (isStream) {
      const response = await fetch(url, {
        method: "GET",
        headers: { "Accept": "text/event-stream" },
        cache: "no-store",
        signal: req.signal,
      });
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
        },
      });
    }

    const response = await fetch(url, {
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


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathStr = resolvedParams.path.join("/");
    const body = await req.json();

    const response = await fetch(`${BACKEND_URL}/learning/${pathStr}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { detail: "Backend server is not reachable. Please try again." },
      { status: 503 }
    );
  }
}
