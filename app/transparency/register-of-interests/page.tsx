import type { Metadata } from 'next';
import LastUpdated from '../../components/LastUpdated';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import Pagination from '../../components/Pagination';
import RegisterSearchClient from './RegisterSearchClient';
import DonationsCounter from './DonationsCounter';
import { getDeclaredMpDonationsTotal } from '@/lib/mpDonationsTotal';

// The Register of Members' Financial Interests — a searchable, cross-MP view of
// what MPs declare to Parliament (gifts, hospitality, employment, property,
// shareholdings and more). This is the parliamentary register and is entirely
// SEPARATE from Electoral Commission political donations (/transparency/donations),
// which is donor-side party/candidate funding. The page makes that distinction
// explicit to visitors.
//
// Data lives in mp_registered_interests (3,409 entries, 588 of 650 MPs). Search
// is Postgres full-text over interest_text (GIN index on the generated
// interest_search tsvector). Filters: MP, category (12 official → 8 buckets),
// date range on created_when. v1 does NO donor/amount parsing — amounts show
// inline within the entry text. Reading searchParams makes this page dynamic;
// filtered/paginated states are noindex so we don't spawn thin query-string URLs.

export const revalidate = 3600;

const INK = '#14100d';
const ACCENT = '#6b2417';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = "'Special Elite', monospace";
const PAGE_LIMIT = 40;

// 12 official register categories collapsed into 8 friendly buckets. Each bucket
// matches by the leading category number (e.g. "2." catches "2. (a)" and "2. (b)").
// LIKE '1.%' will not match "10." because the second character differs.
const BUCKETS: { key: string; label: string; prefixes: string[] }[] = [
  { key: 'employment', label: 'Employment & earnings', prefixes: ['1.'] },
  { key: 'donations', label: 'Donations & support', prefixes: ['2.'] },
  { key: 'gifts', label: 'Gifts & hospitality', prefixes: ['3.', '5.'] },
  { key: 'visits', label: 'Overseas visits', prefixes: ['4.'] },
  { key: 'property', label: 'Land & property', prefixes: ['6.'] },
  { key: 'shareholdings', label: 'Shareholdings', prefixes: ['7.'] },
  { key: 'family', label: 'Family', prefixes: ['9.', '10.'] },
  { key: 'misc', label: 'Miscellaneous', prefixes: ['8.'] },
];

function bucketLabelForCategory(categoryName: string): string {
  const m = categoryName.match(/^(\d+)\./);
  const num = m ? m[1] : '';
  const b = BUCKETS.find((bk) => bk.prefixes.some((p) => p.replace('.', '') === num));
  return b ? b.label : 'Other';
}

type SP = { [k: string]: string | string[] | undefined };
function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? '';
}
function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = !!(one(sp.q) || one(sp.mp) || one(sp.cat) || one(sp.from) || one(sp.to) || (one(sp.page) && one(sp.page) !== '1'));
  return {
    title: "Register of Members' Financial Interests — Search Every MP",
    description:
      "Search the Register of Members' Financial Interests: gifts, hospitality, employment, overseas visits, property and shareholdings declared by every UK MP. Filter by MP, category and date. Separate from Electoral Commission political donations.",
    alternates: { canonical: '/transparency/register-of-interests' },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

interface InterestRow {
  id: number;
  member_id: number;
  category_name: string;
  interest_text: string;
  created_when: string | null;
}
interface MpRow {
  member_id: number;
  name: string;
  display_name: string | null;
  photo_url: string | null;
}

// Render Parliament's labelled entry text ("Name of donor: X", "(Registered ...)")
// into readable lines: label part semibold, registration/update line muted.
function renderInterestText(text: string) {
  const lines = text.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line, i) => {
    const isMeta = /^\((?:registered|updated|last)/i.test(line);
    if (isMeta) {
      return (
        <div key={i} style={{ fontSize: '15px', color: INK, opacity: 0.7, marginTop: '6px', fontStyle: 'italic' }}>
          {line}
        </div>
      );
    }
    const colon = line.indexOf(':');
    if (colon > 0 && colon < 60) {
      return (
        <div key={i} style={{ fontSize: '15px', lineHeight: 1.55, color: INK, marginBottom: '2px' }}>
          <span style={{ fontWeight: 700 }}>{line.slice(0, colon + 1)}</span>
          {line.slice(colon + 1)}
        </div>
      );
    }
    return (
      <div key={i} style={{ fontSize: '15px', lineHeight: 1.55, color: INK, marginBottom: '2px' }}>
        {line}
      </div>
    );
  });
}

