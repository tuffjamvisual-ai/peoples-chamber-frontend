import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navigation from './components/Navigation';

export const revalidate = 3600;

const ACCENT = '#60a5fa'; // blue-400 — site-wide accent

type GovukItem = { title: string; organisation: string | null; date: string | null; link: string | null };
type CommitteeItem = { committee_name: string | null; title: string | null; publication_date: string | null; publication_type: string | null; url: string | null };
type SpotlightBill = {
  id: number;
  title: string;
  vote_count_yes: number;
  vote_count_no: number;
  commons_ayes: number;
  commons_noes: number;
  total_public: number;
};
type RevolvingRow = { person_name: string; previous_role: string | null; organisation: string | null; approval_date: string | null };
type ContractRow = { title: string | null; supplier: string | null; value: number | null; awarded_date: string | null };

const EXPLORE = [
  { emoji: '📜', title: 'Bills',          href: '/bills',        body: 'Every bill in Parliament. How MPs voted. How you voted.' },
  { emoji: '🏛️', title: 'MPs',            href: '/mps',          body: 'All 650 current MPs, their voting record and interests.' },
  { emoji: '🏢', title: 'Departments',    href: '/departments',  body: '24 government departments and what every party says.' },
  { emoji: '🔍', title: 'Transparency',   href: '/transparency', body: 'Contracts, revolving door, meetings, lobbying.' },
  { emoji: '⚖️', title: 'Laws',           href: '/laws',         body: 'Acts of Parliament already on the statute book.' },
  { emoji: '🗳️', title: "People's Polls", href: '/polls',        body: 'Public votes on live legislation. Parliament vs you.' },
];

// ─── data fetchers ──────────────────────────────────────────────────────

async function fetchGovukPressReleases(): Promise<GovukItem[]> {
  try {
    const url = 'https://www.gov.uk/api/search.json?filter_content_store_document_type=press_release&order=-public_timestamp&count=6';
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: { title?: string; organisations?: { title?: string }[]; public_timestamp?: string; link?: string }) => ({
      title: r.title || '(untitled)',
      organisation: r.organisations?.[0]?.title || null,
      date: r.public_timestamp ? r.public_timestamp.slice(0, 10) : null,
      link: r.link || null,
    }));
  } catch {
    return [];
  }
}

async function fetchCommitteeProceedings(): Promise<CommitteeItem[]> {
  const { data } = await supabase
    .from('committee_proceedings')
    .select('committee_name, title, publication_date, publication_type, url')
    .order('publication_date', { ascending: false, nullsFirst: false })
    .limit(6);
  return data || [];
}

async function fetchSpotlightBills(): Promise<SpotlightBill[]> {
  // Order by raw yes-count to get the most-engaged bills cheaply, then
  // re-sort by total (yes+no) client-side for the final headline metric.
  const { data } = await supabase
    .from('bill')
    .select('id, title, vote_count_yes, vote_count_no, commons_ayes, commons_noes')
    .gt('vote_count_yes', 0)
    .order('vote_count_yes', { ascending: false })
    .limit(30);
  return (data || [])
    .map((b) => ({
      id: b.id,
      title: b.title,
      vote_count_yes: b.vote_count_yes || 0,
      vote_count_no: b.vote_count_no || 0,
      commons_ayes: b.commons_ayes || 0,
      commons_noes: b.commons_noes || 0,
      total_public: (b.vote_count_yes || 0) + (b.vote_count_no || 0),
    }))
    .sort((a, b) => b.total_public - a.total_public)
    .slice(0, 3);
}

async function fetchRecentRevolving(): Promise<RevolvingRow[]> {
  const { data } = await supabase
    .from('revolving_door')
    .select('person_name, previous_role, organisation, approval_date')
    .order('approval_date', { ascending: false, nullsFirst: false })
    .limit(3);
  return data || [];
}

async function fetchRecentContracts(): Promise<ContractRow[]> {
  const { data } = await supabase
    .from('government_contracts')
    .select('title, supplier, value, awarded_date')
    .order('awarded_date', { ascending: false, nullsFirst: false })
    .limit(3);
  return data || [];
}

