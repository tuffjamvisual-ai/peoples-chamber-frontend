// Pulls ministers-2010.json from mySociety/parlparse and merges into
// mp_biography.government_posts / opposition_posts / committee_memberships.
//
// Identical merge semantics to scripts/sync-parlparse-posts.js:
//   - dedupe on post id (data.parliament.uk PostId)
//   - existing entries WIN on collision (preserves additionalInfoLink)
//   - ParlParse-only entries get appended
//   - existing-only entries are NEVER deleted
//   - parliamentary posts (Speaker, Whips) fold into government_posts
//
// Posts change slowly — running weekly is plenty. Cron entry in vercel.json
// is `0 11 * * 1` (Monday 11:00 UTC) — fills the gap between the existing
// MP-data and donations crons. Time budget kept generous because the
// upstream file is ~7 MB and the upsert loop iterates ~650 rows.
//
// Attribution: data licensed under Open Parliament Licence v3.0.
// Crosswalk source: mySociety / TheyWorkForYou (CC BY-SA 2.5).
// Public-facing credit lives on /credits.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PARLPARSE_URL =
  'https://raw.githubusercontent.com/mysociety/parlparse/master/members/ministers-2010.json';

type ParlMembership = {
  id: string;
  source: string;
  person_id: string;
  organization_id?: string;
  start_date?: string;
  end_date?: string;
  role?: string;
};
type ParlOrg = { id: string; name: string };
type ParlData = { memberships: ParlMembership[]; organizations: ParlOrg[] };

type PostEntry = {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  additionalInfo: string | null;
  additionalInfoLink?: string | null;
  house?: number;
  _source?: string;
};

const SOURCE_TO_COL: Record<string, 'government_posts' | 'opposition_posts' | 'committee_memberships'> = {
  'datadotparl/governmentpost': 'government_posts',
  'datadotparl/parliamentarypost': 'government_posts',  // folded
  'datadotparl/oppositionpost': 'opposition_posts',
  'datadotparl/committee': 'committee_memberships',
};

const ID_PATTERN = /^uk\.parliament\.data\/Member\/(\d+)\/(\w+)\/(\d+)$/;

function isoTs(d?: string | null): string | null {
  return d ? `${d}T00:00:00` : null;
}

function toEntry(m: ParlMembership, orgsById: Record<string, string>): { memberId: number; col: 'government_posts' | 'opposition_posts' | 'committee_memberships'; entry: PostEntry } | null {
  const mat = ID_PATTERN.exec(m.id);
  if (!mat) return null;
  const col = SOURCE_TO_COL[m.source];
  if (!col) return null;
  const memberId = parseInt(mat[1], 10);
  const postId = parseInt(mat[3], 10);
  const orgName = m.organization_id ? (orgsById[m.organization_id] ?? null) : null;
  return {
    memberId,
    col,
    entry: {
      id: postId,
      name: m.role || orgName || '(unknown post)',
      startDate: isoTs(m.start_date),
      endDate: isoTs(m.end_date),
      additionalInfo: orgName,
      _source: 'parlparse',
    },
  };
}

function mergeArr(existing: unknown, parlparseEntries: PostEntry[]): { merged: PostEntry[]; addedCount: number } {
  const ex: PostEntry[] = Array.isArray(existing) ? (existing as PostEntry[]) : [];
  const exIds = new Set(ex.map(e => e?.id).filter((v): v is number => v != null));
  const added = parlparseEntries.filter(e => !exIds.has(e.id));
  const merged = [...ex, ...added];
  merged.sort((a, b) => {
    const as = a?.startDate || '';
    const bs = b?.startDate || '';
    if (as === bs) return 0;
    return as < bs ? 1 : -1;
  });
  return { merged, addedCount: added.length };
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const startedAt = Date.now();

  // Fetch parlparse
  const res = await fetch(PARLPARSE_URL, {
    headers: { 'User-Agent': 'PeoplesChamber/1.0 (cron)' },
  });
  if (!res.ok) return NextResponse.json({ error: `parlparse HTTP ${res.status}` }, { status: 502 });
  const data: ParlData = await res.json();
  const orgsById = Object.fromEntries(data.organizations.map(o => [o.id, o.name]));

  // Group by member_id
  const byMember = new Map<number, { government_posts: PostEntry[]; opposition_posts: PostEntry[]; committee_memberships: PostEntry[] }>();
  for (const m of data.memberships) {
    const conv = toEntry(m, orgsById);
    if (!conv) continue;
    if (!byMember.has(conv.memberId)) byMember.set(conv.memberId, { government_posts: [], opposition_posts: [], committee_memberships: [] });
    byMember.get(conv.memberId)![conv.col].push(conv.entry);
  }

  // Pull existing mp_biography rows in pages
  const PAGE = 500;
  let from = 0;
  let touched = 0;
  let gov_added = 0, opp_added = 0, cmte_added = 0;

  while (Date.now() - startedAt < 270_000) {
    const { data: rows, error } = await supabase
      .from('mp_biography')
      .select('member_id, government_posts, opposition_posts, committee_memberships')
      .order('member_id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!rows || rows.length === 0) break;

    type Row = { member_id: number; government_posts: unknown; opposition_posts: unknown; committee_memberships: unknown };
    const updates: { member_id: number; government_posts: PostEntry[]; opposition_posts: PostEntry[]; committee_memberships: PostEntry[] }[] = [];
    for (const r of rows as Row[]) {
      const pp = byMember.get(r.member_id);
      if (!pp) continue;
      const mg = mergeArr(r.government_posts, pp.government_posts);
      const mo = mergeArr(r.opposition_posts, pp.opposition_posts);
      const mc = mergeArr(r.committee_memberships, pp.committee_memberships);
      const totalAdded = mg.addedCount + mo.addedCount + mc.addedCount;
      if (totalAdded === 0) continue;
      updates.push({
        member_id: r.member_id,
        government_posts: mg.merged,
        opposition_posts: mo.merged,
        committee_memberships: mc.merged,
      });
      touched++;
      gov_added += mg.addedCount;
      opp_added += mo.addedCount;
      cmte_added += mc.addedCount;
    }
    if (updates.length > 0) {
      // upsert by member_id (mp_biography has unique constraint on member_id implied by usage; using update path)
      for (const u of updates) {
        const { error: upErr } = await supabase
          .from('mp_biography')
          .update({
            government_posts: u.government_posts,
            opposition_posts: u.opposition_posts,
            committee_memberships: u.committee_memberships,
          })
          .eq('member_id', u.member_id);
        if (upErr) console.error(`update mp_biography ${u.member_id}: ${upErr.message}`);
      }
    }
    from += PAGE;
    if (rows.length < PAGE) break;
  }

  return NextResponse.json({
    ok: true,
    touched,
    government_posts_added: gov_added,
    opposition_posts_added: opp_added,
    committee_memberships_added: cmte_added,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  });
}
