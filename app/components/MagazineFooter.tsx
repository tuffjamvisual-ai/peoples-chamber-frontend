import Link from 'next/link';
import './magazine-chrome.css';

export default function MagazineFooter() {
  return (
    <div className="mag-chrome-stage">
      <div className="mag-chrome-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/empty-template-footer.png" alt="opengovt, footer" />

        <Link href="/"         className="hot mag-f-brand"  aria-label="opengovt" />
        <Link href="/bills"    className="hot mag-f-col1"   aria-label="Bills · MPs · Departments · Transparency" />
        <Link href="/expenses" className="hot mag-f-col2"   aria-label="Expenses · Earnings · Donations · Contracts" />
        <Link href="/about"    className="hot mag-f-col3"   aria-label="About & Methodology · Sources · Privacy" />
        <Link href="/support"  className="hot mag-f-col4"   aria-label="Terms · Contact · GitHub" />
        <Link href="/about"    className="hot mag-f-stamps" aria-label="Trust badges" />
      </div>
    </div>
  );
}
