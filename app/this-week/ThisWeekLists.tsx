'use client';
// The two lists on /this-week (ENTRY 140): the server sends the bills with a Commons sitting in the next two weeks (and
// the fallback list for a recess) and the votes of the last three weeks; this shows the ones for today's date in London.
// The first render uses the day the page was rendered (useToday), so the HTML is complete without JavaScript.
import { useToday } from '../components/useToday';
import { billsWindow, divisionsFrom } from '@/lib/this-week-window';

export type WeekBill = { billId: number; title: string; stage: string; sittings: string[]; href: string | null };
export type WeekVote = { id: number; title: string; date: string; ayes: number | null; noes: number | null; href: string | null };

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';
const rowStyle = { display: 'block', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '12px 0' } as const;
const h2: React.CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', marginBottom: '14px' };
const fmtDay = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' });

export default function ThisWeekLists({ bills, fallback, votes, renderedOn }: { bills: WeekBill[]; fallback: WeekBill[]; votes: WeekVote[]; renderedOn: string }) {
  const today = useToday(renderedOn);
  const { start, end } = billsWindow(today);
  const thisWeek = bills.filter((b) => b.sittings.some((d) => d >= start && d <= end)).slice(0, 12);
  const shownBills = thisWeek.length ? thisWeek : fallback.slice(0, 8);
  const from = divisionsFrom(today);
  const shownVotes = votes.filter((v) => v.date.slice(0, 10) >= from && v.date.slice(0, 10) <= today).slice(0, 12);
  return (
    <>
      <section style={{ marginBottom: '8%' }}>
        <h2 style={h2}>Coming up in the Commons, next seven days</h2>
        {shownBills.length === 0 && <p style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>No Commons bills listed right now (the House may be in recess).</p>}
        {shownBills.map((b) => {
          // The next sitting of the current stage on or after today; if none is upcoming, the latest past one.
          const next = b.sittings.find((d) => d >= today);
          const last = b.sittings.filter((d) => d < today).slice(-1)[0];
          const sitting = next ? `next sitting ${fmtDay(next)}` : last ? `last sitting ${fmtDay(last)}` : null;
          const inner = (
            <>
              <div style={{ fontSize: 'clamp(16px, 1.9vw, 20px)', fontWeight: 'bold', lineHeight: 1.3 }}>{b.title}</div>
              <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '4px' }}>{b.stage}{sitting ? ` · ${sitting}` : ''}</div>
            </>
          );
          return b.href ? <a key={b.billId} href={b.href} className="no-hover-scale" style={rowStyle}>{inner}</a> : <div key={b.billId} style={rowStyle}>{inner}</div>;
        })}
      </section>
      <section>
        <h2 style={h2}>Recent Commons votes</h2>
        {shownVotes.length === 0 && <p style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>No divisions recorded in the last week.</p>}
        {shownVotes.map((d) => {
          const inner = (
            <>
              <div style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', fontWeight: 'bold', lineHeight: 1.3 }}>{d.title}</div>
              <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '4px' }}>
                {fmt(d.date)}{typeof d.ayes === 'number' ? ` · Ayes ${d.ayes} / Noes ${d.noes}` : ''}
              </div>
              {!d.href && <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '4px' }}>Full voting list not yet available</div>}
            </>
          );
          return d.href ? <a key={d.id} href={d.href} className="no-hover-scale" style={rowStyle}>{inner}</a> : <div key={d.id} style={rowStyle}>{inner}</div>;
        })}
      </section>
    </>
  );
}
