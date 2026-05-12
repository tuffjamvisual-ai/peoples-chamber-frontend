import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBills } from '@/lib/data';
import './bills-template.css';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Bills',
  description:
    'Every bill going through UK Parliament. How MPs voted. How you voted. The gap between the two.',
  alternates: { canonical: '/bills' },
};

export default async function BillsPage() {
  const bills = await getAllBills();
  const active = bills.filter((b) => !b.bill_withdrawn && !b.is_act);
  const acts = bills.filter((b) => b.is_act);
  const totalVotes = bills.reduce(
    (s, b) => s + (b.vote_count_yes || 0) + (b.vote_count_no || 0) + (b.vote_count_abstain || 0),
    0,
  );

  return (
    <main className="bills-template-stage">
      <div className="bills-template-shell">
        {/* ────── Template HEADER ────── */}
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

        {/* ────── Body content ────── */}
        <div className="bt-body">
          <header className="bt-page-head">
            <div>
              <span className="kicker">Bills · Issue 24</span>
              <h1>
                Every bill. <em>Every vote.</em>
              </h1>
            </div>
            <div className="meta">
              <strong>{bills.length.toLocaleString()}</strong>
              {active.length.toLocaleString()} live · {acts.length.toLocaleString()} acts ·{' '}
              {totalVotes.toLocaleString()} public votes
            </div>
          </header>

          <section className="bt-bills-grid">
            {bills.map((bill) => {
              const yes = bill.vote_count_yes || 0;
              const no = bill.vote_count_no || 0;
              const abs = bill.vote_count_abstain || 0;
              const total = yes + no + abs;
              const yesPct = total > 0 ? Math.round((yes / total) * 100) : 0;
              const noPct = total > 0 ? Math.round((no / total) * 100) : 0;
              const absPct = total > 0 ? Math.max(0, 100 - yesPct - noPct) : 0;

              return (
                <Link key={bill.id} href={`/bills/${bill.id}`} className="bt-bill">
                  <span className="tab">{bill.is_act ? 'Act' : bill.bill_withdrawn ? 'Withdrawn' : 'Bill File'}</span>
                  {bill.current_stage && <span className="stage">{bill.current_stage}</span>}
                  <h3>{bill.title}</h3>

                  <div className="tally-bar">
                    {yesPct > 0 && <span className="yes" style={{ width: `${yesPct}%` }} />}
                    {noPct > 0 && <span className="no" style={{ width: `${noPct}%` }} />}
                    {absPct > 0 && <span className="abs" style={{ width: `${absPct}%` }} />}
                  </div>
                  <div className="tally-nums">
                    <span>✓ {yesPct}%</span>
                    <span>{total.toLocaleString()} votes</span>
                    <span>✗ {noPct}%</span>
                  </div>
                </Link>
              );
            })}
          </section>
        </div>

        {/* ────── Template FOOTER ────── */}
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
