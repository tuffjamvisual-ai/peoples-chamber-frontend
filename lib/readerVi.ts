import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

// Shared reader voting-intention aggregate. Both the /api/reader-vi route (the
// /polls ballot) AND the homepage "If an Election Were Held Now" card read from
// this one function, so the two can never show different numbers. The tally is
// live reader votes (reader_vi_vote_counts RPC) plus the reader_vi_tally launch
// seed; percentages are computed against the same total in both places.

export const FIXED = ['reform', 'labour', 'conservative', 'green', 'libdem', 'snp', 'restore', 'wouldnt'];
export const CATEGORIES = [...FIXED, 'another'];

// Named parties rendered as bars on the homepage card (excludes the
// 'another'/'wouldnt' buckets, which have no pollster equivalent). Muted,
// sepia-friendly palette to match the front-page theme.
export const READER_VI_PARTIES: { key: string; label: string; colour: string }[] = [
  { key: 'labour', label: 'Labour', colour: '#9c4a3f' },
  { key: 'reform', label: 'Reform', colour: '#4e7d80' },
  { key: 'conservative', label: 'Con', colour: '#4f6a86' },
  { key: 'libdem', label: 'Lib Dem', colour: '#b5883f' },
  { key: 'green', label: 'Green', colour: '#6f7d4a' },
  { key: 'snp', label: 'SNP', colour: '#a9922f' },
  { key: 'restore', label: 'Restore', colour: '#5a6a8a' },
];

let cachedPollId: number | null = null;
export async function viPollId(): Promise<number | null> {
  if (cachedPollId != null) return cachedPollId;
  const { data } = await supabase
    .from('polls')
    .select('id')
    .eq('poll_type', 'voting_intention')
    .limit(1)
    .maybeSingle();
  cachedPollId = (data?.id as number) ?? null;
  return cachedPollId;
}

function emptyTally(): Record<string, number> {
  const t: Record<string, number> = {};
  for (const k of CATEGORIES) t[k] = 0;
  return t;
}

export async function computeReaderViAggregate(): Promise<{
  tally: Record<string, number>;
  total: number;
  seeded: boolean;
}> {
  const tally = emptyTally();
  const pollId = await viPollId();
  if (pollId == null) return { tally, total: 0, seeded: false };

  const { data: counts } = await supabase.rpc('reader_vi_vote_counts', { p_poll_id: pollId });
  for (const c of (counts || []) as { cat: string; n: number | string }[]) {
    if (c.cat in tally) tally[c.cat] += Number(c.n);
  }

  const { data: seedRows } = await supabase.from('reader_vi_tally').select('party, count');
  let seedTotal = 0;
  for (const s of (seedRows || []) as { party: string; count: number }[]) {
    if (s.party in tally) { tally[s.party] += s.count; seedTotal += s.count; }
  }

  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  return { tally, total, seeded: seedTotal > 0 };
}
