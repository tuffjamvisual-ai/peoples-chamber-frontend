import './bills.css';
import Link from 'next/link';
import { getAllBills } from '@/lib/data';

export const revalidate = 600;

const navItems = [
  ['Cover Story', '/news'],
  ['Street View', '/news'],
  ['Bills to Watch', '/bills', true],
  ['Follow the Money', '/transparency'],
  ["Who's Who", '/mps'],
  ["The People's Pulse", '/polls'],
  ['Search', '/search'],
  ['About', '/support'],
] as const;

export default async function PreviewEightBillsPage() {
  const allBills = await getAllBills();
  const active = allBills.filter((b: any) => !b.bill_withdrawn && !b.is_act);
  const bills = active.slice(0, 9);

  const totalActive = active.length;
  const totalActs = allBills.filter((b: any) => b.is_act).length;
  const totalWithdrawn = allBills.filter((b: any) => b.bill_withdrawn).length;
  const totalVotes = bills.reduce(
    (s: number, b: any) =>
      s + (b.vote_count_yes || 0) + (b.vote_count_no || 0) + (b.vote_count_abstain || 0),
    0,
  );

  return (
    <main className="mag-stage">
      <div className="mag-shell">
        <div className="top-strip">
          <span>Issue 13 · May 16–22, 2026</span>
          <span className="truth-stamp">
            No spin. No paywall. Just <strong>the truth.</strong>
          </span>
        </div>

        <header className="masthead">
          <div className="crown" aria-hidden>♛</div>
          <h1>The People&apos;s Chamber</h1>
          <div className="tagline">UK Government. In Public View.</div>
        </header>

        <nav className="nav-strip" aria-label="Primary">
          {navItems.map(([label, href, current]) => (
            <Link
              key={label}
              href={href as string}
              className={current ? 'current' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="bills-hero">
          <div>
            <span className="kicker">Bills to Watch · Issue 13</span>
            <h2>
              Every bill. <em>Every vote.</em> No filter.
            </h2>
            <p className="lede">
              Every bill currently moving through Parliament. Read the text,
              see how MPs voted, and add your tally to the public record. We
              keep the receipts so the official version has less room to
              wander.
            </p>
          </div>
          <div className="speech">
            “We&apos;ve already <br />read the small print. <br />
            <strong>Have a look.</strong>”
          </div>
        </section>

        <section className="bills-toolbar">
          <input placeholder="Search bills by title, number, or topic..." />
          <div className="filter">
            <strong>House</strong>
            <span>All</span>
          </div>
          <div className="filter">
            <strong>Stage</strong>
            <span>All stages</span>
          </div>
          <div className="filter">
            <strong>Sort</strong>
            <span>Trending</span>
          </div>
          <div className="filter-cta">Filter →</div>
        </section>

        <section className="bills-stats">
          <div>
            <strong>{totalActive.toLocaleString()}</strong>
            <span>Bills tracked</span>
          </div>
          <div>
            <strong>{totalActs.toLocaleString()}</strong>
            <span>Acts passed</span>
          </div>
          <div>
            <strong>{totalWithdrawn.toLocaleString()}</strong>
            <span>Withdrawn</span>
          </div>
          <div>
            <strong>{totalVotes.toLocaleString()}</strong>
            <span>Public votes (top 9)</span>
          </div>
        </section>

        <section className="bills-grid">
          {bills.map((bill: any) => {
            const yes = bill.vote_count_yes || 0;
            const no = bill.vote_count_no || 0;
            const abs = bill.vote_count_abstain || 0;
            const total = yes + no + abs;
            const yesPct = total > 0 ? Math.round((yes / total) * 100) : 0;
            const noPct = total > 0 ? Math.round((no / total) * 100) : 0;
            const absPct = total > 0 ? Math.max(0, 100 - yesPct - noPct) : 0;

            return (
              <Link key={bill.id} href={`/bills/${bill.id}`} className="bill-card">
                <span className="tab">Bill File</span>
                {bill.current_stage && <span className="stage">{bill.current_stage}</span>}
                <h3>{bill.title}</h3>

                <div className="tally">
                  <div className="tally-bar">
                    {yesPct > 0 && <span className="yes" style={{ width: `${yesPct}%` }} />}
                    {noPct > 0 && <span className="no" style={{ width: `${noPct}%` }} />}
                    {absPct > 0 && <span className="abs" style={{ width: `${absPct}%` }} />}
                  </div>
                  <div className="tally-numbers">
                    <span>✓ {yesPct}%</span>
                    <span>{total.toLocaleString()} votes</span>
                    <span>✗ {noPct}%</span>
                  </div>
                </div>

                <span className="read">Read the bill →</span>
              </Link>
            );
          })}
        </section>

        <section className="callout">
          <div>
            <h3>Public says otherwise.</h3>
            <p>
              Most polling says one thing. Westminster often does another. We
              keep the receipts and you keep your say. Add your tally to any
              bill, any time.
            </p>
          </div>
          <Link href="/polls" className="stamp">Vote your view →</Link>
        </section>

        <footer className="mag-footer">
          <div>
            <p className="brand">The People&apos;s Chamber</p>
            <p style={{ margin: 0, fontFamily: "'PT Serif', serif", textTransform: 'none', letterSpacing: 0, fontSize: 14 }}>
              UK political transparency. Built from official sources:
              Parliament, IPSA, Companies House, Electoral Commission, Cabinet
              Office. Updated daily.
            </p>
          </div>
          <div className="links">
            <Link href="/bills">Bills</Link>
            <Link href="/mps">MPs</Link>
            <Link href="/departments">Departments</Link>
            <Link href="/transparency">Transparency</Link>
            <Link href="/expenses">Expenses</Link>
            <Link href="/earnings">Earnings</Link>
            <Link href="/polls">Polls</Link>
            <Link href="/about">About</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/support">Contact</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
