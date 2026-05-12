import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBills } from '@/lib/data';
import './bills-template.css';
import '../preview-8/bills/bills.css';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Bills',
  description:
    'Every bill going through UK Parliament. How MPs voted. How you voted. The gap between the two.',
  alternates: { canonical: '/bills' },
};

export default async function BillsPage() {
  const allBills = await getAllBills();
  const active = allBills.filter((b) => !b.bill_withdrawn && !b.is_act);
  const top = active.slice(0, 5);
  const featured = active[0];
  const totalActive = active.length;
  const totalVotes = active
    .slice(0, 20)
    .reduce(
      (s, b) =>
        s + (b.vote_count_yes || 0) + (b.vote_count_no || 0) + (b.vote_count_abstain || 0),
      0,
    );

  const sponsors = active
    .filter((b) => b.sponsor_name)
    .slice(0, 4)
    .map((b) => b.sponsor_name!);

  return (
    <main className="bills-template-stage">
      <div className="bills-template-shell">
        {/* ────── Template HEADER (untouched) ────── */}
        <div className="bt-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bills-template-header.png" alt="The People's Chamber — masthead" />

          <Link href="/about" className="hot h-issue" aria-label="Issue 24" />
          <Link href="/about" className="hot h-truth" aria-label="No spin, no paywall, just the truth" />
          <Link href="/" className="hot h-masthead" aria-label="The People's Chamber — home" />
          <Link href="/about" className="hot h-bubble" aria-label="Democracy works better when people watch" />

          <Link href="/"             className="hot h-n-home"   aria-label="Home" />
          <Link href="/bills"        className="hot h-n-bills"  aria-label="Bills" />
          <Link href="/laws"         className="hot h-n-laws"   aria-label="Laws" />
          <Link href="/polls"        className="hot h-n-polls"  aria-label="People's Polls" />
          <Link href="/mps"          className="hot h-n-mps"    aria-label="MPs" />
          <Link href="/departments"  className="hot h-n-depts"  aria-label="Departments" />
          <Link href="/transparency" className="hot h-n-trans"  aria-label="Transparency" />
          <Link href="/search"       className="hot h-n-search" aria-label="Search" />
          <Link href="/support"      className="hot h-n-about"  aria-label="About" />
        </div>

        {/* ────── Body: landing magazine content as HTML ────── */}
        <div className="bills-body">
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

            <div className="hero-illo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bills-hero.png" alt="Courts and Tribunals Bill — public vote tally" />
              <div className="hero-bubble right-acc">
                Accountability isn&apos;t a favour <strong>— it&apos;s a right.</strong>
              </div>
            </div>
          </section>

          <section className="tile-grid">
            <article className="tile cover">
              <span className="tile-kicker">Cover Story</span>
              <div className="feature-illo">
                {featured ? featured.title : 'Featured Bill'}
              </div>
              <h3>The Bill of <em className="red">Their Lives</em></h3>
              <p>
                {featured?.current_stage ? `Currently at ${featured.current_stage}. ` : ''}
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

            <article className="tile street">
              <span className="tile-kicker">Street View</span>
              <p className="quote">They&apos;ve got majorities, we&apos;ve got memories.</p>
              <p className="attrib">Real voices · Real opinions · No filter</p>
              <Link href="/polls" className="tile-cta">Add your view →</Link>
            </article>

            <article className="tile bills-watch">
              <h3>Bills to Watch</h3>
              <ul>
                {top.map((bill) => (
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

            <article className="tile who">
              <span className="tile-kicker">MPs</span>
              <h3>Behind the bills</h3>
              <div className="sponsors" aria-hidden>
                {sponsors.length > 0 ? (
                  sponsors.map((name, i) => (
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

            <article className="tile">
              <span className="tile-kicker">Take Part</span>
              <h3><em>Vote</em> on the bill</h3>
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
                of people think the government doesn&apos;t listen to them anymore.
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
        </div>

        {/* ────── Template FOOTER (untouched) ────── */}
        <div className="bt-footer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bills-template-footer.png" alt="The People's Chamber — footer" />

          <Link href="/"              className="hot f-brand"     aria-label="The People's Chamber" />
          <Link href="/bills"         className="hot f-bills"     aria-label="Bills" />
          <Link href="/mps"           className="hot f-mps"       aria-label="MPs" />
          <Link href="/departments"   className="hot f-depts"     aria-label="Departments" />
          <Link href="/transparency"  className="hot f-trans"     aria-label="Transparency" />
          <Link href="/expenses"      className="hot f-expenses"  aria-label="Expenses" />
          <Link href="/earnings"      className="hot f-earnings"  aria-label="Earnings" />
          <Link href="/transparency"  className="hot f-donations" aria-label="Donations" />
          <Link href="/transparency"  className="hot f-contracts" aria-label="Contracts" />
          <Link href="/about"         className="hot f-about"     aria-label="About & Methodology" />
          <Link href="/about"         className="hot f-sources"   aria-label="Sources" />
          <Link href="/privacy"       className="hot f-privacy"   aria-label="Privacy" />
          <Link href="/about"         className="hot f-terms"     aria-label="Terms" />
          <Link href="/support"       className="hot f-contact"   aria-label="Contact" />
          <Link href="/support"       className="hot f-github"    aria-label="GitHub" />
        </div>
      </div>
    </main>
  );
}
