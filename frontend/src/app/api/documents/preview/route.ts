import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const documentId = req.nextUrl.searchParams.get("document_id");
    const userId = req.nextUrl.searchParams.get("user_id");
    if (!documentId || !userId) {
      return NextResponse.json({ detail: "document_id and user_id are required" }, { status: 400 });
    }

    const response = await fetch(
      BACKEND_URL + "/documents/preview/" + encodeURIComponent(documentId) + "?user_id=" + encodeURIComponent(userId),
      { method: "GET", cache: "no-store" }
    );
    const body = await response.text();
    const contentType = response.headers.get("content-type") || "text/plain; charset=utf-8";

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || "Failed to fetch document preview" },
      { status: 502 }
    );
  }
}
