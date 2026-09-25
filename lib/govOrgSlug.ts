// Shared organisation → department/agency resolution, used by:
//   - app/page.tsx (homepage Whitehall block)
//   - app/news/[slug]/page.tsx (press release RelatedLinks)
//   - app/components/RelatedLinks.tsx (pressRelease variant)
//   - app/departments/[slug]/page.tsx (press releases tab query)
//
// WHY THIS EXISTS: ap_departments.slug and department_context.slug diverge for
// 16 of the 24 departments (e.g. ap_departments has 'fcdo', 'mod', 'ago';
// department_context has 'foreign-office', 'defence', 'attorney-general'). Using
// ap_departments for slug resolution generates 404s for most departments. This
// constant maps observed press_releases.organisation strings directly to
// department_context slugs that were verified against production on 2026-09-09
// (all 19 entries return HTTP 200). If you are tempted to replace this with a
// query against ap_departments, re-read this comment first.
//
// Intentional absences: HM Revenue & Customs (no department_context entry),
// Department for Science, Innovation & Technology (/departments/science-tech 404s).
// Expand only from observed press release data; verify new slugs on production.
export const DEPT_ORG_TO_SLUG: Record<string, string> = {
  "Attorney General's Office":                          'attorney-general',
  'Cabinet Office':                                     'cabinet-office',
  'Department for Business and Trade':                  'business-trade',
  'Department for Business, Innovation, Science and Trade': 'business-trade',
  'Department for Culture, Media & Sport':              'culture',
  'Department for Education':                           'education',
  'Department for Energy Security & Net Zero':          'energy',
  'Department for Environment, Food & Rural Affairs':   'environment',
  'Department for Health & Social Care':                'health',
  'Department for Transport':                           'transport',
  'Department for Work & Pensions':                     'work-pensions',
  'Foreign, Commonwealth & Development Office':         'foreign-office',
  'HM Treasury':                                        'treasury',
  'Home Office':                                        'home-office',
  'Ministry of Defence':                                'defence',
  'Ministry of Housing, Communities & Local Government': 'housing',
  'Ministry of Justice':                                'justice',
  'Northern Ireland Office':                            'northern-ireland-office',
  'Scotland Office':                                    'scotland-office',
  'Wales Office':                                       'wales-office',
};

// Reverse map: department_context slug → canonical press_releases.organisation
// string(s). Historical names included so archive queries find older releases.
// Used by Stage B's department press releases tab query.
export const DEPT_SLUG_TO_ORGS: Record<string, string[]> = {
  'attorney-general':      ["Attorney General's Office"],
  'cabinet-office':        ['Cabinet Office'],
  'business-trade':        ['Department for Business and Trade', 'Department for Business, Innovation, Science and Trade', 'Department for Business, Energy & Industrial Strategy', 'Department for Business, Innovation & Skills'],
  'culture':               ['Department for Culture, Media & Sport', 'Department for Digital, Culture, Media & Sport'],
  'education':             ['Department for Education'],
  'energy':                ['Department for Energy Security & Net Zero', 'Department of Energy & Climate Change'],
  'environment':           ['Department for Environment, Food & Rural Affairs'],
  'health':                ['Department for Health & Social Care', 'Department of Health'],
  'transport':             ['Department for Transport'],
  'work-pensions':         ['Department for Work & Pensions'],
  'foreign-office':        ['Foreign, Commonwealth & Development Office', 'Foreign & Commonwealth Office'],
  'treasury':              ['HM Treasury'],
  'home-office':           ['Home Office'],
  'defence':               ['Ministry of Defence'],
  'housing':               ['Ministry of Housing, Communities & Local Government', 'Department for Levelling Up, Housing and Communities', 'Department for Communities and Local Government'],
  'justice':               ['Ministry of Justice'],
  'northern-ireland-office': ['Northern Ireland Office'],
  'scotland-office':       ['Scotland Office'],
  'wales-office':          ['Wales Office'],
};

export function normalizeOrg(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim().replace(/\s*&\s*/g, ' and ');
}

// Pre-built normalised lookup from DEPT_ORG_TO_SLUG for the '&' ↔ 'and' pass.
const DEPT_NORM_MAP = new Map<string, string>(
  Object.entries(DEPT_ORG_TO_SLUG).map(([name, slug]) => [normalizeOrg(name), slug]),
);

// Alias map for genuine renames — org names that won't match DEPT_ORG_TO_SLUG
// or agency_cache even after normalisation. Keys are normalised (lowercase, '&' → 'and').
// Derived 2026-09-09 from observed data. Covers historical department names only.
export const ORG_ALIAS: Record<string, string> = {
  'department for digital, culture, media and sport': '/departments/culture',
  'charity commission':                               '/agencies/charity-commission',
};

// Resolves a press_releases.organisation string to an internal href.
// Returns /departments/<slug>, /agencies/<slug>, or null if unresolvable.
// Lookup order: exact dept → exact agency → normalised dept → normalised agency → alias.
export function resolveOrgHref(
  name: string,
  agencyExact: Map<string, string>,
  agencyNorm: Map<string, string>,
): string | null {
  // a) Exact — departments take precedence over agencies
  const deptSlug = DEPT_ORG_TO_SLUG[name];
  if (deptSlug) return `/departments/${deptSlug}`;
  if (agencyExact.has(name)) return `/agencies/${agencyExact.get(name)}`;
  // b) Normalised — lowercase, collapse whitespace, treat '&' = 'and'
  const norm = normalizeOrg(name);
  const normDeptSlug = DEPT_NORM_MAP.get(norm);
  if (normDeptSlug) return `/departments/${normDeptSlug}`;
  if (agencyNorm.has(norm)) return `/agencies/${agencyNorm.get(norm)}`;
  // c) Explicit alias — genuine renames only (see ORG_ALIAS above)
  const alias = ORG_ALIAS[norm];
  if (alias) return alias;
  return null;
}

// Resolves a press_releases.organisation string to a department_context slug only.
// Used when you need just the slug (e.g. for DB queries), not a full href.
// Returns null for agencies, unresolvable orgs, and known-absent depts (HMRC, DSIT).
export function resolveOrgToDeptSlug(name: string): string | null {
  const exact = DEPT_ORG_TO_SLUG[name];
  if (exact) return exact;
  const norm = normalizeOrg(name);
  return DEPT_NORM_MAP.get(norm) ?? null;
}
