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
  const top = active.slice(0, 5);
  const featured = active[0];
  const totalActive = active.length;
  const totalActs = allBills.filter((b: any) => b.is_act).length;
  const totalVotes = active
    .slice(0, 20)
    .reduce(
      (s: number, b: any) =>
        s + (b.vote_count_yes || 0) + (b.vote_count_no || 0) + (b.vote_count_abstain || 0),
      0,
    );

  const sponsors = active
    .filter((b: any) => b.sponsor_name)
    .slice(0, 4)
    .map((b: any) => b.sponsor_name);

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
          <div className="mast-bubble">
            Democracy works better<br />when people <strong>watch.</strong>
          </div>
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

        <section className="hero">
          <div>
            <h2>
              Every bill.
              <br />
              <em>Every vote.</em>
              <span className="red">No filter.</span>
            </h2>
            <p className="lede">
              We shine a light on Westminster, so you can see what they&apos;re
              really up to. Because sunlight is the best disinfectant.
            </p>
            <div className="cta-row">
              <Link href="/bills" className="btn red">Explore Bills</Link>
              <Link href="/transparency" className="btn blue">Follow the Money</Link>
            </div>
          </div>

          <div className="hero-aside" aria-hidden>
            <span>Bills</span>
            <span className="label">Now in Parliament</span>
            <div className="hero-bubble money">
              Where&apos;s our<br /><strong>money?</strong>
            </div>
            <div className="hero-bubble right-acc">
              Accountability isn&apos;t a favour <strong>— it&apos;s a right.</strong>
            </div>
          </div>
        </section>

        <section className="tile-grid">
          {/* Cover Story — featured bill */}
          <article className="tile cover">
            <span className="tile-kicker">Cover Story</span>
            <div className="feature-illo">
              {featured ? featured.title : 'Featured Bill'}
            </div>
            <h3>
              The Bill of <em className="red">Their Lives</em>
            </h3>
            <p>
              {featured?.current_stage
                ? `Currently at ${featured.current_stage}. `
                : ''}
              Inside the headline bill of the week. Big words, bigger
              consequences.
            </p>
            <Link
              href={featured ? `/bills/${featured.id}` : '/bills'}
              className="tile-cta"
            >
              Read the story →
            </Link>
          </article>

          {/* Street View — adapted quote */}
          <article className="tile street">
            <span className="tile-kicker">Street View</span>
            <p className="quote">They&apos;ve got majorities, we&apos;ve got memories.</p>
            <p className="attrib">Real voices · Real opinions · No filter</p>
            <Link href="/polls" className="tile-cta">Add your view →</Link>
          </article>

          {/* Bills to Watch — yellow paper tile */}
          <article className="tile bills-watch">
            <h3>Bills to Watch</h3>
            <ul>
              {top.map((bill: any) => (
                <li key={bill.id}>
                  <span className="check" aria-hidden>✓</span>
                  <div>
                    <Link href={`/bills/${bill.id}`} className="title">
                      {bill.title}
                    </Link>
                    <span className="sub">
                      {bill.current_stage || bill.category || 'Before Parliament'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/bills" className="tile-cta">See all bills →</Link>
          </article>

          {/* Follow the Money — pie chart */}
          <article className="tile money">
            <div>
              <span className="tile-kicker">Bills Tracker</span>
              <h3>{totalActive.toLocaleString()} live bills</h3>
              <p>
                Active legislation moving through both Houses. Updated daily
                from official Parliament feeds.
              </p>
              <Link href="/bills" className="tile-cta">View all →</Link>
            </div>
            <div className="pie" aria-hidden>
              <span>{totalActive >= 1000 ? `${Math.round(totalActive / 1000)}k` : totalActive}</span>
            </div>
          </article>

          {/* Who's Who — sponsors */}
          <article className="tile who">
            <span className="tile-kicker">Who&apos;s Who</span>
            <h3>Behind the bills</h3>
            <div className="sponsors" aria-hidden>
              {sponsors.length > 0 ? (
                sponsors.map((name: string, i: number) => (
                  <div key={i}>
                    <span>{name.split(' ').slice(-1)[0]}</span>
                  </div>
                ))
              ) : (
                <>
                  <div><span>MP</span></div>
                  <div><span>MP</span></div>
                  <div><span>MP</span></div>
                  <div><span>MP</span></div>
                </>
              )}
            </div>
            <Link href="/mps" className="tile-cta">All MPs →</Link>
          </article>

          {/* Take Part / Vote */}
          <article className="tile">
            <span className="tile-kicker">Take Part</span>
            <h3>
              <em>Vote</em> on the bill
            </h3>
            <p>
              {totalVotes.toLocaleString()} public votes recorded on the top
              twenty bills. Add yours — Parliament&apos;s tally may differ.
            </p>
            <Link
              href={featured ? `/bills/${featured.id}` : '/bills'}
              className="tile-cta"
            >
              Cast your vote →
            </Link>
          </article>
        </section>

        <section className="stat-band">
          <div className="big">
            72%
            <small>
              of people think the government doesn&apos;t listen to them
              anymore.
            </small>
          </div>
          <div className="pull">
            <h3>You said it. <br />We&apos;re publishing it.</h3>
            <p>
              Every public vote logged. Every result on file. Westminster has
              its tally — now you&apos;ve got yours.
            </p>
          </div>
          <div className="take-part">
            <strong>Take part in our weekly poll</strong>
            <Link href="/polls">See full results →</Link>
          </div>
        </section>

        <footer className="mag-footer">
          <div>
            <p className="brand">The People&apos;s Chamber</p>
            <p className="tag">© 2026 · All rights reserved</p>
          </div>
          <div className="center">
            Watch. Question. Share. Repeat.
            <em>That&apos;s democracy.</em>
          </div>
          <form className="email" action="/support">
            <input placeholder="you@email.com" aria-label="Email" />
            <button type="submit">Get our weekly brief</button>
          </form>
        </footer>
      </div>
    </main>
  );
}
