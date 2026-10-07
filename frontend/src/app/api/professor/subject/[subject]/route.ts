import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8001";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ subject: string }> }
) {
  try {
    // We must await the params object in Next.js 15+
    const params = await context.params;
    const { subject } = params;

    const response = await fetch(`${BACKEND_URL}/professor/subject/${subject}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Backend returned ${response.status} for /professor/subject/${subject}`);
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching professor analytics:", error);
    return NextResponse.json(
      { error: "Failed to connect to backend" },
      { status: 500 }
    );
  }
}
