import './preview-7.css';
import Link from 'next/link';

export default function PixelMatchPage() {
  return (
    <main className="pixel-stage">
      <div className="pixel-shell">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing-reference.png"
          alt="The People's Chamber — Whitehall briefing landing"
        />

        {/* ───── Top stamp row ───── */}
        <Link href="/transparency" className="hot s-public"  aria-label="Public Version" />
        <Link href="/about"        className="hot s-cleared" aria-label="Cleared for Citizens" />
        <Link href="/support"      className="hot s-panic"   aria-label="Ministerial Panic" />

        {/* ───── Masthead ───── */}
        <Link href="/" className="hot masthead" aria-label="The People's Chamber — home" />

        {/* ───── Nav strip ───── */}
        <Link href="/"             className="hot n-home"         aria-label="Home" />
        <Link href="/bills"        className="hot n-bills"        aria-label="Bills" />
        <Link href="/laws"         className="hot n-laws"         aria-label="Laws" />
        <Link href="/polls"        className="hot n-polls"        aria-label="People's Polls" />
        <Link href="/mps"          className="hot n-mps"          aria-label="MPs" />
        <Link href="/departments"  className="hot n-depts"        aria-label="Departments" />
        <Link href="/transparency" className="hot n-transparency" aria-label="Transparency" />
        <Link href="/search"       className="hot n-search"       aria-label="Search" />
        <Link href="/support"      className="hot n-about"        aria-label="About" />
        <Link href="/search"       className="hot n-search-icon"  aria-label="Search" />

        {/* ───── Hero briefing buttons ───── */}
        <Link href="/bills"        className="hot b-briefing" aria-label="Read the Briefing" />
        <Link href="/transparency" className="hot b-money"    aria-label="Follow the Money" />

        {/* ───── Filing cabinet (sidebar) ───── */}
        <Link href="/bills"        className="hot fc-tray"        aria-label="In the Tray — bills" />
        <Link href="/transparency" className="hot fc-clarify"     aria-label="Waiting for Clarification" />
        <Link href="/transparency" className="hot fc-normal"      aria-label="Filed under Perfectly Normal" />
        <Link href="/polls"        className="hot fc-public-says" aria-label="Public Says Otherwise" />

        {/* ───── Top cards ───── */}
        <Link href="/news/animal-and-plant-health-agency" className="hot c-ministerial" aria-label="Ministerial briefing — top story" />
        <Link href="/bills"        className="hot c-vote-card"    aria-label="Removal of Peerages Bill — public vote" />
        <Link href="/bills"        className="hot c-vote-bill"    aria-label="Read the bill" />
        <Link href="/bills"        className="hot c-vote-mps"     aria-label="See how MPs voted" />
        <Link href="/transparency" className="hot c-procurement"  aria-label="Largest contract on record" />

        {/* ───── Today's Spin rows ───── */}
        <Link href="/news" className="hot spin-row-1" aria-label="Spin item — Lords poll" />
        <Link href="/news" className="hot spin-row-2" aria-label="Spin item — doctors training" />
        <Link href="/news" className="hot spin-row-3" aria-label="Spin item — MP expenses" />

        {/* ───── Expenses Ledger top 10 ───── */}
        <Link href="/expenses" className="hot exp-top10" aria-label="See top 10 expense claimants" />

        {/* ───── Press Offices (Whitehall releases) ───── */}
        <Link href="/news" className="hot press-1" aria-label="DSIT press release" />
        <Link href="/news" className="hot press-2" aria-label="PM's Office press release" />
        <Link href="/news" className="hot press-3" aria-label="FCDO press release" />
        <Link href="/news" className="hot press-4" aria-label="Skills England press release" />

        {/* ───── Take Part ───── */}
        <Link href="/bills"        className="hot tp-vote"         aria-label="Vote on Bills" />
        <Link href="/transparency" className="hot tp-transparency" aria-label="Transparency Records" />

        {/* ───── Trust strip ───── */}
        <Link href="/about"        className="hot t-indep"    aria-label="100% Independent" />
        <Link href="/transparency" className="hot t-realtime" aria-label="Real-time Data" />
        <Link href="/about"        className="hot t-open"     aria-label="Open to All" />
        <Link href="/transparency" className="hot t-account"  aria-label="Accountability First" />
      </div>
    </main>
  );
}
