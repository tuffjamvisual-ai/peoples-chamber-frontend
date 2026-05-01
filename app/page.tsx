import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navigation from './components/Navigation';

export const revalidate = 3600;

const ACCENT = '#ffffff';
const ACCENT_2 = '#7697a2';
const SUCCESS = '#4a8a3a';
const DANGER = '#8a3a3a';

type GovukItem = {
  title: string;
  organisation: string | null;
  date: string | null;
  summary: string | null;
};
type CommitteeItem = {
  id: number;
  committee_name: string | null;
  title: string | null;
  publication_date: string | null;
};
type RevolvingRow = {
  person_name: string;
  previous_role: string | null;
  organisation: string | null;
  approval_date: string | null;
};
type ContractRow = {
  title: string | null;
  supplier: string | null;
  value: number | null;
  awarded_date: string | null;
};
type DonationRow = {
  donor_name: string | null;
  recipient_name: string | null;
  amount: number | null;
  received_date: string | null;
};
type SpotlightBill = {
  id: number;
  title: string;
  vote_count_yes: number;
  vote_count_no: number;
  commons_ayes: number;
  commons_noes: number;
  total_public: number;
};

const SECTIONS = [
  { title: 'MPs',            href: '/mps',          body: 'All 650 sitting Members and their record.' },
  { title: 'Departments',    href: '/departments',  body: '24 departments and where every party stands.' },
  { title: 'Transparency',   href: '/transparency', body: 'Contracts, donations, lobbying, the lot.' },
  { title: 'Laws',           href: '/laws',         body: 'Acts of Parliament already on the books.' },
  { title: "People's Polls", href: '/polls',        body: 'Public votes on live legislation.' },
];

// ─── Data fetchers ─────────────────────────────────────────────────────────

