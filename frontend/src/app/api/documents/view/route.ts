import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://10.10.90.95:8001"

// GET /api/documents/view?document_id=5
export async function GET(req: NextRequest) {
  try {
    const documentId = req.nextUrl.searchParams.get("document_id");
    if (!documentId) {
      return NextResponse.json({ detail: "document_id is required" }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/documents/view/${documentId}`);
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    // Get the file content and headers
    const blob = await response.blob();
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = response.headers.get("content-disposition") || "";

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || "Failed to fetch document" },
      { status: 500 }
    );
  }
}
