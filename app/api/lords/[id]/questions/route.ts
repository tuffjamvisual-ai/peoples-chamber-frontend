import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { questionsPage, QUESTIONS_PER_PAGE } from '@/lib/mp-written-questions';

// Written questions for /lords/[id]/questions (owner, 3 Nov 2026): page 2 onwards and the department filter, as
// /api/mps/[id]/questions does for MPs, with the House set to Lords.
export const revalidate = 3600;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (!Number.isInteger(memberId) || memberId <= 0) return NextResponse.json({ error: 'Invalid member.' }, { status: 400 });
  const url = new URL(request.url);
  const page = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1));
  const department = (url.searchParams.get('department') || '').trim().slice(0, 200) || null;
  try {
    const { rows, total } = await questionsPage(supabase, memberId, page, department, 'Lords');
    return NextResponse.json({ questions: rows, total, page, perPage: QUESTIONS_PER_PAGE });
  } catch (e) {
    console.error(`/api/lords/${memberId}/questions:`, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Could not load the questions.' }, { status: 502 });
  }
}