async function fetchGovukPressReleases(count = 4): Promise<GovukItem[]> {
  // Fetched server-side and rendered as text-only headlines (no anchor),
  // since gov.uk press releases have no internal counterpart on this site.
  try {
    const url = `https://www.gov.uk/api/search.json?filter_content_store_document_type=press_release&order=-public_timestamp&count=${count}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: { title?: string; description?: string; organisations?: { title?: string }[]; public_timestamp?: string }) => ({
      title: r.title || '(untitled)',
      organisation: r.organisations?.[0]?.title || null,
      date: r.public_timestamp ? r.public_timestamp.slice(0, 10) : null,
      summary: r.description || null,
    }));
  } catch {
    return [];
  }
}

async function fetchCommitteeProceedings(): Promise<CommitteeItem[]> {
  const { data } = await supabase
    .from('committee_proceedings')
    .select('id, committee_name, title, publication_date')
    .order('publication_date', { ascending: false, nullsFirst: false })
    .limit(3);
  return data || [];
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

async function fetchRecentDonations(): Promise<DonationRow[]> {
  const { data } = await supabase
    .from('political_donations')
    .select('donor_name, recipient_name, amount, received_date')
    .order('received_date', { ascending: false, nullsFirst: false })
    .limit(3);
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

// ─── Formatters ────────────────────────────────────────────────────────────

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

function formatAmountFull(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `£${Math.round(v).toLocaleString('en-GB')}`;
}

function pct(num: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.round((num / denom) * 100);
}

function firstTwoSentences(text: string): string {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (!matches) return text.trim();
  return matches.slice(0, 2).join(' ').trim();
}

// ─── Component ─────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [pressAll, committee, revolving, contracts, donations, bills] = await Promise.all([
    fetchGovukPressReleases(4),
    fetchCommitteeProceedings(),
    fetchRecentRevolving(),
    fetchRecentContracts(),
    fetchRecentDonations(),
    fetchSpotlightBills(),
  ]);

  const lead: GovukItem | null = pressAll[0] || null;
  const press: GovukItem[] = pressAll.slice(1, 4);

  return (
    <div className="min-h-screen bg-[#001520] text-white">
      <Navigation />

      {/* ── Hero — full-width background image ──────────────────────── */}
      {lead && (
        <section
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url(https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          className="w-full border-b border-[#1c3849]"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-20">
            {lead.organisation && (
              <p className="text-[10px] uppercase tracking-[0.3em] mb-4 font-semibold text-white opacity-70">
                {lead.organisation}
              </p>
            )}
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.0] tracking-tight mb-6 max-w-5xl text-white">
              {lead.title}
            </h2>
            {lead.summary && (
              <p className="text-base sm:text-lg text-[#c9c9c9] leading-[1.7] max-w-3xl mb-5">
                {firstTwoSentences(lead.summary)}
              </p>
            )}
            {lead.date && (
              <p className="text-[11px] text-[#7697a2] font-mono uppercase tracking-[0.2em]">
                {formatDate(lead.date)}
              </p>
            )}
          </div>
        </section>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-12">
        {/* ── Second Tier — 3 columns ─────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-px border border-[#1c3849] mb-12">
          {/* Press Releases */}
          <div className="p-5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] mb-5 pb-3 border-b border-[#1c3849] font-semibold" style={{ color: ACCENT }}>
              Press Releases
            </h3>
            {press.length === 0 ? (
              <p className="text-[#7697a2] text-[12px]">No press releases.</p>
            ) : (
              <ul className="space-y-5">
                {press.map((p, i) => (
                  <li key={i}>
                    {p.organisation && (
                      <p className="text-[9px] uppercase tracking-[0.25em] mb-1.5 text-[#7697a2] font-mono">
                        {p.organisation}
                      </p>
                    )}
                    <h4 className="text-[13px] text-white font-semibold leading-snug mb-1.5">
                      {p.title}
                    </h4>
                    {p.date && (
                      <p className="text-[10px] text-[#7697a2] font-mono uppercase tracking-[0.15em]">
                        {formatDate(p.date)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Committee Watch */}
          <div className="p-5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] mb-5 pb-3 border-b border-[#1c3849] font-semibold" style={{ color: ACCENT_2 }}>
              Committee Watch
            </h3>
            {committee.length === 0 ? (
              <p className="text-[#7697a2] text-[12px]">No committee proceedings.</p>
            ) : (
              <ul className="space-y-5">
                {committee.map((c) => (
                  <li key={c.id}>
                    {c.committee_name && (
                      <p className="text-[9px] uppercase tracking-[0.25em] mb-1.5 text-[#7697a2] font-mono">
                        {c.committee_name}
                      </p>
                    )}
                    <h4 className="text-[13px] font-semibold leading-snug mb-1.5">
                      <Link href={`/committees/${c.id}`} className="text-white hover:text-[#ffffff] transition-colors">
                        {c.title || '(untitled)'}
                      </Link>
                    </h4>
                    {c.publication_date && (
                      <p className="text-[10px] text-[#7697a2] font-mono uppercase tracking-[0.15em]">
                        {formatDate(c.publication_date)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Revolving Door */}
          <div className="p-5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] mb-5 pb-3 border-b border-[#1c3849] font-semibold flex items-center justify-between" style={{ color: ACCENT }}>
              <span>Revolving Door</span>
              <Link href="/transparency/revolving-door" className="text-[9px] tracking-[0.25em] hover:underline">
                More →
              </Link>
            </h3>
            {revolving.length === 0 ? (
              <p className="text-[#7697a2] text-[12px]">No appointments.</p>
            ) : (
              <ul className="space-y-5">
                {revolving.map((r, i) => (
                  <li key={i}>
                    <h4 className="text-[13px] text-white font-semibold leading-snug mb-1">
                      {r.person_name}
                    </h4>
                    {r.organisation && (
                      <p className="text-[12px] text-[#7697a2] leading-[1.7] mb-1.5">
                        {r.organisation}
                      </p>
                    )}
                    {r.approval_date && (
                      <p className="text-[10px] text-[#7697a2] font-mono uppercase tracking-[0.15em]">
                        {formatDate(r.approval_date)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Third Tier — 2 columns ──────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-px border border-[#1c3849] mb-12">
          {/* Government Contracts */}
          <div className="p-5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] mb-5 pb-3 border-b border-[#1c3849] font-semibold flex items-center justify-between" style={{ color: ACCENT }}>
              <span>Government Contracts</span>
              <Link href="/transparency/contracts" className="text-[9px] tracking-[0.25em] hover:underline">
                More →
              </Link>
            </h3>
            {contracts.length === 0 ? (
              <p className="text-[#7697a2] text-[12px]">No contracts.</p>
            ) : (
              <ul className="space-y-5">
                {contracts.map((c, i) => (
                  <li key={i}>
                    <h4 className="text-[13px] text-white font-semibold leading-snug mb-1">
                      {c.title || '(untitled)'}
                    </h4>
                    {c.supplier && (
                      <p className="text-[12px] text-[#7697a2] leading-[1.7] mb-1">
                        {c.supplier}
                      </p>
                    )}
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-sm font-bold" style={{ color: ACCENT }}>
                        {formatMoney(c.value)}
                      </span>
                      {c.awarded_date && (
                        <span className="text-[10px] text-[#7697a2] font-mono uppercase tracking-[0.15em]">
                          {formatDate(c.awarded_date)}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Political Donations */}
          <div className="p-5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] mb-5 pb-3 border-b border-[#1c3849] font-semibold flex items-center justify-between" style={{ color: ACCENT_2 }}>
              <span>Political Donations</span>
              <Link href="/transparency/donations" className="text-[9px] tracking-[0.25em] hover:underline">
                More →
              </Link>
            </h3>
            {donations.length === 0 ? (
              <p className="text-[#7697a2] text-[12px]">No donations.</p>
            ) : (
              <ul className="space-y-5">
                {donations.map((d, i) => (
                  <li key={i}>
                    <h4 className="text-[13px] text-white font-semibold leading-snug mb-1">
                      {d.donor_name || '(unknown donor)'}
                    </h4>
                    {d.recipient_name && (
                      <p className="text-[12px] text-[#7697a2] leading-[1.7] mb-1">
                        to <span className="text-white">{d.recipient_name}</span>
                      </p>
                    )}
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-sm font-bold" style={{ color: ACCENT_2 }}>
                        {formatAmountFull(d.amount)}
                      </span>
                      {d.received_date && (
                        <span className="text-[10px] text-[#7697a2] font-mono uppercase tracking-[0.15em]">
                          {formatDate(d.received_date)}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Fourth Tier — Public vs Parliament ──────────────────────── */}
        {bills.length > 0 && (
          <section className="border-y border-[#1c3849] py-12 mb-12">
            <p className="text-[10px] uppercase tracking-[0.3em] mb-3 font-semibold" style={{ color: ACCENT }}>
              The Public vs Parliament
            </p>
            <div className="flex items-baseline justify-between mb-10">
              <h2 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight">
                Bills in the Spotlight
              </h2>
              <Link href="/bills" className="text-[10px] uppercase tracking-[0.3em] hover:underline" style={{ color: ACCENT }}>
                All bills →
              </Link>
            </div>

            <div className="space-y-10">
              {bills.map((b) => {
                const yesPct = pct(b.vote_count_yes, b.total_public);
                const noPct = pct(b.vote_count_no, b.total_public);
                const commonsTotal = b.commons_ayes + b.commons_noes;
                const commonsAyePct = pct(b.commons_ayes, commonsTotal);
                return (
                  <article key={b.id} className="border-l-2 pl-5" style={{ borderLeftColor: ACCENT }}>
                    <h3 className="text-base sm:text-xl font-bold leading-snug mb-4">
                      <Link href={`/bills/${b.id}`} className="text-white hover:text-[#ffffff] transition-colors">
                        {b.title}
                      </Link>
                    </h3>

                    <p className="text-[10px] uppercase tracking-[0.25em] text-[#7697a2] font-mono mb-1.5">
                      Public · {b.total_public.toLocaleString()} votes
                    </p>
                    <div className="flex h-2 w-full bg-[#1c3849] mb-1.5">
                      <div style={{ width: `${yesPct}%`, backgroundColor: SUCCESS }} />
                      <div style={{ width: `${noPct}%`, backgroundColor: DANGER }} />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono mb-4">
                      <span style={{ color: SUCCESS }}>
                        {yesPct}% support · {b.vote_count_yes.toLocaleString()}
                      </span>
                      <span style={{ color: DANGER }}>
                        {noPct}% oppose · {b.vote_count_no.toLocaleString()}
                      </span>
                    </div>

                    {commonsTotal > 0 && (
                      <>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-[#7697a2] font-mono mb-1.5">
                          Parliament · {commonsTotal.toLocaleString()} MPs
                        </p>
                        <div className="flex h-2 w-full bg-[#1c3849] mb-1.5">
                          <div style={{ width: `${commonsAyePct}%`, backgroundColor: SUCCESS, opacity: 0.55 }} />
                          <div style={{ width: `${100 - commonsAyePct}%`, backgroundColor: DANGER, opacity: 0.55 }} />
                        </div>
                        <div className="flex justify-between text-[11px] font-mono">
                          <span style={{ color: SUCCESS }}>
                            {commonsAyePct}% ayes · {b.commons_ayes.toLocaleString()}
                          </span>
                          <span style={{ color: DANGER }}>
                            {100 - commonsAyePct}% noes · {b.commons_noes.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Bottom Bar — section directory ──────────────────────────── */}
        <section className="border-t-4 border-double border-[#1c3849] pt-10 pb-16">
          <p className="text-[10px] uppercase tracking-[0.3em] mb-6 font-semibold text-[#7697a2]">
            Sections
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px border border-[#1c3849]">
            {SECTIONS.map((s) => (
              <li key={s.title} className="">
                <Link
                  href={s.href}
                  className="group block h-full p-5 hover:bg-[#001520] transition-colors border-l-2 border-transparent hover:border-l-[#ffffff]"
                >
                  <h3 className="text-base font-bold mb-2 group-hover:text-[#ffffff] transition-colors" style={{ color: ACCENT }}>
                    {s.title}
                  </h3>
                  <p className="text-[12px] text-[#7697a2] leading-[1.7]">{s.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
