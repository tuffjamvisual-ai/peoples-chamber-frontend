import Link from 'next/link';
import type { BillOfTheWeek } from '@/lib/bill-of-the-week';

// The homepage's 'Have your say in Parliament' card (owner approved: Cowork ENTRY 550 text and links, ENTRY 553 design,
// Option B, ENTRY 554 shorter phone version; pictures Claude outputs/audit/have-your-say/approved-*.jpg). After the search
// area, before State of the nation, the band's width. A rounded card in its own colours and the system sans serif face.
// From 768px: kicker, heading, lead, then 'Your vote. Their vote.' and 'Bill of the week' side by side, the pill button and
// the small print. Under 768px only: heading, the 'BILL OF THE WEEK · <House> <stage>' line, the bill title, the Aye and
// No tiles on one row, the button and the shorter small print. Every link carries ?from=home (ENTRY 550's measuring).
// No vote is recorded here: Aye and No go to the bill page's #vote, where the page and its sign in do that.
// Text lines are divs, not paragraphs, so the site's phone body text rule (app/layout.tsx) leaves their sizes alone.
// Text sizes: 15px and up (the site's minimum), except the two the owner approved smaller on phones (ENTRY 554 and 579 (4):
// the 10.5px stage line and the 14px title), marked data-size-ok for the size check (scripts/checks/black-ink-scan.js).

const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const CSS = `
.hys { margin: 0 0 28px; padding: 18px 20px 14px; border-radius: 16px; background: #5b5550; border: 1px solid #77706a; color: #f2f2f2; font-family: ${SANS}; }
.hys a { color: inherit; }
.hys-kicker { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 15px; letter-spacing: 0.08em; text-transform: uppercase; color: #e4ded8; }
.hys-h { margin: 0 0 6px; font-family: ${SANS}; font-size: 22px; font-weight: 700; line-height: 1.25; color: #f2f2f2; }
.hys-lead { margin: 0 0 16px; max-width: 62ch; font-size: 15px; line-height: 1.5; color: #e4ded8; }
.hys-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 0 0 14px; }
.hys-ph { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 0 6px; font-family: ${SANS}; font-size: 17px; font-weight: 700; color: #f2f2f2; }
.hys-line { margin: 0 0 10px; font-size: 15px; line-height: 1.45; color: #e4ded8; }
.hys-bill { display: inline-block; margin: 0 0 4px; font-size: 17px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
.hys-stage { margin: 0 0 10px; font-size: 15px; color: #e4ded8; }
.hys-stage-m { display: none; }
.hys-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.hys-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 64px; padding: 8px; border-radius: 8px; background: #665f59; border: 1px solid #8a827b; color: #f2f2f2; text-decoration: none; text-align: center; font-size: 15px; }
.hys-tile b { font-size: 16px; letter-spacing: 0.06em; }
.hys-tile span { color: #e4ded8; }
.hys-why { margin: 8px 0 0; font-size: 15px; color: #e4ded8; }
.hys-btn { display: flex; align-items: center; justify-content: center; min-height: 44px; margin: 0 0 8px; padding: 8px 18px; border-radius: 999px; background: #f3e9d2; color: #14100d !important; text-decoration: none; font-size: 16px; font-weight: 600; }
.hys-small { margin: 0; text-align: center; font-size: 15px; line-height: 1.4; color: #e4ded8; }
.hys-small-m { display: none; }
.hys svg { flex: 0 0 auto; }
@media (max-width: 767.98px) {
  .hys { padding: 10px 12px 8px; margin: 0 0 18px; }
  .hys-kicker, .hys-lead, .hys-yours, .hys-ph-bill, .hys-stage, .hys-why, .hys-small-d { display: none; }
  .hys-h { font-size: 15.5px; margin: 0 0 4px; }
  .hys-cols { display: block; margin: 0 0 8px; }
  .hys-stage-m { display: block; margin: 0 0 2px; font-size: 10.5px; letter-spacing: 0.06em; color: #e4ded8; }
  .hys-bill { font-size: 14px; margin: 0 0 8px; }
  /* Both tiles the same (Cowork ENTRY 586): the word above its label, centred, the label on one line. */
  .hys-tile { flex-direction: column; gap: 2px; min-height: 56px; padding: 6px 6px; }
  .hys-tile b { font-size: 15px; }
  .hys-tile span { white-space: nowrap; }
  .hys-tile span { font-size: 15px; }
  .hys-btn { min-height: 44px; margin: 0 0 6px; font-size: 15px; }
  .hys-small-m { display: block; font-size: 15px; }
}
`;