export default async function RegisterOfInterestsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const mpParam = one(sp.mp);
  const mpId = /^\d+$/.test(mpParam) ? parseInt(mpParam, 10) : 0;
  const cat = one(sp.cat);
  const from = one(sp.from);
  const to = one(sp.to);
  const page = Math.max(1, parseInt(one(sp.page) || '1', 10) || 1);
  const offset = (page - 1) * PAGE_LIMIT;

  const bucket = BUCKETS.find((b) => b.key === cat);

  // Results query (filters + count), plus the MP list for the autocomplete.
  let query = supabase
    .from('mp_registered_interests')
    .select('id, member_id, category_name, interest_text, created_when', { count: 'exact' });

  // Current register only by default: historical/expired entries (retained for
  // cumulative views once the backfill lands) are excluded from this default
  // search view. A current/historical toggle is added in the results redesign.
  query = query.eq('is_current', true);

  if (q) query = query.textSearch('interest_search', q, { type: 'websearch', config: 'english' });
  if (mpId) query = query.eq('member_id', mpId);
  if (bucket) query = query.or(bucket.prefixes.map((p) => `category_name.like.${p}*`).join(','));
  if (isValidDate(from)) query = query.gte('created_when', from);
  if (isValidDate(to)) query = query.lte('created_when', `${to}T23:59:59`);

  query = query.order('created_when', { ascending: false, nullsFirst: false }).range(offset, offset + PAGE_LIMIT - 1);

  const [{ data: rows, count, error }, mpListRes, donationsTotal] = await Promise.all([
    query,
    supabase.from('mps').select('member_id, name, display_name').eq('current_member', true).order('name'),
    getDeclaredMpDonationsTotal(),
  ]);

  const interests = (rows ?? []) as InterestRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  // Resolve MP names for the current page (second lightweight query — avoids
  // FK-embed ambiguity and keeps the results query index-friendly).
  const memberIds = Array.from(new Set(interests.map((r) => r.member_id)));
  let mpsById = new Map<number, MpRow>();
  if (memberIds.length) {
    const { data: mpRows } = await supabase
      .from('mps')
      .select('member_id, name, display_name, photo_url')
      .in('member_id', memberIds);
    mpsById = new Map((mpRows ?? []).map((m) => [m.member_id, m as MpRow]));
  }

  const mpOptions = (mpListRes.data ?? []).map((m) => ({
    id: m.member_id as number,
    name: (m.display_name as string) || (m.name as string),
  }));

  // Name of the selected MP (for the "no interests registered" nil-return state).
  const selectedMpName = mpId ? mpOptions.find((m) => m.id === mpId)?.name ?? '' : '';

  // Preserve filter state across pagination.
  const qsParts: string[] = [];
  if (q) qsParts.push(`q=${encodeURIComponent(q)}`);
  if (mpId) qsParts.push(`mp=${mpId}`);
  if (cat) qsParts.push(`cat=${encodeURIComponent(cat)}`);
  if (isValidDate(from)) qsParts.push(`from=${from}`);
  if (isValidDate(to)) qsParts.push(`to=${to}`);
  const qsExtra = qsParts.length ? `&${qsParts.join('&')}` : '';

  const hasFilters = !!(q || mpId || cat || isValidDate(from) || isValidDate(to));
  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

  return (
    <OpenGovShell pageStamp="Register of Interests" stampStyle={{ top: '3.4cqw' }}>
      <BackLink
        fallbackHref="/transparency"
        label="← Transparency"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px', color: INK, opacity: 0.85 }}>
          Parliamentary Register
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '14px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Register of Members&rsquo; Financial Interests
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.75, maxWidth: '760px', color: INK }}>
          What MPs themselves declare to Parliament: gifts, hospitality, employment and earnings, overseas visits, land and property, shareholdings and family interests. Search {total.toLocaleString('en-GB')} declared entries across every MP, filter by category or date, and follow each entry back to the Member.
        </p>

        {/* Explicit distinction from Electoral Commission donations. */}
        <div style={{ marginTop: '16px', padding: '12px 16px', border: `1px solid ${HAIRLINE}`, borderLeft: `3px solid ${ACCENT}`, background: 'rgba(107,36,23,0.04)', maxWidth: '760px' }}>
          <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.65, color: INK }}>
            This is the <strong>parliamentary register</strong> — declarations MPs make about their own interests. It is separate from{' '}
            <Link href="/transparency/donations" style={{ color: ACCENT, textDecoration: 'underline' }}>
              political donations
            </Link>{' '}
            recorded by the Electoral Commission, which tracks money given to parties and candidates. Two different registers, two different sources.
          </p>
        </div>

        <DonationsCounter
          total={donationsTotal.total}
          entryCount={donationsTotal.entryCount}
          asOf={donationsTotal.asOf}
        />
      </header>

      <RegisterSearchClient
        mps={mpOptions}
        buckets={BUCKETS.map((b) => ({ key: b.key, label: b.label }))}
        initial={{ q, mp: mpId ? String(mpId) : '', mpName: selectedMpName, cat, from, to }}
      />

      {/* Results summary */}
      <div style={{ margin: '20px 0 14px', fontFamily: MONO, fontSize: '15px', color: INK }}>
        {hasFilters ? (
          <>
            {total.toLocaleString('en-GB')} {total === 1 ? 'entry' : 'entries'} match
            {q && (
              <>
                {' '}&ldquo;<strong>{q}</strong>&rdquo;
              </>
            )}
          </>
        ) : (
          <>Showing all {total.toLocaleString('en-GB')} entries, most recently registered first</>
        )}
      </div>

      {error && (
        <p style={{ fontSize: '15px', color: ACCENT }}>Something went wrong loading the register. Please try again.</p>
      )}

      {/* Empty states: distinguish a nil-return MP from a no-match search. */}
      {!error && interests.length === 0 && (
        <div style={{ padding: '28px 20px', border: `1px solid ${HAIRLINE}`, textAlign: 'center', color: INK }}>
          {mpId ? (
            <>
              <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px' }}>
                {selectedMpName || 'This MP'} has no entries in the register
              </p>
              <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0, opacity: 0.8 }}>
                Nothing is recorded for this MP in the Register of Members&rsquo; Financial Interests. That is a valid state — not every MP has a registrable interest.
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px' }}>No register entries match your search</p>
              <p style={{ fontSize: '15px', margin: 0, opacity: 0.8 }}>
                Try a different term or{' '}
                <Link href="/transparency/register-of-interests" style={{ color: ACCENT, textDecoration: 'underline' }}>
                  clear the filters
                </Link>
                .
              </p>
            </>
          )}
        </div>
      )}

      {/* Result cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {interests.map((row) => {
          const mp = mpsById.get(row.member_id);
          const mpName = mp ? mp.display_name || mp.name : `Member ${row.member_id}`;
          return (
            <article key={row.id} style={{ border: `1px solid ${HAIRLINE}`, borderLeft: `3px solid ${ACCENT}`, padding: '16px 18px', background: 'rgba(20,16,13,0.015)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {mp?.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mp.photo_url} alt="" width={36} height={36} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${HAIRLINE}` }} />
                )}
                <Link href={`/mps/${row.member_id}#interests`} style={{ fontSize: '17px', fontWeight: 700, color: INK, textDecoration: 'none' }}>
                  {mpName}
                </Link>
                <span style={{ fontFamily: MONO, fontSize: '15px', color: '#fff', background: ACCENT, padding: '2px 8px', letterSpacing: '0.03em' }}>
                  {bucketLabelForCategory(row.category_name)}
                </span>
                {row.created_when && (
                  <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: '15px', color: INK, opacity: 0.75 }}>
                    {fmtDate(row.created_when)}
                  </span>
                )}
              </div>
              <div>{renderInterestText(row.interest_text)}</div>
            </article>
          );
        })}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          baseUrl="/transparency/register-of-interests"
          qsExtra={qsExtra}
        />
      )}

      <p style={{ marginTop: '28px', fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, opacity: 0.75, maxWidth: '760px' }}>
        Source: the Register of Members&rsquo; Financial Interests, published by the House of Commons and synced from the Parliament Members API. Entries are the Members&rsquo; own declarations. Covers 588 of 650 current MPs; the remainder have no registrable interests recorded.
      </p>
      <LastUpdated sourceKey="registered_interests" />
    </OpenGovShell>
  );
}
