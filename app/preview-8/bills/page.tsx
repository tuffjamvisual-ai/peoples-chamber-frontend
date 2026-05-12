import '../preview-8.css';
import Link from 'next/link';

export default function PreviewEightBillsPage() {
  return (
    <main className="pixel-stage">
      <div className="pixel-shell">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing-v2.png"
          alt="The People's Chamber — Bills"
        />

        {/* ───── Top stamps ───── */}
        <Link href="/about" className="hot s-issue" aria-label="Issue 13" />
        <Link href="/about" className="hot s-truth" aria-label="No spin, no paywall, just the truth" />

        {/* ───── Masthead ───── */}
        <Link href="/" className="hot masthead" aria-label="The People's Chamber — home" />

        {/* ───── Hero speech bubble ───── */}
        <Link href="/about" className="hot bubble-watch" aria-label="Democracy works better when people watch" />

        {/* ───── Nav strip ───── */}
        <Link href="/news"         className="hot n-cover"  aria-label="Cover Story" />
        <Link href="/news"         className="hot n-street" aria-label="Street View" />
        <Link href="/bills"        className="hot n-bills"  aria-label="Bills to Watch" />
        <Link href="/transparency" className="hot n-money"  aria-label="Follow the Money" />
        <Link href="/mps"          className="hot n-who"    aria-label="Who's Who" />
        <Link href="/polls"        className="hot n-pulse"  aria-label="The People's Pulse" />
        <Link href="/search"       className="hot n-search" aria-label="Search" />
        <Link href="/support"      className="hot n-about"  aria-label="About" />

        {/* ───── Hero ───── */}
        <Link href="/bills"        className="hot hero-headline" aria-label="Power isn't hidden. It's published." />
        <Link href="/bills"        className="hot b-explore"     aria-label="Explore Parliament" />
        <Link href="/transparency" className="hot b-money"       aria-label="Follow the Money" />
        <Link href="/transparency" className="hot bubble-money"  aria-label="Where's our money?" />
        <Link href="/about"        className="hot bubble-right"  aria-label="Accountability isn't a favour, it's a right" />

        {/* ───── Cover Story ───── */}
        <Link href="/bills"        className="hot c-cover-card"  aria-label="The Bill of Their Lives — Health & Care Bill" />
        <Link href="/bills"        className="hot c-cover-cta"   aria-label="Read the story" />

        {/* ───── Street View ───── */}
        <Link href="/news"         className="hot c-street"      aria-label="Street View — public voices" />

        {/* ───── Bills to Watch ───── */}
        <Link href="/bills"        className="hot c-bills-card"  aria-label="Bills to watch" />
        <Link href="/bills"        className="hot bills-row-1"   aria-label="Bill row 1" />
        <Link href="/bills"        className="hot bills-row-2"   aria-label="Bill row 2" />
        <Link href="/bills"        className="hot bills-row-3"   aria-label="Bill row 3" />
        <Link href="/bills"        className="hot bills-row-4"   aria-label="Bill row 4" />
        <Link href="/bills"        className="hot bills-row-5"   aria-label="Bill row 5" />
        <Link href="/bills"        className="hot bills-all"     aria-label="See all bills" />

        {/* ───── Follow the Money pie ───── */}
        <Link href="/transparency" className="hot c-money-card"  aria-label="Where your tax really goes" />

        {/* ───── Who's Who ───── */}
        <Link href="/mps"          className="hot c-who-card"    aria-label="Who's Who — MPs" />
        <Link href="/mps"          className="hot who-more"      aria-label="More faces, more records" />

        {/* ───── Poll callout / take-part ───── */}
        <Link href="/polls"        className="hot c-poll"        aria-label="Public poll callout" />
        <Link href="/polls"        className="hot c-takepart"    aria-label="Take part in our weekly poll" />

        {/* ───── 72% stat strip ───── */}
        <Link href="/polls"        className="hot stat-72"       aria-label="72% of people think the government doesn't listen" />
        <Link href="/polls"        className="hot stat-said"     aria-label="You said it, we're publishing it" />

        {/* ───── Footer ───── */}
        <Link href="/"             className="hot f-brand"       aria-label="The People's Chamber" />
        <Link href="/about"        className="hot f-tagline"     aria-label="Watch. Question. Share. Repeat." />
        <Link href="/support"      className="hot f-email"       aria-label="Get our weekly brief" />
        <Link href="/support"      className="hot f-social"      aria-label="Social links" />
      </div>
    </main>
  );
}
