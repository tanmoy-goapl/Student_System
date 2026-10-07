import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8001";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("student_id");
    const classId = searchParams.get("class_id");
    if (!studentId) {
      return NextResponse.json({ detail: "student_id is required" }, { status: 400 });
    }
    
    let url = `${BACKEND_URL}/practice/data`;
    const backendParams = new URLSearchParams();
    if (studentId) backendParams.append("student_id", studentId);
    if (classId) backendParams.append("class_id", classId);
    
    if (backendParams.toString()) {
      url += `?${backendParams.toString()}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await response.json();

    // Fallback: manually map semesters from the local curriculum file if the backend didn't provide them
    try {
      if (data && data.subjects) {
        const configPath = path.join(process.cwd(), "..", "Backend", "config", "default_curriculum.json");
        if (fs.existsSync(configPath)) {
          const currStr = fs.readFileSync(configPath, "utf-8");
          const currData = JSON.parse(currStr);
          const semesterMap: Record<string, string> = {};
          
          for (const sem of (currData.semesters || [])) {
            if (sem.subjects) {
              for (const subjectName of Object.keys(sem.subjects)) {
                semesterMap[subjectName] = sem.title;
              }
            }
          }
          
          data.subjects = data.subjects.map((s: any) => {
             if (!s.semester && s.title && semesterMap[s.title]) {
                 s.semester = semesterMap[s.title];
             }
             return s;
          });
        }
      }
    } catch (e) {
      console.error("Failed to map semesters in Next.js backend:", e);
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { detail: "Backend server is not reachable." },
      { status: 503 }
    );
  }
}