// Small line icons, our own (no icon library): a building with columns, two people, a ballot box with a tick.
const icon = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const Columns = () => <svg {...icon}><path d="M2 6h12M8 2.5 2 6M8 2.5 14 6M3.5 6v6M6.5 6v6M9.5 6v6M12.5 6v6M2 13.5h12" /></svg>;
const People = () => <svg {...icon}><circle cx="5.5" cy="5.5" r="2" /><circle cx="11" cy="5.5" r="2" /><path d="M2 13c0-2 1.6-3.5 3.5-3.5S9 11 9 13M7.5 13c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5" /></svg>;
const Ballot = () => <svg {...icon}><path d="M2.5 8.5h11v5h-11zM5 8.5V3.5h6v5M6.5 6l1.2 1.2L10 4.8" /></svg>;

const HOUSE: Record<string, string> = { Commons: 'House of Commons', Lords: 'House of Lords' };

export default function HaveYourSay({ bill }: { bill: BillOfTheWeek | null }) {
  const billHref = bill ? `/bills/${bill.id}?from=home` : '/bills?from=home';
  const stageLong = bill ? [bill.house ? HOUSE[bill.house] ?? bill.house : null, bill.stage].filter(Boolean).join(' · ') : '';
  const stageShort = bill ? [bill.house, bill.stage ? bill.stage.toLowerCase() : null].filter(Boolean).join(' ') : '';
  return (
    <section className="hys" aria-labelledby="hys-h">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="hys-kicker"><Columns />Have your say in Parliament</div>
      <h2 id="hys-h" className="hys-h">Parliament votes on laws. How would you vote?</h2>
      <div className="hys-lead">Every bill going through Parliament, explained in plain English. Read the proposals, cast your own Aye or No vote, and see how other readers voted.</div>
      <div className="hys-cols">
        <div className="hys-yours">
          <h3 className="hys-ph">Your vote. Their vote. <Ballot /></h3>
          <div className="hys-line">Compare readers&rsquo; votes with recorded parliamentary votes where available.</div>
          <div className="hys-tiles">
            <Link href="/bills?from=home" className="hys-tile" prefetch={false}><People /><span>Readers&rsquo; votes</span></Link>
            <Link href="/bills?from=home" className="hys-tile" prefetch={false}><Columns /><span>MPs&rsquo; votes</span></Link>
          </div>
        </div>
        {bill && (
          <div className="hys-week">
            <h3 className="hys-ph hys-ph-bill">Bill of the week</h3>
            <div className="hys-stage-m" data-size-ok="ENTRY 554 owner approved design">BILL OF THE WEEK{stageShort ? ` · ${stageShort}` : ''}</div>
            <Link href={billHref} className="hys-bill" prefetch={false} data-size-ok="ENTRY 554 owner approved design">{bill.title}</Link>
            {stageLong && <div className="hys-stage">{stageLong}</div>}
            <div className="hys-tiles">
              <Link href={`/bills/${bill.id}?from=home#vote`} className="hys-tile" prefetch={false} data-a10-allow="ENTRY 589 owner: Have your say card links its bill 3 times (title, AYE, NO)"><b>AYE</b><span>Support the bill</span></Link>
              <Link href={`/bills/${bill.id}?from=home#vote`} className="hys-tile" prefetch={false} data-a10-allow="ENTRY 589 owner: Have your say card links its bill 3 times (title, AYE, NO)"><b>NO</b><span>Oppose the bill</span></Link>
            </div>
            <div className="hys-why">Chosen automatically: the bill with the next scheduled Commons debate stage.</div>
          </div>
        )}
      </div>
      {/* The homepage's main action on phones (Cowork ENTRY 582; A6 takes the first one shown: the search box from 768px). */}
      <Link href="/bills?from=home" className="hys-btn" prefetch={false} data-main-action="">Explore bills and cast your vote &rarr;</Link>
      <div className="hys-small hys-small-d">Free registration to vote. Independent reader polls, not official parliamentary votes or representative surveys.</div>
      <div className="hys-small hys-small-m">Reader polls, not official votes. Free registration to vote.</div>
    </section>
  );
}
