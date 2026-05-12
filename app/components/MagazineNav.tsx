import Link from 'next/link';
import './magazine-chrome.css';

export default function MagazineNav() {
  return (
    <div className="mag-chrome-stage">
      <div className="mag-chrome-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home-header.png" alt="The People's Chamber — masthead" />

        <Link href="/about" className="hot mag-h-issue" aria-label="Issue 23" />
        <Link href="/about" className="hot mag-h-truth" aria-label="No spin, no paywall, just the truth" />
        <Link href="/"       className="hot mag-h-masthead" aria-label="The People's Chamber — home" />
        <Link href="/about" className="hot mag-h-bubble" aria-label="Democracy works better when people watch" />

        <Link href="/"             className="hot mag-n-home"  aria-label="Home" />
        <Link href="/bills"        className="hot mag-n-bills" aria-label="Bills" />
        <Link href="/laws"         className="hot mag-n-laws"  aria-label="Laws" />
        <Link href="/polls"        className="hot mag-n-polls" aria-label="People's Polls" />
        <Link href="/mps"          className="hot mag-n-mps"   aria-label="MPs" />
        <Link href="/departments"  className="hot mag-n-depts" aria-label="Departments" />
        <Link href="/signup"       className="hot mag-n-login" aria-label="Login" />
        <Link href="/about"        className="hot mag-n-about" aria-label="About" />
      </div>
    </div>
  );
}
