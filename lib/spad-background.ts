// Official background for special advisers (owner, 28 Oct 2026): declared interests and recusals, and the advice of
// the Advisory Committee on Business Appointments (ACOBA) on jobs after government. Official sources only, each item
// kept with the document it came from. Used by /api/sync-spad-roster and the one off loads.
//
// Interests: the Cabinet Office publishes its own every year ("Publication of Special Adviser Interests", the Cabinet
// Office, No 10 and the offices of the Leaders of the Houses). Other departments print theirs inside their annual
// report and accounts (PDF); those were transcribed by hand into scripts/data/spad-interests-annual-reports.json, and
// the weekly sync only warns when a newer report appears (ANNUAL_REPORTS below).
import { parse } from 'node-html-parser';

export const BG_UA = 'OpenGovt/1.0 (contact@opengovt.uk)';

export type InterestCategory = 'paid role' | 'unpaid role' | 'directorship or trusteeship' | 'family or partner' | 'recusal' | 'other';
export type SpadInterest = {
  adviser_name: string; department: string; period: string; entry_text: string; category: InterestCategory;
  is_recusal: boolean; end_date_text: string | null; source_title: string; source_url: string; source_page: number | null;
};
export type SpadPostAppointment = {
  adviser_name: string; former_department: string; new_employer: string; new_role: string | null;
  advice_date: string; conditions_text: string | null; source_url: string;
};

const clean = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim();

