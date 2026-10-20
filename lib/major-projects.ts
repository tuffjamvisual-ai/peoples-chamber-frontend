// Government Major Projects Portfolio: reads major_projects (migration 2026-10-20d), loaded by
// scripts/import-major-projects.js. One row per project per annual report; this groups them into histories.
// Shared by /transparency/major-projects, its project pages and the Major projects tab on department pages.
// Owner's decisions (20 Oct 2026): costs are not compared between years until two years share a stated price basis
// (expected March 2027); each year's cost shows its own basis. No rates, no "per X", no percentages.
import { supabase } from '@/lib/supabase';

export type MajorProjectRow = {
  project_key: string; project_id: string | null; report_year: number; data_as_at: string; name: string;
  department_code: string; dept_slug: string | null; rating: 'RED' | 'AMBER' | 'GREEN' | null; rating_column: 'IPA' | 'SRO' | null;
  rating_withheld: string | null; whole_life_cost_m: number | null; cost_text: string | null; price_basis: 'real 2024/25' | 'not stated';
  start_date: string | null; start_text: string | null; end_date: string | null; end_text: string | null;
  cost_narrative?: string | null; schedule_narrative?: string | null; rating_narrative?: string | null; source_url: string;
  evaluation_plan?: string | null;
};
export type MajorProject = { key: string; id: string | null; name: string; latest: MajorProjectRow; years: MajorProjectRow[] };

// The publication page for each report (the CSV is in source_url).
export const REPORT_PAGES: Record<number, { title: string; url: string }> = {
  2024: { title: 'IPA Annual Report 2023-24', url: 'https://www.gov.uk/government/publications/infrastructure-and-projects-authority-annual-report-2023-24' },
  2025: { title: 'NISTA Annual Report 2024-25', url: 'https://www.gov.uk/government/publications/nista-annual-report-2024-2025' },
  2026: { title: 'NISTA Major Projects Annual Report 2025-26', url: 'https://www.gov.uk/government/publications/nista-major-projects-annual-report-2025-26' },
};

// Departments without a page of their own that are shown on another department's tab (owner's decision, 20 Oct 2026).
const DEPT_LABELS: Record<string, string> = {
  HMT: 'HM Treasury',
  HMRC: 'HMRC (reports to the Treasury)',
  VOA: 'VOA (Valuation Office Agency, reports to the Treasury)',
};
export const deptLabel = (code: string) => DEPT_LABELS[code.toUpperCase()] ?? code;

// The table's columns; the narratives are read only on a project's own page.
const TABLE_COLS = 'project_key, project_id, report_year, data_as_at, name, department_code, dept_slug, rating, rating_column, rating_withheld, whole_life_cost_m, cost_text, price_basis, start_date, start_text, end_date, end_text, source_url, evaluation_plan';
const ALL_COLS = `${TABLE_COLS}, cost_narrative, schedule_narrative, rating_narrative`;

function group(rows: MajorProjectRow[]): MajorProject[] {
  const m = new Map<string, MajorProjectRow[]>();
  for (const r of rows) { if (!m.has(r.project_key)) m.set(r.project_key, []); m.get(r.project_key)!.push(r); }
  return [...m.values()].map((ys) => {
    ys.sort((a, b) => a.report_year - b.report_year);
    const latest = ys[ys.length - 1];
    return { key: latest.project_key, id: latest.project_id, name: latest.name, latest, years: ys };
  });
}

async function latestReportYear(): Promise<number> {
  const { data, error } = await supabase.from('major_projects').select('report_year').order('report_year', { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0]?.report_year ?? 0;
}

// Every project, or (with a slug) the projects whose latest report puts them on that department's tab.
export async function fetchMajorProjects(deptSlug?: string): Promise<{ projects: MajorProject[]; latestYear: number }> {
  let rows: MajorProjectRow[];
  if (deptSlug) {
    const { data: keys, error } = await supabase.from('major_projects').select('project_key').eq('dept_slug', deptSlug);
    if (error) throw error;
    const ks = [...new Set((keys ?? []).map((k) => k.project_key as string))];
    if (ks.length === 0) return { projects: [], latestYear: 0 };
    const { data, error: e2 } = await supabase.from('major_projects').select(TABLE_COLS).in('project_key', ks);
    if (e2) throw e2;
    rows = (data ?? []) as MajorProjectRow[];
  } else {
    rows = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('major_projects').select(TABLE_COLS).order('project_key').order('report_year').range(from, from + 999);
      if (error) throw error;
      rows.push(...((data ?? []) as MajorProjectRow[]));
      if (!data || data.length < 1000) break;
    }
  }
  const latestYear = await latestReportYear();
  let projects = group(rows);
  if (deptSlug) projects = projects.filter((p) => p.latest.dept_slug === deptSlug);
  // Still on the portfolio first, then by name.
  projects.sort((a, b) => (b.latest.report_year === latestYear ? 1 : 0) - (a.latest.report_year === latestYear ? 1 : 0) || a.name.localeCompare(b.name));
  return { projects, latestYear };
}

