import { supabase } from '@/lib/supabase';

// Poll-of-polls read + average, shared by the homepage summary and the tracker page.
// Kept separate from lib/votingIntention.ts (which imports node-html-parser) so the
// homepage bundle stays light. Same methodology as the tracker: simple mean of the
// last 10 standard GB polls per party, MRP excluded.

// Muted, sepia-friendly party palette — defused so the bars sit within the site's
// kraft/ink theme rather than clashing with bright official party colours.
export const POP_PARTIES: { key: string; col: string; label: string; colour: string }[] = [
  { key: 'lab', col: 'pct_lab', label: 'Labour', colour: '#9c4a3f' },
  { key: 'con', col: 'pct_con', label: 'Con', colour: '#4f6a86' },
  { key: 'ref', col: 'pct_ref', label: 'Reform', colour: '#4e7d80' },
  { key: 'ld', col: 'pct_ld', label: 'Lib Dem', colour: '#b5883f' },
  { key: 'grn', col: 'pct_grn', label: 'Green', colour: '#6f7d4a' },
  { key: 'snp', col: 'pct_snp', label: 'SNP', colour: '#a9922f' },
  { key: 'pc', col: 'pct_pc', label: 'Plaid', colour: '#4a6f5f' },
  { key: 'rb', col: 'pct_rb', label: 'Restore', colour: '#7d5a6e' },
  { key: 'oth', col: 'pct_oth', label: 'Others', colour: '#8a7d6c' },
];

export type PopParty = { key: string; label: string; colour: string; value: number };

export async function getPollOfPolls(): Promise<{ parties: PopParty[]; asOf: string | null }> {
  const cols = ['fieldwork_end', ...POP_PARTIES.map((p) => p.col)].join(', ');
  const { data } = await supabase
    .from('vi_polls')
    .select(cols)
    .eq('poll_type', 'standard')
    .eq('area', 'GB')
    .order('fieldwork_end', { ascending: false })
    .limit(10);
  const rows = (data || []) as unknown as Record<string, number | string | null>[];
  const parties: PopParty[] = POP_PARTIES.map((p) => {
    const vals = rows.map((r) => r[p.col]).filter((v): v is number => typeof v === 'number');
    return { key: p.key, label: p.label, colour: p.colour, value: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN };
  }).filter((p) => Number.isFinite(p.value)).sort((a, b) => b.value - a.value);
  const asOf = rows.length ? (rows[0].fieldwork_end as string) : null;
  return { parties, asOf };
}