async function fetchCounts() {
  const [billsRes, mpsRes, contractsRes, doorRes, meetingsRes] = await Promise.all([
    supabase.from('bill').select('id', { count: 'exact', head: true }),
    supabase.from('mps').select('member_id', { count: 'exact', head: true }).eq('current_member', true),
    supabase.from('government_contracts').select('title', { count: 'exact', head: true }),
    supabase.from('revolving_door').select('person_name', { count: 'exact', head: true }),
    supabase.from('ministers_meetings').select('minister_name', { count: 'exact', head: true }),
  ]);
  return {
    bills: billsRes.count ?? 0,
    mps: mpsRes.count ?? 0,
    contracts: contractsRes.count ?? 0,
    transparency: (doorRes.count ?? 0) + (meetingsRes.count ?? 0),
  };
}

// ─── formatters ─────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatMoney(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (v >= 1_000_000_000) return `£${(v / 1_000_000_000).toFixed(1)}bn`;
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}m`;
  if (v >= 1_000) return `£${Math.round(v / 1_000)}k`;
  return `£${Math.round(v)}`;
}

function pct(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.round((num / denom) * 100);
}

// ─── component ──────────────────────────────────────────────────────────

export default async function HomePage() {
  const [press, committee, bills, revolving, contracts, counts] = await Promise.all([
    fetchGovukPressReleases(),
    fetchCommitteeProceedings(),
    fetchSpotlightBills(),
    fetchRecentRevolving(),
    fetchRecentContracts(),
    fetchCounts(),
  ]);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-gray-200">
      <Navigation />

      {/* 1. HERO */}
      <section className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-6">UK Parliament · Government · Politics</p>
          <h1 className="text-5xl sm:text-7xl font-black leading-[0.95] tracking-tight mb-8" style={{ color: ACCENT }}>
            UK Government,<br />Observed.
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-3xl mb-10">
            A factual account of what Parliament does. Accompanied by a record of what everyone else thinks about it. Readers may draw their own conclusions.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/departments"
              className="px-6 py-3 font-semibold rounded transition-opacity hover:opacity-80"
              style={{ backgroundColor: ACCENT, color: '#0a0f1a' }}
            >
              Explore Departments
            </Link>
            <Link
              href="/mps"
              className="px-6 py-3 font-semibold rounded border-2 transition-colors hover:bg-gray-900"
              style={{ borderColor: ACCENT, color: ACCENT }}
            >
              View MPs
            </Link>
          </div>
        </div>
      </section>

      {/* 2. LIVE STATS BAR */}
      <section className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-800">
            {[
              { value: counts.bills,        label: 'Bills tracked' },
              { value: counts.mps,          label: 'Current MPs' },
              { value: counts.contracts,    label: 'Govt contracts' },
              { value: counts.transparency, label: 'Transparency records' },
            ].map((s, i) => (
              <div key={s.label} className={`px-4 sm:px-6 ${i === 0 ? 'pl-0' : ''}`}>
                <div className="text-3xl sm:text-4xl font-bold font-mono" style={{ color: ACCENT }}>
                  {s.value.toLocaleString()}
                </div>
                <div className="text-xs uppercase tracking-wider text-gray-400 mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. LATEST GOVERNMENT NEWS */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-8">The Record</h2>
        {press.length === 0 ? (
          <p className="text-gray-500 text-sm">No releases available right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {press.map((p, i) => {
              const href = p.link ? `https://www.gov.uk${p.link}` : null;
              return (
                <article key={i} className="pl-4 py-1 border-l-2" style={{ borderColor: ACCENT }}>
                  {p.organisation && (
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: ACCENT }}>{p.organisation}</p>
                  )}
                  {href ? (
                    <h3 className="text-base leading-snug mb-2">
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-blue-300 transition-colors"
                      >
                        {p.title}
                      </a>
                    </h3>
                  ) : (
                    <h3 className="text-white text-base leading-snug mb-2">{p.title}</h3>
                  )}
                  {p.date && <p className="text-xs text-gray-500 font-mono">{formatDate(p.date)}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 3b. COMMITTEE WATCH */}
      {committee.length > 0 && (
        <section className="border-t border-gray-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
            <h2 className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-8">Committee watch</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {committee.map((c, i) => (
                <article key={i} className="pl-4 py-1 border-l-2" style={{ borderColor: ACCENT }}>
                  {c.committee_name && (
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: ACCENT }}>{c.committee_name}</p>
                  )}
                  {c.url ? (
                    <h3 className="text-base leading-snug mb-2">
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-blue-300 transition-colors"
                      >
                        {c.title || '(untitled)'}
                      </a>
                    </h3>
                  ) : (
                    <h3 className="text-white text-base leading-snug mb-2">{c.title || '(untitled)'}</h3>
                  )}
                  <div className="flex items-center gap-3 text-xs">
                    {c.publication_date && <span className="text-gray-500 font-mono">{formatDate(c.publication_date)}</span>}
                    {c.publication_type && <span className="text-gray-600">· {c.publication_type}</span>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. BILLS IN THE SPOTLIGHT */}
      {bills.length > 0 && (
        <section className="border-t border-gray-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-sm uppercase tracking-[0.3em] text-gray-500">Bills in the spotlight</h2>
              <Link href="/bills" className="text-sm hover:underline" style={{ color: ACCENT }}>
                View all bills →
              </Link>
            </div>
            <div className="space-y-8">
              {bills.map((b) => {
                const yesPct = pct(b.vote_count_yes, b.total_public);
                const noPct = pct(b.vote_count_no, b.total_public);
                const commonsTotal = b.commons_ayes + b.commons_noes;
                return (
                  <div key={b.id}>
                    <h3 className="text-white text-lg font-medium leading-snug mb-3">{b.title}</h3>
                    <div className="mb-2">
                      <div className="flex h-2 w-full overflow-hidden rounded bg-gray-800">
                        <div className="bg-green-600" style={{ width: `${yesPct}%` }} />
                        <div className="bg-red-600" style={{ width: `${noPct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs mt-2 font-mono">
                        <span className="text-green-400">{yesPct}% support · {b.vote_count_yes.toLocaleString()} yes</span>
                        <span className="text-red-400">{noPct}% oppose · {b.vote_count_no.toLocaleString()} no</span>
                      </div>
                    </div>
                    {commonsTotal > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Parliament: {b.commons_ayes.toLocaleString()} ayes · {b.commons_noes.toLocaleString()} noes ({pct(b.commons_ayes, commonsTotal)}% in favour)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 5. RECENT TRANSPARENCY */}
      <section className="border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-sm uppercase tracking-[0.3em] text-gray-500">Recent transparency</h2>
            <Link href="/transparency" className="text-sm hover:underline" style={{ color: ACCENT }}>
              Transparency hub →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Revolving Door */}
            <div>
              <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: ACCENT }}>Revolving door</h3>
              {revolving.length === 0 ? (
                <p className="text-gray-500 text-sm">No records yet.</p>
              ) : (
                <ul className="space-y-5">
                  {revolving.map((r, i) => (
                    <li key={i}>
                      <div className="text-white text-sm font-medium">{r.person_name}</div>
                      {r.previous_role && <div className="text-xs text-gray-400 mt-0.5">{r.previous_role}</div>}
                      {r.organisation && <div className="text-xs text-gray-500 mt-0.5">{r.organisation}</div>}
                      {r.approval_date && <div className="text-xs text-gray-600 mt-1 font-mono">{formatDate(r.approval_date)}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Contracts */}
            <div>
              <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: ACCENT }}>Government contracts</h3>
              {contracts.length === 0 ? (
                <p className="text-gray-500 text-sm">No records yet.</p>
              ) : (
                <ul className="space-y-5">
                  {contracts.map((c, i) => (
                    <li key={i}>
                      <div className="text-white text-sm font-medium leading-snug">{c.title || '(untitled)'}</div>
                      {c.supplier && <div className="text-xs text-gray-400 mt-0.5">{c.supplier}</div>}
                      <div className="flex items-baseline gap-3 mt-1">
                        <span className="text-sm font-mono" style={{ color: ACCENT }}>{formatMoney(c.value)}</span>
                        {c.awarded_date && <span className="text-xs text-gray-600 font-mono">{formatDate(c.awarded_date)}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6. EXPLORE SECTIONS */}
      <section className="border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-8">Explore</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXPLORE.map((e) => (
              <Link
                key={e.title}
                href={e.href}
                className="block p-6 border border-gray-800 rounded-lg transition-colors hover:border-gray-700 hover:bg-gray-900/40"
              >
                <div className="text-3xl mb-3" aria-hidden="true">{e.emoji}</div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: ACCENT }}>{e.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{e.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
