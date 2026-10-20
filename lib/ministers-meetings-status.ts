// "Latest ministers' meetings return" line on department pages (owner's decision, 20 Oct 2026), from
// ministers_meetings: each department's latest quarter, when GOV.UK published it, and any quarter that ended more than
// three months ago with no return. Quarters are checked from January to March 2025 (the window reviewed on
// 20 Oct 2026); the sync keeps returns from July 2024.
import { supabase } from './supabase';

// Department page slug -> the GOV.UK organisation(s) the meetings sync reads (lib/ministers-meetings-source.ts).
export const MEETINGS_ORGS_BY_DEPT: Record<string, { org: string; label?: string }[]> = {
  'attorney-general': [{ org: 'attorney-generals-office' }],
  'advocate-general': [{ org: 'office-of-the-advocate-general-for-scotland' }],
  'cabinet-office': [{ org: 'cabinet-office' }],
  'business-trade': [
    { org: 'department-for-business-and-trade', label: 'Department for Business and Trade (before the July 2026 merger)' },
    { org: 'department-for-science-innovation-and-technology', label: 'Department for Science, Innovation and Technology (before the July 2026 merger)' },
  ],
  culture: [{ org: 'department-for-culture-media-and-sport' }],
  defence: [{ org: 'ministry-of-defence' }],
  education: [{ org: 'department-for-education' }],
  energy: [{ org: 'department-for-energy-security-and-net-zero' }],
  environment: [{ org: 'department-for-environment-food-rural-affairs' }],
  'foreign-office': [{ org: 'foreign-commonwealth-development-office' }],
  health: [{ org: 'department-of-health-and-social-care' }],
  'home-office': [{ org: 'home-office' }],
  housing: [{ org: 'ministry-of-housing-communities-local-government' }],
  justice: [{ org: 'ministry-of-justice' }],
  'northern-ireland-office': [{ org: 'northern-ireland-office' }],
  'scotland-office': [{ org: 'scotland-office' }],
  transport: [{ org: 'department-for-transport' }],
  treasury: [{ org: 'hm-treasury' }],
  'wales-office': [{ org: 'wales-office' }],
  'work-pensions': [{ org: 'department-for-work-pensions' }],
};

// Quarters checked on 20 Oct 2026 against every publication the sync's GOV.UK search found for the department: no
// ministers' return was published, only the officials' returns named here.
const SCOTLAND = "not published on GOV.UK (only the special advisers' and senior officials' returns exist)";
const WALES = "not published on GOV.UK (only the special advisers' return exists)";
const CHECKED_GAPS: Record<string, Record<string, string>> = {
  'scotland-office': { 'Q1 2025': SCOTLAND, 'Q2 2025': SCOTLAND, 'Q3 2025': SCOTLAND },
  'wales-office': { 'Q2 2025': WALES, 'Q3 2025': WALES },
};
const FIRST_CHECKED = { year: 2025, quarter: 1 };

const QUARTER_NAMES = ['January to March', 'April to June', 'July to September', 'October to December'];
const qName = (q: string) => { const m = q.match(/^Q([1-4]) (\d{4})$/); return m ? `${QUARTER_NAMES[Number(m[1]) - 1]} ${m[2]}` : q; };
const qKey = (q: string) => { const m = q.match(/^Q([1-4]) (\d{4})$/); return m ? Number(m[2]) * 4 + Number(m[1]) - 1 : -1; };
const qFromKey = (k: number) => `Q${(k % 4) + 1} ${Math.floor(k / 4)}`;
// ['Q1 2025', 'Q2 2025'] -> "January to March and April to June 2025"; across years each keeps its year.
function joinQuarters(qs: string[]): string {
  const sameYear = qs.every((q) => q.slice(3) === qs[0].slice(3));
  const parts = qs.map((q) => (sameYear ? QUARTER_NAMES[Number(q[1]) - 1] : qName(q)));
  const list = parts.length < 2 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return sameYear ? `${list} ${qs[0].slice(3)}` : list;
}

// The last quarter that ended more than three months before `today`: the quarter before the one containing the date
// three months ago (on 20 Oct 2026 that date is 20 Jul 2026, so April to June 2026).
function lastDueQuarter(today: Date): number {
  const cutoff = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 3, today.getUTCDate()));
  return cutoff.getUTCFullYear() * 4 + Math.floor(cutoff.getUTCMonth() / 3) - 1;
}

export type MeetingsStatus = {
  label: string | null;
  latestQuarter: string | null;  // "April to June 2026"
  publishedOn: string | null;    // "24 September 2026"
  gaps: { quarter: string; text: string }[];
};

const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export async function getMeetingsStatus(slug: string, today = new Date()): Promise<MeetingsStatus[]> {
  const orgs = MEETINGS_ORGS_BY_DEPT[slug];
  if (!orgs) return [];
  const { data, error } = await supabase.from('ministers_meetings_quarters').select('govuk_org_slug, quarter, published_on')
    .in('govuk_org_slug', orgs.map((o) => o.org));
  if (error) { console.error('getMeetingsStatus:', error.message); return []; }
  const rows = (data || []) as { govuk_org_slug: string; quarter: string; published_on: string | null }[];
  const due = lastDueQuarter(today);
  const first = FIRST_CHECKED.year * 4 + FIRST_CHECKED.quarter - 1;
  return orgs.map((o) => {
    const mine = rows.filter((r) => r.govuk_org_slug === o.org && qKey(r.quarter) >= 0);
    const have = new Set(mine.map((r) => qKey(r.quarter)));
    const latest = mine.sort((a, b) => qKey(b.quarter) - qKey(a.quarter))[0] ?? null;
    // Missing quarters, with consecutive ones that share a reason joined into one sentence ("January to March, April
    // to June and July to September 2025: not published ...").
    const missing: { q: string; reason: string | null }[] = [];
    for (let k = first; k <= due; k++) if (!have.has(k)) missing.push({ q: qFromKey(k), reason: CHECKED_GAPS[slug]?.[qFromKey(k)] ?? null });
    const runs: { qs: string[]; reason: string | null }[] = [];
    for (const m of missing) {
      const last = runs[runs.length - 1];
      if (last && last.reason === m.reason) last.qs.push(m.q); else runs.push({ qs: [m.q], reason: m.reason });
    }
    const gaps = runs.map((r) => {
      const names = joinQuarters(r.qs);
      return { quarter: r.qs.join(','), text: r.reason ? `${names}: ${r.reason}.` : `No return found on GOV.UK for ${names}.` };
    });
    return {
      label: o.label ?? null,
      latestQuarter: latest ? qName(latest.quarter) : null,
      publishedOn: latest?.published_on ? fmtDate(latest.published_on) : null,
      gaps,
    };
  });
}
