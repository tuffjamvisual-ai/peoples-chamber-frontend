import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Client-fetched voting-record pagination + search for MP profiles.
// Keeping paging/search OFF the page's searchParams lets /mps/[id] render
// statically (ISR) instead of dynamically on every request. Page 1 (no
// query) is still server-rendered into the cached page for SEO / no-JS;
// page 2+ and searches come from here on demand.
export const revalidate = 3600;

const PER = 20;
const COLS =
  'id, division_title, division_date, vote_type, is_rebellion, bill_id, division_id, division_date_only, division_number';

function escapeIlike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) {
    return NextResponse.json({ votes: [], total: 0, page: 1, perPage: PER }, { status: 400 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
  const start = (page - 1) * PER;
  const end = start + PER - 1;

  let listQ = supabase.from('mp_division_votes').select(COLS).eq('member_id', memberId);
  let countQ = supabase
    .from('mp_division_votes')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', memberId);
  if (q) {
    const like = `%${escapeIlike(q)}%`;
    listQ = listQ.ilike('division_title', like);
    countQ = countQ.ilike('division_title', like);
  }

  const [listRes, countRes] = await Promise.all([
    listQ.order('division_date', { ascending: false }).range(start, end),
    countQ,
  ]);
  const votes = (listRes.data || []) as Array<{ division_id: number | null }>;

  // Tag statutory-instrument divisions so the client can deep-link to our
  // SI detail page instead of the external Commons Votes site.
  const divIds = votes.map((v) => v.division_id).filter((d): d is number => d != null);
  let siSet = new Set<number>();
  if (divIds.length) {
    const { data: siRows } = await supabase
      .from('statutory_instrument')
      .select('division_id')
      .in('division_id', divIds);
    siSet = new Set(((siRows || []) as Array<{ division_id: number }>).map((r) => r.division_id));
  }
  const withSi = votes.map((v) => ({ ...v, is_si: v.division_id != null && siSet.has(v.division_id) }));

  return NextResponse.json({ votes: withSi, total: countRes.count ?? withSi.length, page, perPage: PER });
}
