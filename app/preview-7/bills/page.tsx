import '../../preview-6/preview-6.css';
import './bills.css';
import Link from 'next/link';
import { getAllBills } from '@/lib/data';

export const revalidate = 600;

const navItems = [
  ['Home', '/'],
  ['Bills', '/bills'],
  ['Laws', '/laws'],
  ["People's Polls", '/polls'],
  ['MPs', '/mps'],
  ['Departments', '/departments'],
  ['Transparency', '/transparency'],
  ['Search', '/search'],
  ['About', '/support'],
];

export default async function PreviewBillsPage() {
  const allBills = await getAllBills();
  const active = allBills.filter((b: any) => !b.bill_withdrawn && !b.is_act);
  const bills = active.slice(0, 9);

  const totalBills = active.length;
  const totalVotes = bills.reduce(
    (sum: number, b: any) =>
      sum + (b.vote_count_yes || 0) + (b.vote_count_no || 0) + (b.vote_count_abstain || 0),
    0,
  );

  return (
    <main className="outer-stage">
      <div className="page-shell">
        <header className="masthead">
          <div className="paperclip" aria-hidden="true" />

          <div className="stamp-row">
            <span className="stamp stamp-green">Public Version</span>
            <span className="stamp stamp-plain">Cleared for Citizens</span>
            <span className="stamp stamp-red">Bills File · {totalBills.toLocaleString()} Open</span>
          </div>

          <div className="masthead-inner">
            <div className="crest-box" aria-hidden="true">
              ♜
            </div>

            <div>
              <h1>The People&apos;s Chamber</h1>
              <p>UK Government. In Public View.</p>
            </div>
          </div>
        </header>

        <nav className="nav-strip" aria-label="Primary navigation">
          {navItems.map(([label, href]) => (
            <Link key={label} href={href}>
              {label}
            </Link>
          ))}
          <Link href="/search" aria-label="Search">⌕</Link>
        </nav>

        <header className="bills-header">
          <span className="small-label">Filed under · Active legislation</span>
          <h1>Bills before Parliament</h1>
          <p>
            Every bill currently going through the House of Commons and Lords.
            Read the text, see how MPs voted, and add your own tally to the
            public record. Updated daily.
          </p>
        </header>

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
          <div className="filter" style={{ background: 'var(--oxblood)', color: 'white' }}>
            Filter →
          </div>
        </section>

        <section className="bills-stats">
          <div>
            <strong>{totalBills.toLocaleString()}</strong>
            <span>Bills tracked</span>
          </div>
          <div>
            <strong>{allBills.filter((b: any) => b.is_act).length.toLocaleString()}</strong>
            <span>Acts passed</span>
          </div>
          <div>
            <strong>{allBills.filter((b: any) => b.bill_withdrawn).length.toLocaleString()}</strong>
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
                <span className="pin" />
                <span className="kicker">Bill File · Public Tally</span>
                <h3>{bill.title}</h3>
                {bill.current_stage && <span className="stage">{bill.current_stage}</span>}

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

        <section className="stamp-strip">
          <div>
            <strong>100% Independent</strong>
            <span>Not funded by government or political parties.</span>
          </div>
          <div>
            <strong>Real-time Data</strong>
            <span>Live updates from Parliament.</span>
          </div>
          <div>
            <strong>Open to All</strong>
            <span>Built for citizens, not politicians.</span>
          </div>
          <div>
            <strong>Accountability First</strong>
            <span>Because transparency drives better government.</span>
          </div>
        </section>

        <footer className="footer">
          <div>
            <h2>The People&apos;s Chamber</h2>
            <p>
              UK political transparency. Built from official sources:
              Parliament, IPSA, Companies House, Electoral Commission, Cabinet
              Office. Updated daily.
            </p>
          </div>

          <div className="footer-links">
            <Link href="/bills">Bills</Link>
            <Link href="/mps">MPs</Link>
            <Link href="/departments">Departments</Link>
            <Link href="/transparency">Transparency</Link>
            <Link href="/expenses">Expenses</Link>
            <Link href="/earnings">Earnings</Link>
            <Link href="/about">About</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/support">Contact</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
