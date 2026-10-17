// /money — landing page for the cross-register money & power surfaces.
// Sits at the top of the navigation hierarchy alongside /mps, /bills,
// /departments. Aggregates the strongest hidden-in-plain-sight finds:
// double-dip, government contractors who donate, sponsored visits,
// foreign-source donations, donor profiles, APPG secretariats.
//
// Each surface gets a tile with a one-line teaser and a real number
// pulled from the data so the reader sees the size of the finding
// before they click through.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Money & Power · UK political money tracked across every register',
  description:
    'Transparency across registers: UK MPs paid twice from the same source, government contractors who donate, MP travel paid for by foreign governments, APPG funders and lobby firms. The patterns hidden in plain sight across the EC, gov.uk and Register of Interests, in one place.',
  alternates: { canonical: '/money' },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';
const DANGER = '#a64030';

// Pull headline numbers from the data so each tile carries a real
// figure. Done as a single Promise.all batch.
async function fetchHeadlineNumbers() {
  // Foreign-source: count of donations with non-UK addr_country
  const UK_EQUIV = ['United Kingdom', 'UK', 'GB', 'Great Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland'];
  const [
    foreignCountRes,
    sponsoredCountRes,
    trustCountRes,
    bequestCountRes,
    appgFundersRes,
    secretariatsRes,
  ] = await Promise.all([
    supabase.from('political_donations').select('id', { count: 'exact', head: true }).not('addr_country', 'is', null).not('addr_country', 'in', `(${UK_EQUIV.map((c) => `"${c}"`).join(',')})`),
    supabase.from('political_donations').select('id', { count: 'exact', head: true }).not('purpose_of_visit', 'is', null).neq('purpose_of_visit', ''),
    supabase.from('political_donations').select('id', { count: 'exact', head: true }).not('trust_name', 'is', null),
    supabase.from('political_donations').select('id', { count: 'exact', head: true }).eq('is_bequest', true),
    supabase.from('appg_funders').select('source', { count: 'exact', head: true }).not('source', 'is', null),
    supabase.from('appgs').select('slug', { count: 'exact', head: true }).not('secretariat', 'is', null),
  ]);

  return {
    foreign: foreignCountRes.count ?? 0,
    sponsored: sponsoredCountRes.count ?? 0,
    trust: trustCountRes.count ?? 0,
    bequest: bequestCountRes.count ?? 0,
    appgFunders: appgFundersRes.count ?? 0,
    secretariats: secretariatsRes.count ?? 0,
  };
}

