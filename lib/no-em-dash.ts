// Site rule (owner, 16 Oct 2026): no em or en dashes in opengovt's own wording. Text read from the database is passed
// through this on its way to the page, so labels and names stay consistent. The stored original is never changed.
// Official text we quote word for word, and official names, are left exactly as published (owner, 5 Nov 2026): the
// columns in EXACT_COLUMNS below, and the live official sources read with plain res.json().
//
//   "word — word"   -> "word, word"     (a comma reads closest to a dash)
//   "word, — word"  -> "word, word"     (no doubled punctuation)
//   "1990—2000"     -> "1990 to 2000"   (number ranges)
//   "was asked—"    -> "was asked:"     (a dash that ends a heading or line)
//   "— word" at the start of a value    -> "word"
// &mdash; and &#8212; in HTML bodies are treated the same as the character.

const DASH = '(?:\\u2014|&mdash;|&#8212;|&#x2014;)';
const RANGE = new RegExp(`(\\d)\\s*${DASH}\\s*(\\d)`, 'g');
const LEADING = new RegExp(`(^|["'>(\\[])\\s*${DASH}\\s*`, 'g');
const TRAILING = new RegExp(`\\s*${DASH}\\s*(?=$|["'<)\\]\\n])`, 'g');
const AFTER_PUNCT = new RegExp(`([,;:.!?])\\s*${DASH}\\s*`, 'g');
const MIDDLE = new RegExp(`\\s*${DASH}\\s*`, 'g');

// En dashes in official text: a spaced one ("WITTON – WITTON LANE") reads as a break, so it
// takes a comma like an em dash; an unspaced one joining two words or numbers ("UK–Taiwan",
// "2024–25") becomes a hyphen.
const EN = '(?:\\u2013|&ndash;|&#8211;|&#x2013;)';
const EN_JOINED = new RegExp(`([A-Za-z0-9])${EN}(?=[A-Za-z0-9])`, 'g');
const EN_SPACED = new RegExp(`\\s+${EN}\\s+`, 'g');
const ANY_DASH = /—|–|&mdash;|&ndash;|&#821[12];|&#x201[34];/i;

export function withoutEmDashes(text: string): string {
  if (!text || !ANY_DASH.test(text)) return text;
  return text
    .replace(EN_JOINED, '$1-')
    .replace(EN_SPACED, ', ')
    .replace(RANGE, '$1 to $2')
    .replace(LEADING, '$1')
    .replace(TRAILING, ':')
    .replace(AFTER_PUNCT, '$1 ')
    .replace(MIDDLE, ', ');
}

// During `next build`, a database read that fails (a 5xx answer such as a statement timeout, or no answer) is tried
// once more after 5 seconds before the page's own error stops the build (owner's approval, 21 Oct 2026: two builds
// that day failed on a passing slowdown while other jobs were writing). Reads are GET/HEAD requests and calls to
// read functions (POST /rest/v1/rpc/...); a second failure still stops the build. Outside a build nothing is retried.
const BUILD_RETRY_MS = 5_000;
const isBuild = () => process.env.NEXT_PHASE === 'phase-production-build';

async function fetchRetryingReadsInBuild(input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1], method: string): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isRead = method === 'GET' || method === 'HEAD' || (method === 'POST' && url.includes('/rest/v1/rpc/'));
  if (!isBuild() || !isRead) return fetch(input, init);
  let first: Response | null = null;
  try {
    first = await fetch(input, init);
    if (first.status < 500) return first;
  } catch {
    // no answer: retried below
  }
  console.warn(`database read failed during build (${first ? `HTTP ${first.status}` : 'no answer'}); trying once more in ${BUILD_RETRY_MS / 1000} s: ${url.replace(/\?.*$/, '')}`);
  await new Promise((r) => setTimeout(r, BUILD_RETRY_MS));
  return fetch(input, init);
}

