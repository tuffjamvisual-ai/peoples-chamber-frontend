// State of the nation (T1-SOTN, owner approved 15 Nov 2026, COWORK-TO-T1 ENTRY 105): the latest official figures, each
// with the period it covers, the change on the previous figure, its source and the date it was published. ONS figures
// are read automatically (lib/state-of-the-nation.ts); the rest come from data/state-of-the-nation.json once Cowork
// has checked them. No opinion and no good-or-bad colouring.
import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import { SubFold } from '../components/PhoneFolds';
import { GROUPS, NEW_DAYS, stateOfTheNation, type Figure } from '@/lib/state-of-the-nation';
import { londonDay } from '@/lib/london-date';
import NewMark from './NewMark';

export const revalidate = false; // A16: rebuilt only when its data changes; the "new" marks follow today's date in the browser (ENTRY 140)

export const metadata: Metadata = {
  title: 'State of the Nation: the UK’s Latest Official Figures',
  description: 'Inflation, growth, jobs, public borrowing and debt, NHS waits, courts, homelessness and migration: the latest official figures, each with its period, the change on the last figure and a link to the source.',
  alternates: { canonical: '/state-of-the-nation' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const groupId = (g: string) => g.toLowerCase().replace(/[^a-z]+/g, '-');

function Card({ f, renderedOn }: { f: Figure; renderedOn: string }) {
  return (
    <article className="sotn-card" style={{ border: `1px solid ${HAIRLINE}`, background: 'rgba(255,255,255,0.18)', padding: '14px 14px 12px', fontFamily: MONO, color: INK, display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <h3 style={{ fontSize: '15px', lineHeight: 1.35, fontWeight: 'bold', margin: 0 }}>{f.label}</h3>
        <NewMark publishedOn={f.publishedOn} days={NEW_DAYS} renderedOn={renderedOn} color={INK} />
      </div>
      {f.value ? (
        <>
          <div style={{ fontSize: 'clamp(26px, 3vw, 32px)', lineHeight: 1.1, fontWeight: 'bold' }}>{f.value}</div>
          {f.period && <div style={{ fontSize: '15px' }}>{f.period}</div>}
          {f.change && <div style={{ fontSize: '15px' }}>{f.change.charAt(0).toUpperCase() + f.change.slice(1)}</div>}
          {f.note && <div style={{ fontSize: '15px', color: 'rgba(20,16,13,0.8)' }}>{f.note}</div>}
          {/* 15px at least (ENTRY 141 N10; was 14px). */}
          <div style={{ fontSize: '15px', marginTop: 'auto', paddingTop: '4px' }}>
            {f.sourceUrl && <a className="sotn-src" href={f.sourceUrl} rel="noopener" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Source{f.sourceName ? `: ${f.sourceName}` : ''}</a>}
            {f.publishedOn && <div style={{ marginTop: '2px' }}>Published {fmtDate(f.publishedOn)}</div>}
          </div>
        </>
      ) : (
        <div style={{ fontSize: '15px', color: 'rgba(20,16,13,0.75)' }}>Not yet published here</div>
      )}
    </article>
  );
}

export default async function StateOfTheNation() {
  const { figures } = await stateOfTheNation();
  const renderedOn = londonDay();
  return (
    <OpenGovShell pageStamp="Figures">
      <style>{`.sotn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
        @media (max-width: 1023.98px) { .sotn-gh { display: none; } }
        @media (max-width: 599.98px) { .sotn-grid { grid-template-columns: 1fr 1fr; gap: 8px; } .sotn-card { padding: 10px !important; } .sotn-src { display: inline-flex; align-items: center; min-height: 44px; line-height: 1.35; } }
        @media (max-width: 359.98px) { .sotn-grid { grid-template-columns: 1fr; } }`}</style>
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />
      <header style={{ borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: '16px', marginBottom: '20px' }}>
        <h1 style={{ fontFamily: MONO, fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 10px', lineHeight: 1.15 }}>State of the nation</h1>
        <p style={{ fontFamily: MONO, fontSize: '16px', lineHeight: 1.6, margin: 0, maxWidth: '60ch' }}>Official figures, with the period each covers and a link to the source.</p>
      </header>
      {GROUPS.map((g) => {
        const list = figures.filter((f) => f.group === g);
        if (!list.length) return null;
        return (
          // On phones and tablets (up to 1,023px) each group is a closed fold named by the group (the site's length rules:
          // nothing cut, the page under 2,500px on phones and 3,000px on tablets); from 1,024px up the groups are open.
          <SubFold key={g} label={g} tablets>
            <section aria-labelledby={groupId(g)} style={{ marginBottom: '28px' }}>
              <h2 id={groupId(g)} className="sotn-gh" style={{ fontFamily: MONO, fontSize: '20px', fontWeight: 'bold', color: ACCENT, margin: '0 0 10px' }}>{g}</h2>
              <div className="sotn-grid">{list.map((f) => <Card key={f.id} f={f} renderedOn={renderedOn} />)}</div>
            </section>
          </SubFold>
        );
      })}
    </OpenGovShell>
  );
}
