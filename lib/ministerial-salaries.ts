// MP and ministerial pay from the database (owner, 7 Nov 2026, N1; migration 2026-11-07d). The figures used to be
// constants here ("2010-frozen levels"); they matched neither the claimed nor the entitled amounts in GOV.UK's September
// 2026 table. Now every page reads ministerial_salary_rates through the functions below:
//   - GOV.UK's categories (Commons and Lords), each with the entitled and the claimed salary, the date the figures apply
//     from and the publication's address; the claimed salary is what a minister actually receives;
//   - the MP salary (category mp_salary), with IPSA's announcement as its source.
// Each dept_ministers row is filed under one category (salary_category); a minister holding several rows is paid once,
// at the highest claimed rate among them. A minister whose rows are not yet filed (a new appointment the GOV.UK sync has
// just added) shows "being updated" rather than a guess. /api/check-hand-loaded-releases emails when GOV.UK updates the
// publication (hand_loaded_datasets row ministerial_salaries).
import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';

export type SalaryRate = {
  category: string; house: 'Commons' | 'Lords'; cabinet: boolean; entitled: number; claimed: number;
  effective_from: string; source_url: string; checked_at: string;
};

export const MP_SALARY_CATEGORY = 'mp_salary';

// How each category reads on a page, from GOV.UK's own row names.
export const CATEGORY_LABEL: Record<string, string> = {
  commons_pm: 'Prime Minister',
  commons_cabinet: 'Cabinet Minister',
  commons_minister_of_state: 'Minister of State',
  commons_parliamentary_secretary: 'Parliamentary Secretary',
  commons_attorney_general: 'Attorney General',
  commons_solicitor_general: 'Solicitor General',
  commons_whip: 'Government Whip',
  lords_leader_or_secretary_of_state: 'Leader of the House of Lords or Secretary of State',
  lords_minister_of_state: 'Minister of State (Lords)',
  lords_parliamentary_secretary: 'Parliamentary Secretary (Lords)',
  lords_advocate_general: 'Advocate General for Scotland',
  lords_chief_whip: 'Lords Chief Whip',
  lords_deputy_chief_whip: 'Lords Deputy Chief Whip',
  lords_in_waiting: 'Lord or Baroness in Waiting',
};

// Every rate, cached for a day under the 'salary-rates' tag (a correction refreshes it with that tag).
export const salaryRates = unstable_cache(async (): Promise<SalaryRate[]> => {
  const { data, error } = await supabase.from('ministerial_salary_rates')
    .select('category, house, cabinet, entitled, claimed, effective_from, source_url, checked_at').order('category');
  if (error) throw new Error(`ministerial_salary_rates: ${error.message}`);
  return (data ?? []) as SalaryRate[];
}, ['salary-rates-v1'], { tags: ['salary-rates'], revalidate: 86400 });

