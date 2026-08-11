import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.90.95:8001";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectName: string }> }
) {
  try {
    const { subjectName } = await params;
    
    // Extract student_id from the query string
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const classId = searchParams.get("class_id");
    
    if (!studentId) {
      return NextResponse.json(
        { success: false, message: "student_id is required" },
        { status: 400 }
      );
    }
    
    const classQuery = classId ? `?class_id=${encodeURIComponent(classId)}` : "";
    const response = await fetch(
      `${BACKEND_URL}/courses/subject/${encodeURIComponent(subjectName)}/${studentId}${classQuery}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching subject data:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
