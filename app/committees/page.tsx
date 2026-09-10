import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Select Committees — UK Parliament',
  description: 'Current membership of the 29 select and cross-cutting committees of the House of Commons, sourced from UK Parliament.',
  alternates: { canonical: '/committees' },
};

const INK = '#14100d';
const ACCENT = '#6b2417';
const MONO = 'Special Elite, monospace';

type CommitteeRow = {
  id: number;
  name: string;
  committee_type_id: number | null;
};

type MembershipRow = {
  committee_id: number;
  member_id: number;
  role: string | null;
};

type MpRow = {
  member_id: number;
  display_name: string;
};

// Groups shown on the index, in display order.
const GROUPS: { label: string; typeIds: number[] }[] = [
  { label: 'Departmental Select Committees', typeIds: [1] },
  { label: 'Cross-Cutting Select Committees', typeIds: [22] },
  { label: 'Other Select Committees', typeIds: [3, 2, 4, 9, 23, 24, 26] },
];

export default async function CommitteesIndexPage() {
  const [committeesRes, membershipsRes] = await Promise.all([
    supabase
      .from('committees')
      .select('id, name, committee_type_id')
      .order('name'),
    supabase
      .from('mp_committee_memberships')
      .select('committee_id, member_id, role')
      .is('end_date', null),
  ]);

  const committees: CommitteeRow[] = committeesRes.data ?? [];
  const memberships: MembershipRow[] = membershipsRes.data ?? [];

  // Collect chair member_ids so we can fetch their display names.
  const chairMemberIds = [
    ...new Set(
      memberships
        .filter((m) => m.role === 'Chair')
        .map((m) => m.member_id),
    ),
  ];

  let mps: MpRow[] = [];
  if (chairMemberIds.length > 0) {
    const { data } = await supabase
      .from('mps')
      .select('member_id, display_name')
      .in('member_id', chairMemberIds);
    mps = data ?? [];
  }

  const mpById = new Map(mps.map((m) => [m.member_id, m.display_name]));

  // Build per-committee stats.
  const stats = new Map<number, { count: number; chair: string | null }>();
  for (const m of memberships) {
    const s = stats.get(m.committee_id) ?? { count: 0, chair: null };
    s.count++;
    if (m.role === 'Chair') s.chair = mpById.get(m.member_id) ?? null;
    stats.set(m.committee_id, s);
  }

  return (
    <OpenGovShell pageStamp="Committees">
      <header className="mb-10">
        <p className="text-sm uppercase tracking-[0.3em] mb-3" style={{ color: ACCENT, fontFamily: MONO }}>
          UK Parliament
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight" style={{ color: INK }}>
          Select Committees
        </h1>
        <p className="mt-4 text-base leading-relaxed" style={{ color: INK, maxWidth: '72ch' }}>
          Select committees scrutinise the work of government departments and public bodies on behalf of the House of Commons. Membership and chair data sourced from UK Parliament.
        </p>
      </header>

      {GROUPS.map((group) => {
        const groupCommittees = committees.filter((c) =>
          group.typeIds.includes(c.committee_type_id ?? -1),
        );
        if (groupCommittees.length === 0) return null;

        return (
          <section key={group.label} className="mb-12">
            <h2
              className="text-xs uppercase tracking-[0.25em] mb-5 pb-2 border-b"
              style={{ color: ACCENT, fontFamily: MONO, borderColor: `${INK}22` }}
            >
              {group.label}
            </h2>
            <div className="divide-y" style={{ borderColor: `${INK}18` }}>
              {groupCommittees.map((c) => {
                const s = stats.get(c.id);
                return (
                  <div key={c.id} className="py-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <Link
                      href={`/committees/${c.id}`}
                      className="font-semibold text-base hover:underline"
                      style={{ color: INK }}
                    >
                      {c.name}
                    </Link>
                    <span className="text-sm" style={{ color: `${INK}99`, fontFamily: MONO }}>
                      {s ? `${s.count} member${s.count !== 1 ? 's' : ''}` : 'no data'}
                      {s?.chair ? ` · Chair: ${s.chair}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="text-xs mt-8" style={{ color: `${INK}66`, fontFamily: MONO }}>
        Source: UK Parliament members and committees APIs. Updated nightly.
      </p>
    </OpenGovShell>
  );
}
