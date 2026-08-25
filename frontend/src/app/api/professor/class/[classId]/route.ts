import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const resolvedParams = await params;
    const classId = resolvedParams.classId;
    const professorId = new URL(request.url).searchParams.get('professor_id');

    if (!classId || !professorId) {
      return NextResponse.json(
        { error: 'class_id and professor_id are required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/professor/class/${encodeURIComponent(classId)}/analytics?professor_id=${encodeURIComponent(professorId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`Backend returned ${response.status} for /professor/class/${classId}/analytics`);
      return NextResponse.json({ error: 'Backend error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching professor class analytics:", error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
