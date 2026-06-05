// Server-rendered division detail page. Slug matches the ParlParse identifier
// format we already use to identify divisions: pw-YYYY-MM-DD-N-commons.
//
// All data comes from our own DB (mp_division_votes + mps). No upstream
// runtime fetches. The page is the canonical destination for an external
// link from the MP voting record — replaces the previously broken
// commonsvotes.parliament.uk redirect.
//
// Layout follows the dossier conventions: cream/ink palette, Special Elite
// for body, EB Garamond for the title only, vote columns grouped by party,
// tellers flagged inline, 'both' votes in a small footnote section.

import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';
import { partyColourForMember, normaliseParty } from '@/lib/party-helpers';

export const revalidate = 86400;  // divisions don't change after the vote happens

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.3)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';
const SUCCESS = '#4a8a3a';
const DANGER = '#a64030';

// Slug forms accepted:
//   pw-2026-04-28-515-commons   (TWFY / ParlParse canonical)
//   pw-2026-04-28-515            (chamber omitted — defaults to commons)
const SLUG_RE = /^pw-(\d{4}-\d{2}-\d{2})-(\d+)(?:-commons)?$/;

interface PageProps {
  params: Promise<{ slug: string }>;
}

type VoteRow = {
  member_id: number;
  vote_type: 'aye' | 'no' | 'both' | string;
  is_teller: boolean | null;
  is_rebellion: boolean | null;
  bill_id: number | null;
  division_title: string | null;
  division_date: string;
  division_id: number | null;
};

type MpRow = {
  member_id: number;
  display_name: string | null;
  name: string | null;
  party: string | null;
  party_colour: string | null;
  constituency: string | null;
  photo_url: string | null;
};

type Vote = VoteRow & { mp: MpRow | null };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const m = SLUG_RE.exec(slug);
  if (!m) return { title: 'Division' };
  const dateOnly = m[1];
  const divisionNumber = parseInt(m[2], 10);

  const { data: row } = await supabase
    .from('mp_division_votes')
    .select('division_title, division_date')
    .eq('division_date_only', dateOnly)
    .eq('division_number', divisionNumber)
    .limit(1)
    .maybeSingle();
  if (!row) return { title: 'Division' };

  const dateLabel = new Date(row.division_date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const title = `${row.division_title} — Commons Division ${divisionNumber}, ${dateLabel} | The People's Chamber`;
  const description = `How every MP voted on ${row.division_title} in the House of Commons on ${dateLabel}.`;
  return {
    title: title.length > 200 ? title.slice(0, 197).trimEnd() + '…' : title,
    description: description.length > 200 ? description.slice(0, 197).trimEnd() + '…' : description,
    alternates: { canonical: `/divisions/${slug}` },
  };
}

