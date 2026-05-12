import '../preview-8.css';
import Link from 'next/link';
import { getAllBills } from '@/lib/data';

export const revalidate = 600;

export default async function PreviewEightBillsPage() {
  const allBills = await getAllBills();
  const active = allBills.filter((b: any) => !b.bill_withdrawn && !b.is_act);
  const top = active.slice(0, 5);
  const href = (i: number) => (top[i] ? `/bills/${top[i].id}` : '/bills');

  return (
    <main className="pixel-stage">
      <div className="pixel-shell">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing-v2.png"
          alt="The People's Chamber — Bills"
        />

        {/* ───── Top stamps ───── */}
        <Link href="/bills" className="hot s-issue" aria-label="Issue 13" />
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

        {/* ───── Cover Story (bills card) ───── */}
        <Link href="/bills"        className="hot c-cover-card"  aria-label="The Bill of Their Lives — feature" />
        <Link href="/bills"        className="hot c-cover-cta"   aria-label="Read the story" />

        {/* ───── Street View ───── */}
        <Link href="/news"         className="hot c-street"      aria-label="Street View — public voices" />

        {/* ───── Bills to Watch — each row linked to a real bill ───── */}
        <Link href="/bills"        className="hot c-bills-card"  aria-label="Bills to watch" />
        <Link href={href(0)}       className="hot bills-row-1"   aria-label={top[0]?.title || 'Bill row 1'} />
        <Link href={href(1)}       className="hot bills-row-2"   aria-label={top[1]?.title || 'Bill row 2'} />
        <Link href={href(2)}       className="hot bills-row-3"   aria-label={top[2]?.title || 'Bill row 3'} />
        <Link href={href(3)}       className="hot bills-row-4"   aria-label={top[3]?.title || 'Bill row 4'} />
        <Link href={href(4)}       className="hot bills-row-5"   aria-label={top[4]?.title || 'Bill row 5'} />
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
