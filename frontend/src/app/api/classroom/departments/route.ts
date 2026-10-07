import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const professorId = req.nextUrl.searchParams.get("professor_id");
    if (!professorId) {
      return NextResponse.json({ detail: "professor_id is required" }, { status: 400 });
    }
    const query = "?professor_id=" + encodeURIComponent(professorId);
    const response = await fetch(BACKEND_URL + "/classroom/departments" + query, {
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Backend server is not reachable." }, { status: 503 });
  }
}
