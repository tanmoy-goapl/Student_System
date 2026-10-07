import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("student_id");
    const timestamp = Date.now();
    
    if (!studentId) {
      return NextResponse.json(
        { error: "student_id is required" },
        { status: 400 }
      );
    }
    
    const url = `${BACKEND_URL}/analytics/data/${studentId}?_t=${timestamp}`;

    console.log("DEBUG: Fetching from backend URL ->", url);

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    
    console.log("DEBUG: Backend responded with status ->", response.status);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch from backend: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("DEBUG: Backend returned data ->", JSON.stringify(data).substring(0, 200));
    
    // Inject debug info into the response so the frontend can see it
    data._debug = {
      backend_url: url,
      status: response.status,
      raw_keys: Object.keys(data)
    };

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