export default async function MoneyLanding() {
  const n = await fetchHeadlineNumbers();

  return (
    <OpenGovShell pageStamp="Money">
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '20px', marginBottom: '32px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Money &amp; Power · Patterns across registers
        </p>
        <h1 style={{ fontFamily: 'Special Elite, monospace', fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '14px', lineHeight: 1.05 }}>
          The money that moves through UK politics
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.7, maxWidth: '60ch' }}>
          Every fact below is on a public register: the Electoral Commission&rsquo;s donations register, Find a Tender and Contracts Finder, the Register of Members&rsquo; Financial Interests, the APPG register and the GOV.UK transparency releases. Each publishes its own part in its own format. This page reads them side by side, so a donor, an MP and a contract can be seen together.
        </p>
      </header>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionH2}>Headline links between registers</h2>
        <p style={{ fontSize: '15px', opacity: 0.75, marginBottom: '20px' }}>Four places where two registers name the same people or organisations.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          <HeroTile
            href="/donations/double-dip"
            label="Employer and donor"
            headline="MPs paid by a body that also donated to them"
            teaser="Organisations listed in an MP's register both as a paying employer or client and as a donor to that MP. Each pairing comes from the MP's own declarations."
          />
          <HeroTile
            href="/donations/government-contractors"
            label="Public contractors who donate"
            headline="Companies with public contracts that also donate"
            teaser="Companies that appear both in the government contracts records and in the Electoral Commission's donations register, with the totals from each."
          />
          <HeroTile
            href="/donations/sponsored-visits"
            label="Who paid for MPs to travel"
            headline={`${n.sponsored.toLocaleString()} declared paid trips`}
            teaser="Every overseas visit MPs declared as paid for by someone else, ranked by who paid, with the number of trips and their declared value."
          />
          <HeroTile
            href="/donors"
            label="Donor profiles"
            headline="Each donor's donations, contracts and APPG funding together"
            teaser="A donor's profile shows its political donations and, where the same organisation holds public contracts or funds APPGs, those records too."
          />
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionH2}>Sector and contest pivots</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <SecondaryTile href="/donations/foreign" label="Money from abroad" sub={`${n.foreign.toLocaleString()} declared donations from outside the UK, by country.`} />
          <SecondaryTile href="/donations/leadership-contests" label="Money in leadership races" sub="Donations declared for party leadership contests, by contest and candidate." />
          <SecondaryTile href="/donations/constituencies" label="Money by constituency" sub="Donations to local parties and candidates, totalled by constituency." />
          <SecondaryTile href="/donations/bequest" label="Bequests" sub="Money left to parties in wills, as declared to the Electoral Commission, by party and estate." />
          <SecondaryTile href="/secretariats" label="APPG secretariats" sub="The organisations that run APPG secretariats, and how many groups each runs." />
          <SecondaryTile href="/appg-funders" label={`APPG funders · ${n.appgFunders}`} sub="Who funds APPGs, and how many groups each funds." />
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionH2}>Reporting and compliance</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <SecondaryTile href="/donations/late-disclosed" label="Late disclosures" sub="Donations reported to the Electoral Commission long after they were accepted, with the gap in days." />
          <SecondaryTile href="/donations/impermissible" label="Returned donations" sub="Donations the Electoral Commission records as impermissible, and what happened to them." />
          <SecondaryTile href="/donations/trust-funded" label="Money routed via trusts" sub={`${n.trust} declared donations from trusts, by trust and recipient.`} />
        </div>
      </section>

      <section style={{ background: CREAM, padding: '18px 22px', fontSize: '15px', lineHeight: 1.65, borderLeft: `3px solid ${DANGER}` }}>
        <strong>What none of this is.</strong> A pattern visible on more than one public register is not evidence of wrongdoing. UK MPs are legally allowed to take outside employment income, attend visits paid for by foreign governments, accept political donations, and officer All-Party Parliamentary Groups provided each is declared on its appropriate register. UK companies are legally allowed to bid for public contracts and donate to political parties provided each is declared. What none of this is is hidden. What much of it has been until now is unfindable. Putting it in one place is the work.
      </section>

      <p style={{ fontSize: '15px', opacity: 0.6, marginTop: '24px' }}>
        Sources, in order: Electoral Commission donations register, gov.uk Contracts Finder, parliament.uk Register of Members&rsquo; Financial Interests, mySociety APPG membership dataset, gov.uk transparency feeds. All five refresh on weekly or daily crons. Each figure on this page is derived from current data; click through to any tile for the underlying rows.
      </p>
    </OpenGovShell>
  );
}

function HeroTile({ href, label, headline, teaser }: { href: string; label: string; headline: string; teaser: string }) {
  return (
    <Link href={href} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, padding: '18px 20px', border: `1px solid ${INK_HAIRLINE}`, background: CREAM, transition: 'transform 0.15s ease' }}>
      <div style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.75, marginBottom: '8px', color: ACCENT, fontFamily: '"Special Elite", monospace' }}>{label}</div>
      <div style={{ fontFamily: 'Special Elite, monospace', fontSize: '20px', fontWeight: 'bold', lineHeight: 1.2, marginBottom: '10px' }}>{headline}</div>
      <p style={{ fontFamily: '"Special Elite", monospace', fontSize: '15px', lineHeight: 1.55, opacity: 0.8, margin: 0 }}>{teaser}</p>
      <div style={{ marginTop: '12px', fontSize: '15px', color: ACCENT, fontWeight: 'bold' }}>Read the full table &rarr;</div>
    </Link>
  );
}

function SecondaryTile({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, padding: '12px 14px', border: `1px solid ${INK_HAIRLINE}` }}>
      <div style={{ fontFamily: '"Special Elite", monospace', fontSize: '15px', fontWeight: 'bold', color: ACCENT, marginBottom: '6px' }}>{label} &rarr;</div>
      <p style={{ fontSize: '15px', lineHeight: 1.55, opacity: 0.8, margin: 0 }}>{sub}</p>
    </Link>
  );
}

const sectionH2: React.CSSProperties = {
  fontFamily: '"Special Elite", monospace',
  fontSize: '20px',
  fontWeight: 'bold',
  borderBottom: `1px solid ${INK_HAIRLINE}`,
  paddingBottom: '6px',
  marginBottom: '16px',
};
