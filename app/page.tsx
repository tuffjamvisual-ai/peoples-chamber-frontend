import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navigation from './components/Navigation';

export const revalidate = 3600;

const ACCENT = '#60a5fa';
const ACCENT_2 = '#818cf8';
const SUCCESS = '#34d399';
const DANGER = '#f87171';

type GovukItem = { title: string; organisation: string | null; date: string | null; link: string | null };
type CommitteeItem = { id: number; committee_name: string | null; title: string | null; publication_date: string | null; publication_type: string | null; summary: string | null };
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
  { title: 'Bills',          href: '/bills',        body: 'Every bill in Parliament. How MPs voted. How you voted.' },
  { title: 'MPs',            href: '/mps',          body: 'All 650 current MPs, their voting record and interests.' },
  { title: 'Departments',    href: '/departments',  body: '24 government departments and what every party says.' },
  { title: 'Transparency',   href: '/transparency', body: 'Contracts, revolving door, meetings, lobbying.' },
  { title: 'Laws',           href: '/laws',         body: 'Acts of Parliament already on the statute book.' },
  { title: "People's Polls", href: '/polls',        body: 'Public votes on live legislation. Parliament vs you.' },
];

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
    .select('id, committee_name, title, publication_date, publication_type, summary')
    .order('publication_date', { ascending: false, nullsFirst: false })
    .limit(6);
  return data || [];
}

