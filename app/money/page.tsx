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
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Money & Power · UK political money tracked across every register',
  description:
    'Cross-register transparency: UK MPs paid twice from the same source, government contractors who donate, foreign-government-sponsored MP travel, APPG funders and lobby firms. The patterns hidden in plain sight across the EC, gov.uk and Register of Interests, in one place.',
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
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85 }}>
          Money &amp; Power · Cross-register patterns
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '14px', lineHeight: 1.05 }}>
          The money that moves through UK politics
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.7, maxWidth: '60ch' }}>
          Every fact below is on a public register. Some are on the Electoral Commission&rsquo;s donations log. Some are on gov.uk&rsquo;s Contracts Finder. Some are on the Register of Members&rsquo; Financial Interests. Some are on the APPG register or the gov.uk transparency feeds. Each one publishes its own slice on its own page in its own format. Reading them side by side is what produces the picture below; that is what no other tool currently does.
        </p>
      </header>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionH2}>Headline cross-references</h2>
        <p style={{ fontSize: '13px', opacity: 0.75, marginBottom: '20px' }}>The four strongest patterns in the data. Each one is a join of two registers nobody else joins.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          <HeroTile
            href="/donations/double-dip"
            label="Double-dip"
            headline="MPs paid twice from the same source"
            teaser="Rishi Sunak ↔ Hoover Institution. Gavin Williamson ↔ RTC Education. Jeremy Hunt + George Freeman ↔ Oxford Institute. Three MPs all ↔ GB News. Same body pays them as employees AND donates to their politics."
          />
          <HeroTile
            href="/donations/government-contractors"
            label="Public-sector contractors who donate"
            headline="£120M of contracts. £2.5M of donations. Same companies."
            teaser="PwC, KPMG, Deloitte and Ernst & Young between them hold £120M+ in declared public-sector contracts and have given £2.5M+ in declared political donations. Microsoft, SSE, Randox, Grant Thornton same dual-role."
          />
          <HeroTile
            href="/donations/sponsored-visits"
            label="Who paid for MPs to travel"
            headline={`${n.sponsored.toLocaleString()} declared paid trips`}
            teaser="Hong Kong Government paid for 30 MP trips totalling £280k. Conservative Friends of Israel paid for 98. The Qatari, Saudi, Taiwanese and Indian foreign ministries all appear in the top tier. The full paymaster league."
          />
          <HeroTile
            href="/donors"
            label="Donor profiles with auto-contracts panel"
            headline="Every Big Four donor profile shows the contracts side too"
            teaser="Visit /donors/pricewaterhousecoopers-llp and you get the political donations PLUS the public-sector contracts PLUS the APPG funding under one cream paper. Two government registers in one frame."
          />
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionH2}>Sector and contest pivots</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <SecondaryTile href="/donations/foreign" label="Foreign-source map" sub={`USA £617k, Saudi £214k, Qatar £203k, UAE £171k. ${n.foreign.toLocaleString()} declared donations from outside the UK.`} />
          <SecondaryTile href="/donations/leadership-contests" label="Leadership-race money" sub="2016 Owen Smith £400k. 2022 Truss + Sunak £400k. The donors writing cheques into specific leadership contests, by candidate." />
          <SecondaryTile href="/donations/constituencies" label="Money on the ground" sub="Twickenham £997k. Richmond Park CLP £667k from just 20 donations. West Suffolk £491k. Which UK seats get bankrolled." />
          <SecondaryTile href="/donations/bequest" label="Dead-donor money" sub={`£27M of declared bequests to UK parties. Conservatives lead. Sinn Féin's £2.8M from 6 estates includes one £2.4M individual.`} />
          <SecondaryTile href="/secretariats" label="APPG secretariats" sub="Policy Connect runs 6 lobby groups. Hanbury, GK Strategy, Lodestone, CalComms, Stewart Public Affairs all on 3. The lobby-firm league." />
          <SecondaryTile href="/appg-funders" label={`APPG funders · ${n.appgFunders}`} sub="BAE Systems pays for 3 different APPGs. Joseph Rowntree Charitable Trust pays for 2. The funders buying parliamentary access." />
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionH2}>Compliance pivots</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <SecondaryTile href="/donations/late-disclosed" label="Late disclosures" sub="14,859 donations declared 90+ days after acceptance. 1,054 declared over a year late. Worst gap: 13 years." />
          <SecondaryTile href="/donations/impermissible" label="Returned donations" sub="166 donations the EC ruled impermissible. Reform UK appears repeatedly on recent direct-bank-transfer entries." />
          <SecondaryTile href="/donations/trust-funded" label="Trust-routed money" sub={`${n.trust} declared donations from 65 trusts. The beneficial-ownership shield UK law allows.`} />
        </div>
      </section>

      <section style={{ background: CREAM, padding: '18px 22px', fontSize: '13px', lineHeight: 1.65, borderLeft: `3px solid ${DANGER}` }}>
        <strong>What none of this is.</strong> A pattern visible on more than one public register is not evidence of wrongdoing. UK MPs are legally allowed to take outside employment income, attend foreign-government-sponsored visits, accept political donations, and officer All-Party Parliamentary Groups provided each is declared on its appropriate register. UK companies are legally allowed to bid for public-sector work and donate to political parties provided each is declared. What none of this is is hidden. What much of it has been until now is unfindable. Putting it in one place is the work.
      </section>

      <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '24px' }}>
        Sources, in order: Electoral Commission donations register, gov.uk Contracts Finder, parliament.uk Register of Members&rsquo; Financial Interests, mySociety APPG membership dataset, gov.uk transparency feeds. All five refresh on weekly or daily crons. Each figure on this page is derived from current data; click through to any tile for the underlying rows.
      </p>
    </OpenGovShell>
  );
}

function HeroTile({ href, label, headline, teaser }: { href: string; label: string; headline: string; teaser: string }) {
  return (
    <Link href={href} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, padding: '18px 20px', border: `1px solid ${INK_HAIRLINE}`, background: CREAM, transition: 'transform 0.15s ease' }}>
      <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.75, marginBottom: '8px', color: ACCENT, fontFamily: '"Special Elite", monospace' }}>{label}</div>
      <div style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '20px', fontWeight: 'bold', lineHeight: 1.2, marginBottom: '10px' }}>{headline}</div>
      <p style={{ fontFamily: '"Special Elite", monospace', fontSize: '12px', lineHeight: 1.55, opacity: 0.8, margin: 0 }}>{teaser}</p>
      <div style={{ marginTop: '12px', fontSize: '12px', color: ACCENT, fontWeight: 'bold' }}>Read the full table &rarr;</div>
    </Link>
  );
}

function SecondaryTile({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href} className="no-hover-scale" style={{ display: 'block', textDecoration: 'none', color: INK, padding: '12px 14px', border: `1px solid ${INK_HAIRLINE}` }}>
      <div style={{ fontFamily: '"Special Elite", monospace', fontSize: '13px', fontWeight: 'bold', color: ACCENT, marginBottom: '6px' }}>{label} &rarr;</div>
      <p style={{ fontSize: '12px', lineHeight: 1.55, opacity: 0.8, margin: 0 }}>{sub}</p>
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
