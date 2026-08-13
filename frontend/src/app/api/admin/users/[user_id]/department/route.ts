import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const { user_id } = await params;
    const body = await req.json();
    const response = await fetch(BACKEND_URL + "/admin/users/" + user_id + "/department", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Backend server is not reachable." }, { status: 503 });
  }
}
