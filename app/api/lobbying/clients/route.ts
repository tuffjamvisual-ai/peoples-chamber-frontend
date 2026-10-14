// GET /api/lobbying/clients?q=<name>
// Which consultant lobbying firms acted for clients whose name contains the search text,
// from the Registrar of Consultant Lobbyists returns (orcl_client_returns). Read-only,
// public data, anon client (public-read RLS). At most 300 rows are read per search.

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Row = { client_name: string; client_norm: string; firm_name: string; firm_norm: string; quarter_start: string; quarter_label: string };

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 3) return NextResponse.json({ error: 'type at least 3 characters' }, { status: 400 });
  // Escape the LIKE wildcards so they are matched literally.
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const { data, error } = await supabase
    .from('orcl_client_returns')
    .select('client_name, client_norm, firm_name, firm_norm, quarter_start, quarter_label')
    .ilike('client_name', pattern)
    .order('client_norm', { ascending: true })
    .order('quarter_start', { ascending: false })
    .order('id', { ascending: true })
    .limit(300);
  if (error) return NextResponse.json({ error: 'search failed' }, { status: 500 });

  const rows = (data || []) as Row[];
  const byClient = new Map<string, { client: string; firms: Map<string, { firm: string; quarters: string[] }> }>();
  for (const r of rows) {
    const c = byClient.get(r.client_norm) || { client: r.client_name, firms: new Map() };
    const f = c.firms.get(r.firm_norm) || { firm: r.firm_name, quarters: [] };
    if (!f.quarters.includes(r.quarter_label)) f.quarters.push(r.quarter_label);
    c.firms.set(r.firm_norm, f);
    byClient.set(r.client_norm, c);
  }
  const results = [...byClient.values()].slice(0, 40).map((c) => ({ client: c.client, firms: [...c.firms.values()] }));
  return NextResponse.json(
    { query: q, results, truncated: rows.length === 300 || byClient.size > 40 },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
  );
}