async function fetchSpotlightBills(): Promise<SpotlightBill[]> {
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
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <Navigation />

      {/* Hero */}
      <section className="border-b border-[#1e2a3a]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <p className="text-[10px] uppercase tracking-[0.3em] mb-6 font-medium" style={{ color: ACCENT }}>
            UK Parliament · Government · Politics
          </p>
          <h1 className="text-5xl sm:text-7xl font-black leading-[1.0] tracking-tight mb-8 text-white">
            UK Government,<br />
            <span style={{ color: ACCENT }}>Observed.</span>
          </h1>
          <p className="text-base sm:text-lg text-[#9ca3af] leading-[1.7] max-w-2xl mb-10">
            A factual account of what Parliament does. Accompanied by a record of what everyone else thinks about it. Readers may draw their own conclusions.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/departments"
              className="px-5 py-3 text-[12px] uppercase tracking-[0.2em] font-bold rounded-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: ACCENT, color: '#0a0f1a' }}
            >
              Explore Departments
            </Link>
            <Link
              href="/mps"
              className="px-5 py-3 text-[12px] uppercase tracking-[0.2em] font-bold rounded-sm border transition-colors hover:bg-[#0d1520]"
              style={{ borderColor: ACCENT, color: ACCENT }}
            >
              View MPs
            </Link>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="border-b border-[#1e2a3a]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1e2a3a]">
            {[
              { value: counts.bills,        label: 'Bills tracked' },
              { value: counts.mps,          label: 'Current MPs' },
              { value: counts.contracts,    label: 'Govt contracts' },
              { value: counts.transparency, label: 'Transparency records' },
            ].map((s) => (
              <div key={s.label} className="bg-[#0a0f1a] px-4 sm:px-6 py-8">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#9ca3af] font-medium mb-2">{s.label}</p>
                <p className="text-3xl sm:text-4xl font-black leading-none tracking-tight font-mono" style={{ color: ACCENT }}>
                  {s.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Record */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 border-b border-[#1e2a3a]">
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#9ca3af] font-semibold">The Record</h2>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#4b5563] font-mono">Latest from gov.uk</span>
        </div>
        {press.length === 0 ? (
          <p className="text-[#9ca3af] text-sm">No releases available right now.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1e2a3a] border border-[#1e2a3a]">
            {press.map((p, i) => {
              const href = p.link ? `https://www.gov.uk${p.link}` : null;
              return (
                <li key={i} className="bg-[#0d1520] p-5 border-l-2 border-l-[#60a5fa]">
                  {p.organisation && (
                    <p className="text-[10px] uppercase tracking-[0.25em] mb-2 font-medium" style={{ color: ACCENT }}>
                      {p.organisation}
                    </p>
                  )}
                  <h3 className="text-[14px] leading-snug mb-2 font-semibold">
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#60a5fa] transition-colors">
                        {p.title}
                      </a>
                    ) : (
                      <span className="text-white">{p.title}</span>
                    )}
                  </h3>
                  {p.date && <p className="text-[11px] text-[#4b5563] font-mono">{formatDate(p.date)}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Committee Watch */}
      {committee.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 border-b border-[#1e2a3a]">
          <div className="flex items-baseline justify-between mb-10">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#9ca3af] font-semibold">Committee Watch</h2>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#4b5563] font-mono">Parliament committees</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1e2a3a] border border-[#1e2a3a]">
            {committee.map((c) => (
              <li key={c.id} className="bg-[#0d1520] p-5 border-l-2" style={{ borderLeftColor: ACCENT_2 }}>
                {c.committee_name && (
                  <p className="text-[10px] uppercase tracking-[0.25em] mb-2 font-medium" style={{ color: ACCENT_2 }}>
                    {c.committee_name}
                  </p>
                )}
                <h3 className="text-[14px] leading-snug mb-2 font-semibold">
                  <Link href={`/committees/${c.id}`} className="text-white hover:text-[#60a5fa] transition-colors">
                    {c.title || '(untitled)'}
                  </Link>
                </h3>
                <div className="flex items-center gap-3 text-[11px]">
                  {c.publication_date && <span className="text-[#4b5563] font-mono">{formatDate(c.publication_date)}</span>}
                  {c.publication_type && <span className="text-[#4b5563]">· {c.publication_type}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bills in spotlight */}
      {bills.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 border-b border-[#1e2a3a]">
          <div className="flex items-baseline justify-between mb-10">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#9ca3af] font-semibold">Bills in the Spotlight</h2>
            <Link href="/bills" className="text-[10px] uppercase tracking-[0.3em] hover:underline" style={{ color: ACCENT }}>
              All bills →
            </Link>
          </div>
          <div className="space-y-10">
            {bills.map((b) => {
              const yesPct = pct(b.vote_count_yes, b.total_public);
              const noPct = pct(b.vote_count_no, b.total_public);
              const commonsTotal = b.commons_ayes + b.commons_noes;
              return (
                <div key={b.id} className="border-l-2 pl-4" style={{ borderLeftColor: ACCENT }}>
                  <h3 className="text-white text-base sm:text-lg font-bold leading-snug mb-3">{b.title}</h3>
                  <div className="mb-2">
                    <div className="flex h-2 w-full overflow-hidden bg-[#1e2a3a]">
                      <div style={{ width: `${yesPct}%`, backgroundColor: SUCCESS }} />
                      <div style={{ width: `${noPct}%`, backgroundColor: DANGER }} />
                    </div>
                    <div className="flex justify-between text-[11px] mt-2 font-mono">
                      <span style={{ color: SUCCESS }}>{yesPct}% support · {b.vote_count_yes.toLocaleString()} yes</span>
                      <span style={{ color: DANGER }}>{noPct}% oppose · {b.vote_count_no.toLocaleString()} no</span>
                    </div>
                  </div>
                  {commonsTotal > 0 && (
                    <p className="text-[11px] text-[#4b5563] mt-2 font-mono">
                      Parliament: {b.commons_ayes.toLocaleString()} ayes · {b.commons_noes.toLocaleString()} noes ({pct(b.commons_ayes, commonsTotal)}% in favour)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Transparency */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 border-b border-[#1e2a3a]">
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#9ca3af] font-semibold">Recent Transparency</h2>
          <Link href="/transparency" className="text-[10px] uppercase tracking-[0.3em] hover:underline" style={{ color: ACCENT }}>
            Hub →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: ACCENT }}>Revolving Door</h3>
            {revolving.length === 0 ? (
              <p className="text-[#9ca3af] text-sm">No records yet.</p>
            ) : (
              <ul className="space-y-5">
                {revolving.map((r, i) => (
                  <li key={i} className="border-l-2 pl-3 py-1" style={{ borderLeftColor: ACCENT }}>
                    <div className="text-white text-sm font-semibold">{r.person_name}</div>
                    {r.previous_role && <div className="text-[12px] text-[#9ca3af] mt-0.5 leading-[1.7]">{r.previous_role}</div>}
                    {r.organisation && <div className="text-[12px] text-[#4b5563] mt-0.5 leading-[1.7]">{r.organisation}</div>}
                    {r.approval_date && <div className="text-[11px] text-[#4b5563] mt-1 font-mono">{formatDate(r.approval_date)}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-[0.25em] mb-4 font-semibold" style={{ color: ACCENT_2 }}>Government Contracts</h3>
            {contracts.length === 0 ? (
              <p className="text-[#9ca3af] text-sm">No records yet.</p>
            ) : (
              <ul className="space-y-5">
                {contracts.map((c, i) => (
                  <li key={i} className="border-l-2 pl-3 py-1" style={{ borderLeftColor: ACCENT_2 }}>
                    <div className="text-white text-sm font-semibold leading-snug">{c.title || '(untitled)'}</div>
                    {c.supplier && <div className="text-[12px] text-[#9ca3af] mt-0.5 leading-[1.7]">{c.supplier}</div>}
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="text-sm font-mono font-semibold" style={{ color: ACCENT_2 }}>{formatMoney(c.value)}</span>
                      {c.awarded_date && <span className="text-[11px] text-[#4b5563] font-mono">{formatDate(c.awarded_date)}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Explore */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#9ca3af] font-semibold mb-10">Explore</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1e2a3a] border border-[#1e2a3a]">
          {EXPLORE.map((e) => (
            <li key={e.title} className="bg-[#0d1520]">
              <Link
                href={e.href}
                className="group block p-6 hover:bg-[#111827] transition-colors border-l-2 border-transparent hover:border-l-[#60a5fa]"
              >
                <h3 className="text-base font-bold mb-2 group-hover:text-[#60a5fa] transition-colors" style={{ color: ACCENT }}>
                  {e.title}
                </h3>
                <p className="text-[13px] text-[#9ca3af] leading-[1.7]">{e.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