// One project with its narratives, for /transparency/major-projects/[project_key].
export async function fetchMajorProject(key: string): Promise<{ project: MajorProject | null; latestYear: number }> {
  const { data, error } = await supabase.from('major_projects').select(ALL_COLS).eq('project_key', key);
  if (error) throw error;
  const rows = (data ?? []) as MajorProjectRow[];
  return { project: rows.length ? group(rows)[0] : null, latestYear: await latestReportYear() };
}

export async function fetchMajorProjectKeys(): Promise<string[]> {
  const keys = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('major_projects').select('project_key').order('project_key').range(from, from + 999);
    if (error) throw error;
    for (const r of data ?? []) keys.add(r.project_key as string);
    if (!data || data.length < 1000) break;
  }
  return [...keys];
}

export const projectHref = (key: string) => `/transparency/major-projects/${encodeURIComponent(key)}`;

// ---------- wording ----------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const money = (m: number) => `£${m.toLocaleString('en-GB', { maximumFractionDigits: 2 })}m`;

// Rating labels (owner's decision): the IPA/NISTA column and the SRO column. Withheld ratings show the file's wording.
export function ratingText(r: MajorProjectRow): string {
  if (r.rating) return `${titleCase(r.rating)} (${r.rating_column === 'IPA' ? "NISTA's independent assessment" : "the department's own assessment"})`;
  return r.rating_withheld ?? 'Not given';
}
export const dateText = (d: string | null, t: string | null) => (d ? longDate(d) : t ?? 'Not given');
export function costText(r: MajorProjectRow): string {
  const basis = r.price_basis === 'real 2024/25' ? 'in 2024/25 prices' : 'price basis not stated';
  if (r.whole_life_cost_m != null) return `${money(r.whole_life_cost_m)} (${basis})`;
  // A Low/Mid/High range carries the basis too; withheld wording (an exemption, planning stage) is shown as it is.
  if (r.cost_text) return /^(Low|Mid|High):/.test(r.cost_text) ? `${r.cost_text} (${basis})` : r.cost_text;
  return 'Not given';
}

export const lastReported = (p: MajorProject, latestYear: number) => (p.latest.report_year < latestYear ? `Last reported ${p.latest.data_as_at}` : null);

// Names that differ only in case, spacing or punctuation are the same name ("T Level Programme" / "T-LEVEL PROGRAMME").
const sameName = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9]+/g, '') === b.toLowerCase().replace(/[^a-z0-9]+/g, '');
export const earlierNames = (p: MajorProject) => [...new Set(p.years.filter((y) => !sameName(y.name, p.name)).map((y) => `${y.name} (${y.data_as_at})`))];

// ---------- evaluation plans (migration 2026-10-20g; owner's approval, 20 Oct 2026) ----------
// The question was first asked in the March 2025 data; March 2024 has no such column, so it gets no line.
export const EVALUATION_FIRST_YEAR = 2025;
export type EvaluationPart = { text: string; href?: string };
export type EvaluationLine = { year: number; dataAsAt: string; stated: boolean; parts: EvaluationPart[] };
function linkLabel(u: string): EvaluationPart {
  let host = '';
  try { host = new URL(u).hostname; } catch { return { text: u }; }
  if (host.endsWith('evaluation-registry.cabinetoffice.gov.uk')) {
    if (/\/signin\b/.test(u)) return { text: 'Evaluation Registry (sign-in required)' };
    if (/\/evaluation\//.test(u)) return { text: 'Evaluation Registry entry', href: u };
    return { text: 'Evaluation Registry search', href: u };
  }
  if (host === 'www.gov.uk' || host === 'gov.uk') return { text: 'GOV.UK publication', href: u };
  return { text: host.replace(/^www\./, ''), href: u };
}
// One line per year from March 2025, newest first: the department's own statement word for word, links labelled.
export function evaluationLines(p: MajorProject): EvaluationLine[] {
  return [...p.years].filter((y) => y.report_year >= EVALUATION_FIRST_YEAR).reverse().map((y) => {
    const t = (y.evaluation_plan ?? '').trim();
    if (!t) return { year: y.report_year, dataAsAt: y.data_as_at, stated: false, parts: [] };
    const urls = t.match(/https?:\/\/[^\s,;]+/g);
    if (!urls) return { year: y.report_year, dataAsAt: y.data_as_at, stated: true, parts: [{ text: t }] };
    const seen = new Set<string>();
    const parts = urls.map((u) => linkLabel(u.replace(/[.)]+$/, ''))).filter((x) => { const k = x.text + (x.href ?? ''); if (seen.has(k)) return false; seen.add(k); return true; });
    return { year: y.report_year, dataAsAt: y.data_as_at, stated: true, parts };
  });
}
