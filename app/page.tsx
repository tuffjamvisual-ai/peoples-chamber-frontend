import './home.css';
import Link from 'next/link';

export const revalidate = 3600;

export default function HomePage() {
  return (
    <main className="home-stage">
      <div className="home-shell">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home.png" alt="The People's Chamber" />

        {/* Top stamps */}
        <Link href="/about" className="hot h-issue" aria-label="Issue 23" />
        <Link href="/about" className="hot h-truth" aria-label="No spin, no paywall, just the truth" />
        <Link href="/about" className="hot h-speaker" aria-label="The People's Chamber" />

        {/* Masthead + speech bubble */}
        <Link href="/" className="hot h-masthead" aria-label="The People's Chamber — home" />
        <Link href="/about" className="hot h-bubble" aria-label="Democracy works better when people watch" />

        {/* Nav strip */}
        <Link href="/"             className="hot n-home"  aria-label="Home" />
        <Link href="/bills"        className="hot n-bills" aria-label="Bills" />
        <Link href="/laws"         className="hot n-laws"  aria-label="Laws" />
        <Link href="/polls"        className="hot n-polls" aria-label="People's Polls" />
        <Link href="/mps"          className="hot n-mps"   aria-label="MPs" />
        <Link href="/departments"  className="hot n-depts" aria-label="Departments" />
        <Link href="/signup"       className="hot n-login" aria-label="Login" />
        <Link href="/support"      className="hot n-about" aria-label="About" />

        {/* Hero */}
        <Link href="/bills"        className="hot hero-headline" aria-label="Power isn't hidden. It's published." />
        <Link href="/bills"        className="hot hero-explore"  aria-label="Explore Parliament" />
        <Link href="/transparency" className="hot hero-money"    aria-label="Follow the Money" />
        <Link href="/transparency" className="hot sign-money"    aria-label="Where's our money?" />
        <Link href="/about"        className="hot sign-acc"      aria-label="Accountability isn't a scandal, it's a right" />
        <Link href="/bills"        className="hot hero-illo"     aria-label="Westminster" />

        {/* Cover Story */}
        <Link href="/bills"        className="hot cover-card" aria-label="The Bill of Their Lives" />
        <Link href="/bills"        className="hot cover-cta"  aria-label="Read the story" />

        {/* Street View */}
        <Link href="/polls"        className="hot street-card" aria-label="Street View — public voices" />

        {/* Bills to Watch */}
        <Link href="/bills"        className="hot bills-card"  aria-label="Bills to watch" />
        <Link href="/bills"        className="hot bills-row-1" aria-label="Data (Use and Access) Bill" />
        <Link href="/bills"        className="hot bills-row-2" aria-label="Renters' Rights Bill" />
        <Link href="/bills"        className="hot bills-row-3" aria-label="Crime & Policing Bill" />
        <Link href="/bills"        className="hot bills-row-4" aria-label="Employment Rights Bill" />
        <Link href="/bills"        className="hot bills-row-5" aria-label="Planning & Infrastructure Bill" />
        <Link href="/bills"        className="hot bills-all"   aria-label="See all bills" />

        {/* Follow the Money */}
        <Link href="/transparency" className="hot money-card" aria-label="Where your tax really goes" />

        {/* Who's Who */}
        <Link href="/mps"          className="hot who-card" aria-label="MPs" />

        {/* Stat strip + take part */}
        <Link href="/polls"        className="hot stat-72"   aria-label="72% don't feel listened to" />
        <Link href="/polls"        className="hot stat-said" aria-label="You said it, we're publishing it" />
        <Link href="/polls"        className="hot poll"      aria-label="Take part in our weekly poll" />

        {/* Footer */}
        <Link href="/"             className="hot f-brand"  aria-label="The People's Chamber" />
        <Link href="/bills"        className="hot f-col-1"  aria-label="Bills · MPs · Departments · Transparency" />
        <Link href="/expenses"     className="hot f-col-2"  aria-label="Expenses · Earnings · Donations · Contracts" />
        <Link href="/about"        className="hot f-col-3"  aria-label="About & Methodology · Sources · Privacy" />
        <Link href="/support"      className="hot f-col-4"  aria-label="Terms · Contact · GitHub" />
        <Link href="/about"        className="hot f-stamps" aria-label="Trust badges" />
      </div>
    </main>
  );
}
