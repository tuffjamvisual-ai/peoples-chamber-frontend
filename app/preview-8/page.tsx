import Link from 'next/link';

export default function PreviewEightLandingPage() {
  return (
    <div className="pix-mid">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing-v2-middle.png"
        alt="The People's Chamber — body"
      />

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
      <Link href="/polls"        className="hot c-street"      aria-label="Street View — public voices" />

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
    </div>
  );
}
