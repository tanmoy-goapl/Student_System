import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ class_id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { class_id } = resolvedParams;
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/classroom/${class_id}/regenerate_curriculum`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Backend request failed" }, { status: 500 });
  }
}
