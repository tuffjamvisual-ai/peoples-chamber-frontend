// Free school meals by area (owner approved 18 Nov 2026, Cowork ENTRY 303, FSM-YJ): DfE "Schools, pupils and their
// characteristics", read through the DfE statistics API (no key; no stated usage limit), data set
// 019e7404-df19-71ce-90a8-f2e3db7dd7fa: pupils by free school meals eligibility, England, regions, local authorities and
// parliamentary constituencies, academic years from 2015/16 (January census). Used by scripts/import-free-school-meals.ts
// (first load) and the yearly sync. Reads only; one request a second.
//
// The figures (checked against England 2025/26, 18 Nov 2026):
//   pupils           breakdown 'All pupils', eligibility 'Total'
//   fsm_eligible     breakdown 'All pupils', eligibility 'FSM eligible' (its percentage is fsm_eligible_pct)
//   fsm_taking_meal  breakdown 'FSM eligible - taking free school meal on census date', eligibility 'FSM eligible'
// Options are found by their labels in the data set's metadata, so a new version with new option ids still reads.
export const DATASET = '019e7404-df19-71ce-90a8-f2e3db7dd7fa';
export const API = `https://api.education.gov.uk/statistics/v1/data-sets/${DATASET}`;
export const SOURCE_URL = 'https://explore-education-statistics.service.gov.uk/find-statistics/school-pupils-and-their-characteristics';
const UA = { 'User-Agent': 'opengovt-data/1.0', 'Content-Type': 'application/json' };

export type SchoolType = 'total' | 'primary' | 'secondary' | 'special' | 'alternative_provision' | 'nursery' | 'non_maintained_special';
export type FsmRow = {
  area_code: string; area_name: string; area_level: 'england' | 'region' | 'council' | 'constituency';
  academic_year: string; school_type: SchoolType;
  pupils: number | null; fsm_eligible: number | null; fsm_eligible_pct: number | null; fsm_taking_meal: number | null;
  symbols: Record<string, string>; source_url: string;
};

const TYPES: Record<string, SchoolType> = {
  'Total': 'total', 'State-funded primary': 'primary', 'State-funded secondary': 'secondary', 'State-funded special school': 'special',
  'State-funded AP school': 'alternative_provision', 'State-funded nursery': 'nursery', 'Non-maintained special school': 'non_maintained_special',
};
const LEVELS: Record<string, FsmRow['area_level']> = { NAT: 'england', REG: 'region', LA: 'council', PCON: 'constituency' };

