import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// POST /api/admin/users  ->  POST /admin/users on backend
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await fetch(`${BACKEND_URL}/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Backend server is not reachable." }, { status: 503 });
  }
}

// GET /api/admin/users?admin_id=1  ->  GET /admin/users on backend
export async function GET(req: NextRequest) {
  try {
    const adminId = req.nextUrl.searchParams.get("admin_id");
    const response = await fetch(
      `${BACKEND_URL}/admin/users?admin_id=${encodeURIComponent(adminId || "")}`
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Backend server is not reachable." }, { status: 503 });
  }
}

// DELETE /api/admin/users?user_id=4&admin_id=1  ->  DELETE /admin/users/{user_id} on backend
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("user_id");
    const adminId = req.nextUrl.searchParams.get("admin_id");
    const response = await fetch(
      `${BACKEND_URL}/admin/users/${userId}?admin_id=${encodeURIComponent(adminId || "")}`,
      { method: "DELETE" }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ detail: "Backend server is not reachable." }, { status: 503 });
  }
}