export default async function DivisionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const m = SLUG_RE.exec(slug);
  if (!m) notFound();
  const dateOnly = m[1];
  const divisionNumber = parseInt(m[2], 10);

  // All vote rows for this division. Natural-key index makes this cheap.
  const { data: voteRows } = await supabase
    .from('mp_division_votes')
    .select('member_id, vote_type, is_teller, is_rebellion, bill_id, division_title, division_date, division_id')
    .eq('division_date_only', dateOnly)
    .eq('division_number', divisionNumber);

  if (!voteRows || voteRows.length === 0) notFound();

  // MP lookup — single batch on the distinct member_ids.
  const memberIds = Array.from(new Set(voteRows.map((v) => v.member_id)));
  const { data: mpRows } = await supabase
    .from('mps')
    .select('member_id, display_name, name, party, party_colour, constituency, photo_url')
    .in('member_id', memberIds);
  const mpById = new Map<number, MpRow>((mpRows ?? []).map((m) => [m.member_id, m as MpRow]));

  const votes: Vote[] = voteRows.map((v) => ({ ...v, mp: mpById.get(v.member_id) ?? null }));

  // Headline metadata comes from the first row — all rows share these fields.
  const head = voteRows[0];
  const title = head.division_title || `Commons Division ${divisionNumber}`;
  const dateLabel = new Date(head.division_date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Bill backlink: if any vote row has bill_id, link to that bill.
  const billId = voteRows.find((v) => v.bill_id != null)?.bill_id ?? null;
  let billTitle: string | null = null;
  if (billId != null) {
    const { data: bill } = await supabase
      .from('bill')
      .select('title')
      .eq('id', billId)
      .maybeSingle();
    billTitle = bill?.title ?? null;
  }

  const ayes = votes.filter((v) => v.vote_type === 'aye');
  const noes = votes.filter((v) => v.vote_type === 'no');
  const boths = votes.filter((v) => v.vote_type === 'both');
  const tellers = votes.filter((v) => v.is_teller);

  // Party ordering: largest delegation in THIS division first.
  function groupByParty(rows: Vote[]): Array<{ party: string; partyColour: string; rows: Vote[] }> {
    const groups = new Map<string, Vote[]>();
    for (const v of rows) {
      const p = normaliseParty(v.mp?.party) || v.mp?.party || 'Unknown';
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p)!.push(v);
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([party, rs]) => ({
        party,
        partyColour: partyColourForMember(rs[0].mp?.party ?? null, rs[0].mp?.party_colour ?? null),
        rows: rs.sort((x, y) => (x.mp?.display_name || x.mp?.name || '').localeCompare(y.mp?.display_name || y.mp?.name || '')),
      }));
  }

  const ayeGroups = groupByParty(ayes);
  const noeGroups = groupByParty(noes);

  return (
    <DossierShell>
      <BackLink
        fallbackHref={billId != null ? `/bills/${billId}` : '/mps'}
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '32px', marginBottom: '32px' }}>
        <p
          style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            marginBottom: '12px',
            opacity: 0.85,
            transform: 'rotate(-0.2deg)',
          }}
        >
          UK Parliament · Commons Division {divisionNumber} · {dateLabel}
        </p>
        <h1
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: 'clamp(28px, 4vw, 46px)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            marginBottom: '12px',
            transform: 'rotate(-0.3deg)',
            textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        {billId != null && billTitle && (
          <p style={{ fontSize: '15px', opacity: 0.8, marginTop: '12px' }}>
            Vote on{' '}
            <Link href={`/bills/${billId}`} style={{ color: ACCENT, textDecoration: 'underline' }}>
              {billTitle}
            </Link>
          </p>
        )}
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        <Stat label="Ayes" value={ayes.length} accent={SUCCESS} />
        <Stat label="Noes" value={noes.length} accent={DANGER} />
        <Stat label="Margin" value={ayes.length - noes.length} accent={ACCENT} />
        <Stat label="MPs recorded" value={votes.length} accent={INK_SOFT} />
        {tellers.length > 0 && <Stat label="Tellers" value={tellers.length} accent={INK_SOFT} />}
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionH2}>How MPs voted</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginTop: '24px' }}>
          <VoteColumn heading={`Voted AYE (${ayes.length})`} groups={ayeGroups} accent={SUCCESS} />
          <VoteColumn heading={`Voted NO (${noes.length})`} groups={noeGroups} accent={DANGER} />
        </div>
      </section>

      {boths.length > 0 && (
        <section style={{ marginTop: '32px', padding: '24px', background: CREAM, border: `1px solid ${INK_HAIRLINE}` }}>
          <h2 style={{ ...sectionH2, marginBottom: '12px' }}>Voted in both lobbies</h2>
          <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '12px' }}>
            Walking through both the Aye and No lobbies is a recorded form of deliberate abstention.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px' }}>
            {boths.map((v) => (
              <li key={v.member_id} style={{ padding: '4px 0' }}>
                <Link href={`/mps/${v.member_id}`} style={{ color: INK, textDecoration: 'none' }}>
                  {v.mp?.display_name ?? v.mp?.name ?? `Member ${v.member_id}`}
                  {v.mp?.party && <span style={{ opacity: 0.6 }}> · {normaliseParty(v.mp.party) || v.mp.party}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </DossierShell>
  );
}

const sectionH2: React.CSSProperties = {
  fontFamily: '"Special Elite", monospace',
  fontSize: '24px',
  fontWeight: 'bold',
  letterSpacing: '-0.01em',
  borderBottom: `1px solid ${INK_HAIRLINE}`,
  paddingBottom: '8px',
};

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{ background: CREAM, padding: '16px', border: `1px solid ${INK_HAIRLINE}` }}>
      <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: accent, fontFamily: '"Special Elite", monospace' }}>{value}</div>
    </div>
  );
}

function VoteColumn({
  heading,
  groups,
  accent,
}: {
  heading: string;
  groups: Array<{ party: string; partyColour: string; rows: Vote[] }>;
  accent: string;
}) {
  return (
    <div>
      <h3 style={{ fontFamily: '"Special Elite", monospace', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.18em', borderBottom: `2px solid ${accent}`, paddingBottom: '6px', marginBottom: '12px', color: accent }}>
        {heading}
      </h3>
      {groups.map((g) => (
        <div key={g.party} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85 }}>
            <span style={{ display: 'inline-block', width: '0.7em', height: '0.7em', borderRadius: '50%', background: g.partyColour }} />
            <strong>{g.party}</strong>
            <span style={{ opacity: 0.6 }}>({g.rows.length})</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', lineHeight: 1.55 }}>
            {g.rows.map((v) => (
              <li key={v.member_id} style={{ padding: '4px 0', borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <Link href={`/mps/${v.member_id}`} style={{ color: INK, textDecoration: 'none' }}>
                  {v.mp?.display_name ?? v.mp?.name ?? `Member ${v.member_id}`}
                  {v.is_teller && (
                    <span style={{ marginLeft: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: INK_SOFT, border: `1px solid ${INK_HAIRLINE}`, padding: '1px 5px' }}>
                      Teller
                    </span>
                  )}
                  {v.is_rebellion && <span style={{ color: ACCENT, fontSize: '12px', fontWeight: 'bold' }}> · REBEL</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