// Official text quoted word for word and official names (owner, 5 Nov 2026): these columns reach the page exactly as
// published. Links and lookups read the same exact value: slugs ignore punctuation, so they come out the same, and a
// lookup by name now finds the stored row. A slug would only change for a name with an em dash between two numbers,
// and no stored name has one. "rpc/<function>" is a read function's result.
const EXACT_COLUMNS: Record<string, string[]> = {
  // Parliament
  hansard_contributions: ['contribution_text', 'value_html', 'debate_title', 'attributed_to'],
  hansard_debates: ['title', 'prev_title', 'next_title'],
  debates: ['title', 'summary'],
  lords_divisions: ['motion_text'],
  early_day_motions: ['title', 'motion_text'],
  early_day_motion_signatures: ['early_day_motions'],   // the joined motion on MP pages
  parliament_written_questions: ['question_text', 'answer_text', 'answer_html'],
  bill: ['title', 'long_title', 'description'],
  bill_in_session: ['title'],
  bill_topic_listing_stored: ['title'],
  'rpc/topic_bills': ['title'],
  'rpc/topic_bills_page': ['title'],
  committees: ['name'],
  pmqs_archive_sessions: ['prime_minister_as_named', 'source', 'note'],
  pmqs_archive_exchanges: ['attributed_to', 'contribution_text', 'parlparse_text', 'parlparse_speaker_id', 'member_id_confidence', 'display_source', 'source'],
  pmqs_archive_people: ['parlparse_speaker_id', 'parlparse_person_id', 'name', 'confidence', 'how_matched', 'most_common_printed_name', 'historic_hansard_url'],
  pmqs_library_totals: ['prime_minister', 'note'],
  committee_proceedings: ['title'],
  peers: ['committee_memberships'],
  statutory_instruments: ['title'],
  treaties: ['title'],
  petitions: ['action', 'background', 'additional_details', 'government_response_summary', 'government_response_details', 'debate_overview'],
  petition_constituency_signatures: ['constituency_name', 'petitions'],
  pac_reports: ['title'],
  pac_source_documents: ['title'],
  pac_recommendations: ['conclusion_text', 'recommendation_text'],
  pac_recommendation_events: ['response_text', 'revised_target_text', 'progress_text'],
  pac_recommendation_status: ['report_title', 'latest_target_text'],
  mp_registered_interests: ['interest_text'],
  peer_registered_interests: ['interest_text'],
  mp_interests: ['summary', 'detail'],
  mp_staff_interests: ['description'],
  appgs: ['purpose', 'secretariat'],
  // Government and regulators
  press_releases: ['title', 'description', 'body', 'organisation'],
  'rpc/related_press_releases': ['title', 'organisation'],
  ministers_meetings: ['purpose', 'organisation'],
  lobby_meeting_mentions: ['purpose', 'raw_name'],
  lobby_orgs: ['name'],
  lobby_org_rankings: ['name'],
  orcl_client_returns: ['client_name', 'firm_name'],
  revolving_door: ['conditions', 'description'],
  major_projects: ['cost_narrative', 'schedule_narrative', 'rating_narrative', 'evaluation_plan', 'name'],
  government_contracts: ['title', 'description', 'supplier'],
  government_contracts_counted: ['title', 'description', 'supplier'],
  contract_notices: ['title', 'change_description', 'change_reason', 'buyer_name', 'suppliers'],
  contract_awards: ['title', 'buyer_name', 'supplier', 'supplier_key'],
  organisation_contracts: ['title', 'supplier'],
  organisation_index: ['name', 'name_variants'],
  organisation_company_pages: ['variants'],
  government_grants: ['recipient_name', 'funder_name', 'scheme_title', 'title'],
  government_grant_schemes: ['description', 'title', 'funder_name'],
  person_cache: ['biography', 'description', 'current_roles', 'past_roles', 'name', 'full_name'],
  agency_cache: ['description', 'body', 'name', 'ministers', 'board_members', 'parent_orgs', 'featured_docs'],
  dept_agencies: ['name'],
  political_donations: ['purpose_of_visit', 'explanatory_notes', 'donor_name', 'trust_name', 'trust_creator_name', 'accounting_unit_name', 'campaigning_name'],
  party_names: ['published_name'],
  council_election_candidates: ['party_published'],
  sewage_overflows: ['site_name', 'site_name_operator'],
  mp_expenses_detail: ['short_description', 'details'],
};