export async function mpSalaryRate(): Promise<SalaryRate | null> {
  return (await salaryRates()).find((r) => r.category === MP_SALARY_CATEGORY) ?? null;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
// The publisher, from the source address: GOV.UK or IPSA.
export function publisherOf(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, '');
  return host === 'gov.uk' ? 'GOV.UK' : host === 'theipsa.org.uk' ? 'IPSA' : host;
}
// The publication's month, from its address ("…-september-2026"), when it names one.
export function publicationMonth(url: string): string | null {
  const m = new URL(url).pathname.toLowerCase().match(new RegExp(`(${MONTHS.join('|')})-(20\\d\\d)\\b`));
  return m ? `${cap(m[1])} ${m[2]}` : null;
}
export function longDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${cap(MONTHS[m - 1])} ${y}`;
}
const pounds = (n: number) => `£${n.toLocaleString('en-GB')}`;

// "£67,505 (claimed; entitled to £75,170). Source: GOV.UK, September 2026, figures from 1 April 2026."
export function ministerialSalaryText(rate: SalaryRate): string {
  const month = publicationMonth(rate.source_url);
  return `${pounds(rate.claimed)} (claimed; entitled to ${pounds(rate.entitled)}). Source: ${publisherOf(rate.source_url)}${month ? `, ${month}` : ''}, figures from ${longDate(rate.effective_from)}.`;
}
// "IPSA, from 1 April 2026"
export function mpSalarySource(rate: SalaryRate): string {
  return `${publisherOf(rate.source_url)}, from ${longDate(rate.effective_from)}`;
}

type Filed = { member_id: number | null; slug: string | null; salary_category: string | null };
// The highest claimed rate among a minister's filed rows; 'unfiled' when they hold rows but none is filed yet.
function pick(rows: Filed[], rates: SalaryRate[]): SalaryRate | 'unfiled' | null {
  if (!rows.length) return null;
  const byCategory = new Map(rates.map((r) => [r.category, r]));
  let best: SalaryRate | null = null;
  for (const r of rows) {
    const rate = r.salary_category ? byCategory.get(r.salary_category) : undefined;
    if (rate && (!best || rate.claimed > best.claimed)) best = rate;
  }
  return best ?? 'unfiled';
}

// One MP's ministerial rate (dept_ministers by member id).
export async function ministerialRateForMember(memberId: number): Promise<SalaryRate | 'unfiled' | null> {
  const [rates, { data, error }] = await Promise.all([
    salaryRates(),
    supabase.from('dept_ministers').select('member_id, slug, salary_category').eq('member_id', memberId),
  ]);
  if (error) throw new Error(`dept_ministers ${memberId}: ${error.message}`);
  return pick((data ?? []) as Filed[], rates);
}

// A person's ministerial rate by their GOV.UK slug (people pages; Lords ministers have no MP id).
export async function ministerialRateForSlug(slug: string): Promise<SalaryRate | 'unfiled' | null> {
  const [rates, { data, error }] = await Promise.all([
    salaryRates(),
    supabase.from('dept_ministers').select('member_id, slug, salary_category').eq('slug', slug),
  ]);
  if (error) throw new Error(`dept_ministers ${slug}: ${error.message}`);
  return pick((data ?? []) as Filed[], rates);
}

// Every MP minister's rate, by member id (the /earnings table).
export async function ministerialRatesByMember(): Promise<Map<number, SalaryRate | 'unfiled'>> {
  const [rates, { data, error }] = await Promise.all([
    salaryRates(),
    supabase.from('dept_ministers').select('member_id, slug, salary_category').not('member_id', 'is', null),
  ]);
  if (error) throw new Error(`dept_ministers: ${error.message}`);
  const byMember = new Map<number, Filed[]>();
  for (const r of (data ?? []) as Filed[]) byMember.set(r.member_id!, [...(byMember.get(r.member_id!) ?? []), r]);
  const out = new Map<number, SalaryRate | 'unfiled'>();
  for (const [id, rows] of byMember) { const p = pick(rows, rates); if (p) out.set(id, p); }
  return out;
}

// What an MP page shows for pay: the MP salary with its source and date, and the ministerial salary when the MP holds a
// post (its claimed amount, entitled amount and source), or "being updated" when their post is not yet filed.
export type MpPay = {
  base: number; baseSource: string | null;
  ministerial: number; ministerialText: string | null; ministerialPending: boolean; ministerialLabel: string | null;
};
export async function mpPay(memberId: number): Promise<MpPay> {
  const [mp, minister] = await Promise.all([mpSalaryRate(), ministerialRateForMember(memberId)]);
  const rate = minister && minister !== 'unfiled' ? minister : null;
  return {
    base: mp?.claimed ?? 0,
    baseSource: mp ? mpSalarySource(mp) : null,
    ministerial: rate?.claimed ?? 0,
    ministerialText: rate ? ministerialSalaryText(rate) : null,
    ministerialPending: minister === 'unfiled',
    ministerialLabel: rate ? CATEGORY_LABEL[rate.category] ?? null : null,
  };
}
