import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource_id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { resource_id } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    
    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing user_id" }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/classroom/resource/download/${resource_id}?user_id=${userId}`);
    
    if (!response.ok) {
        return NextResponse.json({ success: false, error: "Failed to download" }, { status: response.status });
    }

    // Forward the file response headers and body
    const headers = new Headers(response.headers);
    return new NextResponse(response.body, {
        status: response.status,
        headers,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Backend request failed" }, { status: 500 });
  }
}
