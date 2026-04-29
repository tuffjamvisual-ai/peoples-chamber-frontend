import Link from 'next/link';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import Navigation from './components/Navigation';

// Cache the whole page for an hour. The Anthropic calls in section 4 are
// expensive and the source data (bills + GOV.UK feed) doesn't move faster
// than that.
export const revalidate = 3600;

const GOLD = '#60a5fa';

const SECTIONS = [
  { title: 'Bills',           body: 'Every bill going through Parliament. How MPs voted. How you voted. The gap between the two.' },
  { title: 'MPs',             body: 'All 650 current MPs. Their voting record, financial interests, and contact details. Searchable.' },
  { title: 'Departments',     body: 'All 24 government departments. Who runs them, what they control, what every party says about each topic.' },
  { title: 'Transparency Hub',body: 'Government contracts. Revolving door appointments. Who meets whom. The paper trail.' },
  { title: 'Laws',            body: 'Acts of Parliament already on the statute book. What passed and what it means.' },
  { title: "People's Polls",  body: "Public votes on live legislation. Parliament's position vs yours. No spin applied." },
];

type GovukItem = { title: string; organisation: string | null; date: string | null };
type ContrastBill = {
  id: number;
  title: string;
  commons_ayes: number;
  commons_noes: number;
  vote_count_yes: number;
  vote_count_no: number;
  observation: string | null;
};

async function fetchGovukPressReleases(): Promise<GovukItem[]> {
  try {
    const url = 'https://www.gov.uk/api/search.json?filter_content_store_document_type=press_release&order=-public_timestamp&count=6';
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: { title?: string; organisations?: { title?: string }[]; public_timestamp?: string }) => ({
      title: r.title || '(untitled)',
      organisation: r.organisations?.[0]?.title || null,
      date: r.public_timestamp ? r.public_timestamp.slice(0, 10) : null,
    }));
  } catch {
    return [];
  }
}

const SATIRE_SYSTEM = 'You write one dry, deadpan factual observation about the gap between how Parliament voted and how the public voted on a UK bill. Maximum 20 words. No jokes. No editorialising. State the gap as fact. Private Eye tone. Never use the word irony or contrast.';

async function generateObservation(bill: ContrastBill): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic();
    const totalCommons = bill.commons_ayes + bill.commons_noes;
    const totalPublic = bill.vote_count_yes + bill.vote_count_no;
    const commonsAyePct = totalCommons > 0 ? Math.round((bill.commons_ayes / totalCommons) * 100) : 0;
    const publicYesPct = totalPublic > 0 ? Math.round((bill.vote_count_yes / totalPublic) * 100) : 0;
    const userText = `Bill: "${bill.title}"\nParliament voted: ${bill.commons_ayes} ayes vs ${bill.commons_noes} noes (${commonsAyePct}% in favour).\nPublic voted: ${bill.vote_count_yes} support vs ${bill.vote_count_no} oppose (${publicYesPct}% in favour).`;
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      system: SATIRE_SYSTEM,
      messages: [{ role: 'user', content: userText }],
    });
    const block = resp.content[0];
    if (block?.type === 'text') return block.text.trim();
    return null;
  } catch {
    return null;
  }
}

async function fetchContrastBills(): Promise<ContrastBill[]> {
  const { data } = await supabase
    .from('bill')
    .select('id, title, commons_ayes, commons_noes, vote_count_yes, vote_count_no, last_update')
    .gt('vote_count_yes', 0)
    .order('last_update', { ascending: false })
    .limit(50);
  const candidates = (data || [])
    .filter((b) => (b.vote_count_yes + b.vote_count_no) > 100)
    .slice(0, 3)
    .map((b) => ({
      id: b.id,
      title: b.title,
      commons_ayes: b.commons_ayes || 0,
      commons_noes: b.commons_noes || 0,
      vote_count_yes: b.vote_count_yes || 0,
      vote_count_no: b.vote_count_no || 0,
      observation: null as string | null,
    }));
  // Generate observations in parallel.
  const observations = await Promise.all(candidates.map(generateObservation));
  return candidates.map((b, i) => ({ ...b, observation: observations[i] }));
}

