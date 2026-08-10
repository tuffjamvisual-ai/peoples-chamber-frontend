import { supabase } from '@/lib/supabase';

// Single source of truth for the "declared donations to MPs" running total.
//
// METHODOLOGY (verified 2026-07-10 against members-api.parliament.uk for
// Badenoch, David Davis, Rayner, Streeting and Farage — all exact matches):
//   - Source: mp_registered_interests, Category 2(a) + 2(b) ONLY (donations
//     and other support to the Member). Both start "2. " so the "2.%" LIKE
//     captures exactly these and nothing else.
//   - Corrections/amendments (is_correction = true) are excluded to avoid
//     double-counting a restated entry.
//   - Amount = the first clean "£" figure in the entry text (the donation
//     amount; any later figures are instalment breakdowns).
//   - Register only. Electoral Commission political_donations are deliberately
//     NOT combined: they are the same donations attributed to parties, so
//     merging would double-count and misattribute. Anything not on the
//     register (e.g. amounts under Standards investigation) is excluded by
//     construction — the register is the only source for this figure.
//   - CURRENT REGISTER ONLY: is_current = true. Historical/expired entries are
//     retained in the table (for cumulative-this-Parliament views) but are
//     excluded from this headline figure, which reflects what MPs currently
//     hold on the register. A separate cumulative total is computed elsewhere.
// As of 2026-07-10 this yields £4,915,922 across 609 entries (all is_current).

const AMOUNT_RE = /£\s?([\d]{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/;

function firstAmount(text: string | null): number {
  if (!text) return 0;
  const m = AMOUNT_RE.exec(text);
  return m ? Number(m[1].replace(/,/g, '')) : 0;
}

export type DonationsTotal = {
  total: number;
  entryCount: number;
  asOf: string | null; // ISO date of the most recent declaration counted
};

export type InterestRow = {
  category_name?: string | null;
  interest_text: string | null;
  is_correction: boolean | null;
  created_when: string | null;
  last_amended_when: string | null;
};

// Pure methodology. Given register rows, sum Category 2(a)+2(b) donations,
// excluding corrections, first clean £ per entry. If the rows are already
// filtered to Category 2, requireCat2 can be false; when passing a mixed set
// (e.g. one MP's full register), leave it true so only donations are counted.
export function sumDeclaredDonations(rows: InterestRow[], requireCat2 = true): DonationsTotal {
  let total = 0;
  let entryCount = 0;
  let asOf: string | null = null;
  for (const r of rows) {
    if (requireCat2 && !(r.category_name || '').startsWith('2.')) continue;
    if (r.is_correction) continue;
    const amt = firstAmount(r.interest_text);
    if (amt <= 0) continue;
    total += amt;
    entryCount += 1;
    const when = r.last_amended_when || r.created_when;
    if (when && (!asOf || when > asOf)) asOf = when;
  }
  return { total, entryCount, asOf };
}

// Site-wide total: all MPs' declared Category 2 donations.
export async function getDeclaredMpDonationsTotal(): Promise<DonationsTotal> {
  const rows: InterestRow[] = [];
  // Paginate past Supabase's 1000-row cap (Cat 2 is ~625 rows, but be safe).
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from('mp_registered_interests')
      .select('interest_text, is_correction, created_when, last_amended_when')
      .like('category_name', '2.%')
      .eq('is_current', true)
      .range(from, from + size - 1);
    if (error || !data) break;
    rows.push(...(data as InterestRow[]));
    if (data.length < size) break;
  }
  // Rows are already Cat 2-filtered by the query.
  return sumDeclaredDonations(rows, false);
}