type Meta = {
  filters: { id: string; label: string; options: { id: string; label: string }[] }[];
  indicators: { id: string; column: string }[];
  locations: { level: { code: string }; options: { id: string; label: string; code: string }[] }[];
  timePeriods: { code: string; period: string; label: string }[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function call<T>(url: string, body?: unknown): Promise<T> {
  const wait = last + 1000 - Date.now(); if (wait > 0) await sleep(wait); last = Date.now();
  const res = await fetch(url, body ? { method: 'POST', headers: UA, body: JSON.stringify(body) } : { headers: UA });
  if (!res.ok) throw new Error(`DfE statistics API ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

export async function readMeta(): Promise<Meta> { return call<Meta>(`${API}/meta`); }

const num = (v: string | undefined) => (v != null && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : null);

// Every row: each level and year, the three filter combinations above, every school type.
export async function readAll(meta: Meta, years?: string[]): Promise<FsmRow[]> {
  const f = (label: string) => meta.filters.find((x) => x.label === label);
  const breakdown = f('Breakdown of free-school meals groupings'), elig = f('Pupil eligibility for free school meals'), type = f('School type');
  if (!breakdown || !elig || !type) throw new Error('the data set no longer has the three filters this reads');
  const opt = (flt: { options: { id: string; label: string }[] }, label: string) => {
    const o = flt.options.find((x) => x.label === label); if (!o) throw new Error(`no '${label}' option`); return o.id;
  };
  const ALL = opt(breakdown, 'All pupils'), TAKING = opt(breakdown, 'FSM eligible - taking free school meal on census date');
  const ELIG = opt(elig, 'FSM eligible'), TOTAL = opt(elig, 'Total');
  const typeOf = Object.fromEntries(type.options.map((o) => [o.id, TYPES[o.label]]));
  if (Object.values(typeOf).some((t) => !t)) throw new Error(`an unknown school type: ${type.options.map((o) => o.label).join(', ')}`);
  const count = meta.indicators.find((i) => i.column === 'pupil_count')?.id, pct = meta.indicators.find((i) => i.column === 'pupil_percent')?.id;
  if (!count || !pct) throw new Error('no pupil_count or pupil_percent indicator');
  const loc = new Map<string, { code: string; label: string }>();
  for (const l of meta.locations) for (const o of l.options) loc.set(`${l.level.code}:${o.id}`, { code: o.code, label: o.label });

  const rows = new Map<string, FsmRow>();
  const skipped = new Set<string>();
  const periods = meta.timePeriods.filter((t) => t.code === 'AY' && (!years || years.includes(t.label)));
  for (const level of Object.keys(LEVELS)) {
    for (const tp of periods) {
      for (let page = 1; ; page++) {
        const r = await call<{ paging: { totalPages: number }; results: { geographicLevel: string; locations: Record<string, string>; filters: Record<string, string>; values: Record<string, string> }[] }>(`${API}/query`, {
          criteria: { and: [{ geographicLevels: { eq: level } }, { filters: { in: [ALL, TAKING] } }, { timePeriods: { eq: { period: tp.period, code: 'AY' } } }] },
          indicators: [count, pct], page, pageSize: 10000,
        });
        for (const x of r.results) {
          const area = loc.get(`${level}:${x.locations[level]}`);
          if (!area) throw new Error(`unknown ${level} location ${x.locations[level]}`);
          if (level === 'REG' && area.code.startsWith('E13')) continue; // Inner and Outer London: not a region we hold (T2)
          // Pupils DfE could not place in a constituency ('Unknown', code 'z'): not an area; England's row counts them.
          if (level === 'PCON' && !/^E14\d{6}$/.test(area.code)) { skipped.add(`${area.label} (${area.code})`); continue; }
          const st = typeOf[x.filters[type.id]];
          const key = `${area.code}|${tp.label}|${st}`;
          const row = rows.get(key) ?? { area_code: area.code, area_name: area.label, area_level: LEVELS[level], academic_year: tp.label, school_type: st,
            pupils: null, fsm_eligible: null, fsm_eligible_pct: null, fsm_taking_meal: null, symbols: {}, source_url: SOURCE_URL };
          const b = x.filters[breakdown.id], e = x.filters[elig.id];
          const put = (field: 'pupils' | 'fsm_eligible' | 'fsm_eligible_pct' | 'fsm_taking_meal', v: string | undefined, isPct = false) => {
            const n = num(v);
            if (n == null) { if (v != null && v !== '') row.symbols[field] = v; return; }
            row[field] = isPct ? n : Math.round(n);
          };
          if (b === ALL && e === TOTAL) put('pupils', x.values[count]);
          else if (b === ALL && e === ELIG) { put('fsm_eligible', x.values[count]); put('fsm_eligible_pct', x.values[pct], true); }
          else if (b === TAKING && e === ELIG) put('fsm_taking_meal', x.values[count]);
          else continue;
          rows.set(key, row);
        }
        if (page >= r.paging.totalPages) break;
      }
    }
  }
  if (skipped.size) console.log(`not loaded (no area): ${[...skipped].join(', ')}`);
  return [...rows.values()];
}

// The checks before a load: England's total each year equals its councils' sum (every school type 'total'), and every
// council code is ours or a known old code.
export function checkRows(rows: FsmRow[], ourCouncils: Set<string>, oldCodes: Set<string>) {
  const problems: string[] = [];
  const years = [...new Set(rows.map((r) => r.academic_year))].sort();
  const sums: Record<string, { england: number | null; councils: number }> = {};
  for (const y of years) {
    const eng = rows.find((r) => r.area_level === 'england' && r.academic_year === y && r.school_type === 'total');
    const councils = rows.filter((r) => r.area_level === 'council' && r.academic_year === y && r.school_type === 'total');
    const s = councils.reduce((a, r) => a + (r.fsm_eligible ?? 0), 0);
    sums[y] = { england: eng?.fsm_eligible ?? null, councils: s };
    if (!eng || eng.fsm_eligible == null) problems.push(`${y}: no England figure`);
    else if (s !== eng.fsm_eligible) problems.push(`${y}: councils add up to ${s}, England is ${eng.fsm_eligible}`);
  }
  for (const r of rows) {
    if (r.area_level === 'council' && !ourCouncils.has(r.area_code) && !oldCodes.has(r.area_code)) problems.push(`council code ${r.area_code} (${r.area_name}) is neither ours nor a known old code`);
    if (r.area_level === 'region' && !/^E12/.test(r.area_code)) problems.push(`region code ${r.area_code} (${r.area_name})`);
  }
  return { ok: problems.length === 0, problems: [...new Set(problems)], years, sums };
}

// Councils DfE gives under codes that have since gone (the old counties and boroughs before a reorganisation), kept
// under their own codes for the years DfE gives them (as council_children_in_care does).
export const OLD_COUNCIL_CODES = new Set(['E06000028', 'E06000029', 'E10000002', 'E10000006', 'E10000009', 'E08000020', 'E10000023', 'E10000021', 'E06000048', 'E10000027']);
