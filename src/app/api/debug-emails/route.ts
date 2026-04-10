import { NextResponse } from 'next/server';
import { listTestEmails } from '@/lib/debug-emails';

export async function GET() {
    const data = await listTestEmails();
    return NextResponse.json({ data });
}
