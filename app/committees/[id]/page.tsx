import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { sanitizeHtml } from '@/lib/html-sanitize';
import { COMMITTEE_IDS } from '@/lib/committees';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';

// dynamicParams = false: any committee ID not in generateStaticParams returns a
// clean Next.js 404 without hitting the database. mp_committee_memberships holds
// 309 distinct committee IDs; only the 29 in COMMITTEE_IDS get pages.
export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return COMMITTEE_IDS.map((id) => ({ id: String(id) }));
}

const INK = '#14100d';
const ACCENT = '#6b2417';
const MONO = 'Special Elite, monospace';

const PARTY_COLOURS: Record<string, string> = {
  Labour: '#e4003b',
  Conservative: '#0087dc',
  'Liberal Democrat': '#faa61a',
  'Scottish National Party': '#fff95d',
  'Reform UK': '#12b6cf',
  'Green Party': '#02a95b',
  'Plaid Cymru': '#005b54',
  'Democratic Unionist Party': '#d46a4c',
  'Sinn Féin': '#326760',
  'Social Democratic & Labour Party': '#2aa82c',
  'Alliance Party': '#f6cb2f',
  Independent: '#888',
};

function partyDot(party: string | null) {
  if (!party) return null;
  const colour = PARTY_COLOURS[party] ?? '#888';
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: colour,
        flexShrink: 0,
        marginTop: '2px',
      }}
    />
  );
}

function formatYear(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).getFullYear().toString();
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabase
    .from('committees')
    .select('name')
    .eq('id', Number(id))
    .single();
  if (!data) return { title: 'Committee' };
  return {
    title: `${data.name} — UK Parliament`,
    description: `Current members of the ${data.name}, sourced from UK Parliament.`,
    alternates: { canonical: `/committees/${id}` },
  };
}

export default async function CommitteeProfilePage({ params }: Props) {
  const { id } = await params;
  const idNum = Number(id);

  const [committeeRes, membershipsRes] = await Promise.all([
    supabase.from('committees').select('*').eq('id', idNum).single(),
    supabase
      .from('mp_committee_memberships')
      .select('member_id, role, start_date, end_date')
      .eq('committee_id', idNum)
      .order('start_date', { ascending: false }),
  ]);

  const committee = committeeRes.data;
  if (!committee) notFound();

  const allMemberships = membershipsRes.data ?? [];
  const currentMemberships = allMemberships.filter((m) => m.end_date === null);
  const formerMemberships = allMemberships.filter((m) => m.end_date !== null);

  // Fetch MP details for current members only (former members shown as count).
  const currentMemberIds = currentMemberships.map((m) => m.member_id);
  let mpRows: { member_id: number; display_name: string; list_as: string; party: string | null; constituency: string | null }[] = [];
  if (currentMemberIds.length > 0) {
    const { data } = await supabase
      .from('mps')
      .select('member_id, display_name, list_as, party, constituency')
      .in('member_id', currentMemberIds);
    mpRows = data ?? [];
  }

  const mpById = new Map(mpRows.map((m) => [m.member_id, m]));

  // Sort: chair first, then alphabetical by list_as.
  const sortedCurrent = [...currentMemberships].sort((a, b) => {
    if (a.role === 'Chair' && b.role !== 'Chair') return -1;
    if (b.role === 'Chair' && a.role !== 'Chair') return 1;
    const aName = mpById.get(a.member_id)?.list_as ?? '';
    const bName = mpById.get(b.member_id)?.list_as ?? '';
    return aName.localeCompare(bName);
  });

  const purposeHtml = committee.purpose ? sanitizeHtml(committee.purpose) : null;

  return (
    <OpenGovShell pageStamp="Committee">
      <BackLink
        fallbackHref="/committees"
        label="← Committees"
        className="no-hover-scale"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '-6%',
          marginBottom: '12px',
          color: INK,
          textDecoration: 'none',
          fontSize: 'clamp(18px, 2.2vw, 28px)',
          transform: 'rotate(-0.2deg)',
        }}
      />

      <p className="text-sm uppercase tracking-[0.3em] mb-3" style={{ color: ACCENT, fontFamily: MONO }}>
        {committee.category} Committee
      </p>

      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight" style={{ color: INK }}>
          {committee.name}
        </h1>
        {committee.start_date && (
          <p className="mt-2 text-sm" style={{ color: `${INK}88`, fontFamily: MONO }}>
            Established {formatYear(committee.start_date)}
            {committee.end_date ? ` · Dissolved ${formatYear(committee.end_date)}` : ''}
          </p>
        )}
      </header>

      {purposeHtml && (
        <div
          className="mb-10 text-sm leading-relaxed pl-4 border-l-2 prose-p:mb-3"
          style={{ borderColor: ACCENT, color: `${INK}cc` }}
          dangerouslySetInnerHTML={{ __html: purposeHtml }}
        />
      )}

      {/* Current membership */}
      <section className="mb-12">
        <h2
          className="text-xs uppercase tracking-[0.25em] mb-5 pb-2 border-b"
          style={{ color: ACCENT, fontFamily: MONO, borderColor: `${INK}22` }}
        >
          Current members ({currentMemberships.length})
        </h2>

        {sortedCurrent.length === 0 ? (
          <p className="text-sm" style={{ color: `${INK}88` }}>No current members on record.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: `${INK}18` }}>
            {sortedCurrent.map((m) => {
              const mp = mpById.get(m.member_id);
              return (
                <div key={m.member_id} className="py-3 flex items-start gap-3">
                  {partyDot(mp?.party ?? null)}
                  <div className="min-w-0">
                    {mp ? (
                      <Link
                        href={`/mps/${m.member_id}`}
                        className="font-semibold text-sm hover:underline"
                        style={{ color: INK }}
                      >
                        {mp.display_name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-sm" style={{ color: INK }}>
                        Member {m.member_id}
                      </span>
                    )}
                    <span className="text-xs ml-2" style={{ color: `${INK}88`, fontFamily: MONO }}>
                      {mp?.party ?? ''}
                      {mp?.constituency ? ` · ${mp.constituency}` : ''}
                      {m.role === 'Chair' ? ' · Chair' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Former members — count only in v1; evidence sessions come later */}
      {formerMemberships.length > 0 && (
        <section className="mb-8">
          <h2
            className="text-xs uppercase tracking-[0.25em] mb-3 pb-2 border-b"
            style={{ color: `${INK}66`, fontFamily: MONO, borderColor: `${INK}18` }}
          >
            Former members
          </h2>
          <p className="text-sm" style={{ color: `${INK}88` }}>
            {formerMemberships.length} former member{formerMemberships.length !== 1 ? 's' : ''} on record.
          </p>
        </section>
      )}

      <p className="text-xs mt-6" style={{ color: `${INK}55`, fontFamily: MONO }}>
        Source: UK Parliament members and committees APIs. Updated nightly.
      </p>
    </OpenGovShell>
  );
}