// One category per entry, the first that fits: a recusal (or a mitigation that keeps the adviser out of matters)
// first, so it is never hidden under another label.
export function classifyInterest(text: string): { category: InterestCategory; is_recusal: boolean } {
  const t = text.toLowerCase();
  if (/recus|not (be )?included in discussions|not (be )?involved in|does not (participate|engage|respond)|no confidential policy should be discussed|advised not to discuss|not having any involvement/.test(t)) return { category: 'recusal', is_recusal: true };
  if (/spouse|partner['’]s?\b|\bpartner (is|held|holds|was)|brother|sister|father|mother|\bwife\b|\bhusband\b|family|relative|daughter|\bson\b/.test(t)) return { category: 'family or partner', is_recusal: false };
  if (/director|trustee|\bchair\b|\bboard\b|non.executive|governors?\b/.test(t)) return { category: 'directorship or trusteeship', is_recusal: false };
  if (/unpaid|honorary|visiting fellow|member of the/.test(t)) return { category: 'unpaid role', is_recusal: false };
  if (/paid role|employed|secondment|consult/.test(t)) return { category: 'paid role', is_recusal: false };
  return { category: 'other', is_recusal: false };
}

// "Carys Roberts (to October 2025)" → name and the dates in brackets.
export function splitNameDates(cell: string): { name: string; dates: string | null } {
  const c = clean(cell);
  const m = c.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? { name: m[1].trim(), dates: m[2].trim() } : { name: c, dates: null };
}

// "cabinet-office-publication-of-special-adviser-interests-2025-2026" → "2025/26".
export function periodFromSlug(slug: string): string | null {
  const m = slug.match(/(20\d\d)-(20\d\d)$/);
  return m ? `${m[1]}/${m[2].slice(2)}` : null;
}

// The Cabinet Office edition: a two column table, Name | Interest, entries separated by blank lines (<br><br>).
export function parseCoInterests(html: string, meta: { period: string; sourceTitle: string; sourceUrl: string }): SpadInterest[] {
  const root = parse(html);
  const table = root.querySelectorAll('table').find((t) => /name/i.test(t.querySelector('tr')?.text ?? '') && /interest/i.test(t.querySelector('tr')?.text ?? ''));
  if (!table) throw new Error('no Name | Interest table in the Cabinet Office interests publication');
  const out: SpadInterest[] = [];
  for (const tr of table.querySelectorAll('tr')) {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 2) continue;
    const { name, dates } = splitNameDates(tds[0].text);
    if (!name) continue;
    const parts = tds[1].innerHTML.split(/<br\s*\/?>\s*<br\s*\/?>/i).map((p) => clean(parse(p).text)).filter(Boolean);
    for (const entry of parts) {
      out.push({ adviser_name: name, department: 'Cabinet Office', period: meta.period, entry_text: entry, ...classifyInterest(entry), end_date_text: dates, source_title: meta.sourceTitle, source_url: meta.sourceUrl, source_page: null });
    }
  }
  return out;
}

// An ACOBA advice letter (an HTML page on GOV.UK). Title: "Advice Letter: <name>, <role>, <employer>"; the conditions
// are the list after "be subject to the below conditions" up to "The advice and the conditions". The letters carry no
// date of their own: advice_date is the date GOV.UK published the letter.
export function parseAcobaLetter(letter: { title: string; url: string; published: string; body: string }, former: string): SpadPostAppointment | null {
  const t = clean(letter.title).replace(/^advice letter:\s*/i, '');
  const parts = t.split(/,\s*/);
  // "Finback Investment Partners, LLC": a company suffix after a comma belongs to the name before it.
  if (parts.length > 2 && /^(llc|ltd|limited|inc|llp|plc)\.?$/i.test(parts[parts.length - 1])) parts.splice(-2, 2, `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`);
  if (parts.length < 2) return null;
  const name = parts[0].replace(/^(baroness|lord|baron|sir|dame|dr|mr|mrs|ms)\s+/i, '').trim();
  const employer = parts[parts.length - 1];
  const role = parts.length > 2 ? parts.slice(1, -1).join(', ') : null;
  const root = parse(letter.body);
  const items: string[] = [];
  let inConditions = false;
  for (const el of root.querySelectorAll('p, li')) {
    const s = clean(el.text);
    if (/subject to the (below|following) conditions/i.test(s)) { inConditions = true; continue; }
    if (inConditions && /^(the advice and the conditions|by .privileged information|i should be grateful|the committee'?s advice is)/i.test(s)) break;
    if (inConditions && el.tagName === 'LI' && s) items.push(s);
  }
  return { adviser_name: name, former_department: former, new_employer: employer, new_role: role, advice_date: letter.published.slice(0, 10), conditions_text: items.length ? items.join('\n') : null, source_url: letter.url };
}

// "Petitgas, Franck - Special Adviser to the Prime Minister on Business and Investment - ACOBA advice" → the role.
export function formerRoleFromPublication(title: string): string {
  const parts = clean(title).split(/\s+[-–]\s+|-\s+(?=Special)/);
  return (parts.find((p) => /special adviser/i.test(p)) ?? parts[1] ?? '').trim();
}

// Departments whose special adviser interests are printed in their annual report and accounts, and the last report
// read by hand. The weekly sync warns (freshness email, not an error) when GOV.UK has a newer one to read.
export const ANNUAL_REPORTS: { department: string; org: string; title: RegExp; checked: string | null }[] = [
  { department: 'HM Treasury', org: 'hm-treasury', title: /hm treasury/i, checked: '2025 to 2026' },
  { department: 'MHCLG', org: 'ministry-of-housing-communities-local-government', title: /mhclg|ministry of housing/i, checked: '2025 to 2026' },
  { department: 'DESNZ', org: 'department-for-energy-security-and-net-zero', title: /desnz|department for energy security/i, checked: '2025 to 2026' },
  { department: 'Defra', org: 'department-for-environment-food-rural-affairs', title: /defra/i, checked: '2025 to 2026' },
  { department: 'DBT', org: 'department-for-business-and-trade', title: /department for business and trade|\bdbt\b/i, checked: '2025 to 2026' },
  { department: 'FCDO', org: 'foreign-commonwealth-development-office', title: /^fcdo|foreign, commonwealth/i, checked: '2025 to 2026' },
  { department: 'DWP', org: 'department-for-work-pensions', title: /\bdwp\b|department for work and pensions/i, checked: '2025 to 2026' },
  { department: 'MoD', org: 'ministry-of-defence', title: /ministry of defence|\bmod\b/i, checked: '2025 to 2026' },
  { department: 'DfT', org: 'department-for-transport', title: /\bdft\b|department for transport/i, checked: '2025 to 2026' },
  { department: 'Home Office', org: 'home-office', title: /home office/i, checked: '2025 to 2026' },
  { department: 'DCMS', org: 'department-for-culture-media-and-sport', title: /\bdcms\b|department for culture/i, checked: '2025 to 2026' },
  { department: 'Scotland Office', org: 'office-of-the-secretary-of-state-for-scotland', title: /scotland office/i, checked: '2025 to 2026' },
  { department: 'DSIT', org: 'department-for-science-innovation-technology', title: /\bdsit\b|science, innovation/i, checked: '2025 to 2026' },
  { department: 'DHSC', org: 'department-of-health-and-social-care', title: /\bdhsc\b|department of health/i, checked: '2024 to 2025' },
  { department: 'DfE', org: 'department-for-education', title: /department for education|\bdfe\b/i, checked: '2024 to 2025' },
  { department: 'NIO', org: 'northern-ireland-office', title: /northern ireland office|\bnio\b/i, checked: '2024 to 2025' },
  { department: 'MoJ', org: 'ministry-of-justice', title: /ministry of justice|\bmoj\b/i, checked: '2024 to 2025' },
  { department: "Attorney General's Office", org: 'attorney-generals-office', title: /attorney general|law officers|\bago\b/i, checked: '2023 to 2024' }, // no report since 2023/24, which is before the period read
  { department: 'Wales Office', org: 'office-of-the-secretary-of-state-for-wales', title: /wales office|secretary of state for wales/i, checked: '2023 to 2024' }, // the same
];

// "2025 to 2026" is later than "2024 to 2025"; null (never read) is earlier than any.
export function laterPeriod(a: string, b: string | null): boolean {
  const y = (s: string) => Number(s.match(/(20\d\d)\D+(20)?\d\d$/)?.[1] ?? s.match(/20\d\d/)?.[0] ?? 0);
  return b == null || y(a) > y(b);
}