// People's names (owner, 5 Nov 2026): as published, except that a dash with no space either side, between two letters,
// is a hyphen ("Thomas–Symonds" on GOV.UK, "Thomas-Symonds" at Parliament). lib/person-name.ts adds Parliament's spelling.
export const hyphenatePersonName = (name: string) => name.replace(/(\p{L})[\u2013\u2014](?=\p{L})/gu, '$1-');
const PERSON_COLUMNS: Record<string, string[]> = { person_cache: ['name', 'full_name'] };
const PERSON_LISTS: Record<string, string[]> = { agency_cache: ['ministers', 'board_members'] };   // lists of { name, ... }

function hyphenatePeople(row: unknown, table: string): unknown {
  if (!row || typeof row !== 'object') return row;
  const out = { ...(row as Record<string, unknown>) };
  for (const c of PERSON_COLUMNS[table] ?? []) if (typeof out[c] === 'string') out[c] = hyphenatePersonName(out[c] as string);
  for (const c of PERSON_LISTS[table] ?? []) {
    const list = out[c];
    if (Array.isArray(list)) out[c] = list.map((p) => (p && typeof p.name === 'string' ? { ...p, name: hyphenatePersonName(p.name) } : p));
  }
  return out;
}

const tableOf = (input: Parameters<typeof fetch>[0]): string | null => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return url.match(/\/rest\/v1\/((?:rpc\/)?[a-z0-9_]+)(?:[?#]|$)/)?.[1] ?? null;
};

// One row with the rule applied to every value except the exact columns.
function ruleExceptExact(row: unknown, exact: string[]): unknown {
  if (!row || typeof row !== 'object') return row;
  return Object.fromEntries(Object.entries(row as Record<string, unknown>).map(([key, value]) => [
    key,
    exact.includes(key) || value === null || typeof value === 'number' || typeof value === 'boolean'
      ? value
      : typeof value === 'string' ? withoutEmDashes(value) : JSON.parse(withoutEmDashes(JSON.stringify(value))),
  ]));
}

export function applyDashRule(body: string, table: string | null): string {
  const exact = table ? EXACT_COLUMNS[table] : undefined;
  if (!exact) return withoutEmDashes(body);
  if (!ANY_DASH.test(body)) return body;
  try {
    const data: unknown = JSON.parse(body);
    const one = (r: unknown) => hyphenatePeople(ruleExceptExact(r, exact), table as string);
    return JSON.stringify(Array.isArray(data) ? data.map(one) : one(data));
  } catch {
    return body;   // not row data (an error message): nothing to clean
  }
}

// A fetch for Supabase clients that applies the rule to every read (GET/HEAD) response, except the exact columns.
// Writes are passed through untouched, so nothing altered is ever written back.
export const fetchWithoutEmDashes: typeof fetch = async (input, init) => {
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const res = await fetchRetryingReadsInBuild(input, init, method);
  if (method !== 'GET' && method !== 'HEAD') return res;
  const type = res.headers.get('content-type') || '';
  if (!type.includes('json')) return res;
  const body = await res.text();
  const cleaned = applyDashRule(body, tableOf(input));
  if (cleaned === body) { const h = new Headers(res.headers); h.delete('content-length'); h.delete('content-encoding'); return new Response(body, { status: res.status, statusText: res.statusText, headers: h }); }
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(cleaned, { status: res.status, statusText: res.statusText, headers });
};
