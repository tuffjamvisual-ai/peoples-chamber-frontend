import './preview-8/preview-8.css';
import Link from 'next/link';

export const revalidate = 3600;

export default function HomePage() {
  return (
    <main className="pixel-stage">
      <div className="pixel-shell">
        {/* ────── Pixel-perfect HEADER ────── */}
        <div className="pix-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing-v2-header.png"
            alt="The People's Chamber — masthead"
          />

          <Link href="/about" className="hot h-issue" aria-label="Issue 13" />
          <Link href="/about" className="hot h-truth" aria-label="No spin, no paywall, just the truth" />
          <Link href="/" className="hot h-masthead" aria-label="The People's Chamber — home" />
          <Link href="/about" className="hot h-bubble" aria-label="Democracy works better when people watch" />

          <Link href="/bills"        className="hot h-n-cover"  aria-label="Cover Story" />
          <Link href="/polls"        className="hot h-n-street" aria-label="Street View" />
          <Link href="/bills"        className="hot h-n-bills"  aria-label="Bills to Watch" />
          <Link href="/transparency" className="hot h-n-money"  aria-label="Follow the Money" />
          <Link href="/mps"          className="hot h-n-who"    aria-label="MPs">MP&apos;s</Link>
          <Link href="/polls"        className="hot h-n-pulse"  aria-label="The People's Pulse" />
          <Link href="/search"       className="hot h-n-search" aria-label="Search" />
          <Link href="/support"      className="hot h-n-about"  aria-label="About" />
        </div>

        {/* ────── Pixel-perfect MIDDLE (landing body) ────── */}
        <div className="pix-mid">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing-v2-middle.png"
            alt="The People's Chamber — body"
          />

          <Link href="/bills"        className="hot hero-headline" aria-label="Power isn't hidden. It's published." />
          <Link href="/bills"        className="hot b-explore"     aria-label="Explore Parliament" />
          <Link href="/transparency" className="hot b-money"       aria-label="Follow the Money" />
          <Link href="/transparency" className="hot bubble-money"  aria-label="Where's our money?" />
          <Link href="/about"        className="hot bubble-right"  aria-label="Accountability isn't a favour, it's a right" />

          <Link href="/bills"        className="hot c-cover-card"  aria-label="The Bill of Their Lives" />
          <Link href="/bills"        className="hot c-cover-cta"   aria-label="Read the story" />

          <Link href="/polls"        className="hot c-street"      aria-label="Street View — public voices" />

          <Link href="/bills"        className="hot c-bills-card"  aria-label="Bills to watch" />
          <Link href="/bills"        className="hot bills-row-1"   aria-label="Bill row 1" />
          <Link href="/bills"        className="hot bills-row-2"   aria-label="Bill row 2" />
          <Link href="/bills"        className="hot bills-row-3"   aria-label="Bill row 3" />
          <Link href="/bills"        className="hot bills-row-4"   aria-label="Bill row 4" />
          <Link href="/bills"        className="hot bills-row-5"   aria-label="Bill row 5" />
          <Link href="/bills"        className="hot bills-all"     aria-label="See all bills" />

          <Link href="/transparency" className="hot c-money-card"  aria-label="Where your tax really goes" />

          <Link href="/mps"          className="hot c-who-card"    aria-label="Who's Who — MPs" />
          <Link href="/mps"          className="hot who-more"      aria-label="More faces, more records" />

          <Link href="/polls"        className="hot c-poll"        aria-label="Public poll callout" />
          <Link href="/polls"        className="hot c-takepart"    aria-label="Take part in our weekly poll" />

          <Link href="/polls"        className="hot stat-72"       aria-label="72% of people think the government doesn't listen" />
          <Link href="/polls"        className="hot stat-said"     aria-label="You said it, we're publishing it" />
        </div>

        {/* ────── Pixel-perfect FOOTER ────── */}
        <div className="pix-footer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing-v2-footer.png"
            alt="The People's Chamber — footer"
          />

          <Link href="/"        className="hot f-brand"   aria-label="The People's Chamber" />
          <Link href="/about"   className="hot f-copy"    aria-label="Copyright" />
          <Link href="/about"   className="hot f-tagline" aria-label="Watch. Question. Share. Repeat." />
          <Link href="/support" className="hot f-email"   aria-label="Get our weekly brief" />
          <Link href="/support" className="hot f-social"  aria-label="Social links" />
        </div>
      </div>
    </main>
  );
}
