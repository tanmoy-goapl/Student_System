import { execSync } from 'child_process';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const stdout = execSync('cd ../../Backend && git checkout -- routes/practice.py').toString();
    return NextResponse.json({ stdout });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
