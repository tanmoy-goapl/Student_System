import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const professorId = new URL(request.url).searchParams.get('professor_id') || '2';

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const response = await fetch(
      `${BACKEND_URL}/professor/student/${encodeURIComponent(studentId)}/profile?professor_id=${encodeURIComponent(professorId)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error(`Backend returned ${response.status} for professor student profile`);
      return NextResponse.json({ error: 'Backend error' }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('Error fetching professor student profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student profile' },
      { status: 500 }
    );
  }
}