async function fetchFooterCounts() {
  const [billsRes, mpsRes, contractsRes, doorRes] = await Promise.all([
    supabase.from('bill').select('id', { count: 'exact', head: true }),
    supabase.from('mps').select('member_id', { count: 'exact', head: true }).eq('current_member', true),
    supabase.from('government_contracts').select('title', { count: 'exact', head: true }),
    supabase.from('revolving_door').select('person_name', { count: 'exact', head: true }),
  ]);
  return {
    bills: billsRes.count ?? 0,
    mps: mpsRes.count ?? 0,
    contracts: contractsRes.count ?? 0,
    revolvingDoor: doorRes.count ?? 0,
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

function formatPercent(num: number, denom: number): string {
  if (denom <= 0) return '0%';
  return `${Math.round((num / denom) * 100)}%`;
}

export default async function HomePage() {
  // Run the four data sources in parallel — Anthropic latency dominates.
  const [press, contrast, counts] = await Promise.all([
    fetchGovukPressReleases(),
    fetchContrastBills(),
    fetchFooterCounts(),
  ]);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-gray-200">
      <Navigation />

      {/* 1. HERO */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-20">
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6" style={{ color: GOLD }}>
          UK Government, Observed.
        </h1>
        <p className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-3xl mb-10">
          A factual account of what Parliament does. Accompanied by a record of what everyone else thinks about it. Readers may draw their own conclusions.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/departments"
            className="px-6 py-3 font-semibold rounded transition-opacity hover:opacity-80"
            style={{ backgroundColor: GOLD, color: '#0a0f1a' }}
          >
            Explore Departments
          </Link>
          <Link
            href="/mps"
            className="px-6 py-3 font-semibold rounded transition-opacity hover:opacity-80"
            style={{ backgroundColor: GOLD, color: '#0a0f1a' }}
          >
            View MPs
          </Link>
        </div>
      </section>

      {/* 2. WHAT YOU'LL FIND */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-8">What you&apos;ll find</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: GOLD }}>{s.title}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. THE RECORD (latest GOV.UK press releases) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-8">The Record</h2>
        {press.length === 0 ? (
          <p className="text-gray-500 text-sm">No releases available right now.</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {press.map((p, i) => (
              <li key={i} className="py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-white text-base leading-snug">{p.title}</h3>
                  {p.date && <span className="text-gray-500 text-xs whitespace-nowrap font-mono">{formatDate(p.date)}</span>}
                </div>
                {p.organisation && (
                  <p className="text-xs mt-1" style={{ color: GOLD }}>{p.organisation}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4. PROCEEDINGS AND REACTIONS (satire by juxtaposition) */}
      {contrast.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-8">Proceedings and Reactions</h2>
          <ul className="divide-y divide-gray-800">
            {contrast.map((b) => {
              const totalCommons = b.commons_ayes + b.commons_noes;
              const totalPublic = b.vote_count_yes + b.vote_count_no;
              return (
                <li key={b.id} className="py-6">
                  <h3 className="text-white text-base font-medium leading-snug mb-3">{b.title}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm mb-3">
                    <div className="text-gray-400">
                      <span className="text-gray-500">Parliament:</span> {b.commons_ayes.toLocaleString()} ayes, {b.commons_noes.toLocaleString()} noes
                      {totalCommons > 0 && <span className="text-gray-600"> ({formatPercent(b.commons_ayes, totalCommons)} in favour)</span>}
                    </div>
                    <div className="text-gray-400">
                      <span className="text-gray-500">Public:</span> {formatPercent(b.vote_count_yes, totalPublic)} support, {formatPercent(b.vote_count_no, totalPublic)} oppose
                    </div>
                  </div>
                  {b.observation && (
                    <p className="text-gray-500 italic text-sm leading-relaxed">{b.observation}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 5. FOOTER STATS */}
      <section className="border-t border-gray-800 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-8">
            {[
              { label: 'Bills', value: counts.bills },
              { label: 'MPs', value: counts.mps },
              { label: 'Government contracts', value: counts.contracts },
              { label: 'Revolving door cases', value: counts.revolvingDoor },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold font-mono" style={{ color: GOLD }}>
                  {s.value.toLocaleString()}
                </div>
                <div className="text-xs uppercase tracking-wider text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
