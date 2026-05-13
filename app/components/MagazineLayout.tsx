import Link from 'next/link';
import type { ReactNode } from 'react';
import './magazine-layout.css';

export default function MagazineLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bills-template-page">
      <div className="bills-template-frame">
        {/* Header nav hotspots — overlay the nav strip baked into empty-template.png */}
        <Link href="/"             aria-label="Home"            className="bt-hot bt-n-home" />
        <Link href="/bills"        aria-label="Bills"           className="bt-hot bt-n-bills" />
        <Link href="/laws"         aria-label="Laws"            className="bt-hot bt-n-laws" />
        <Link href="/polls"        aria-label="People's Polls"  className="bt-hot bt-n-polls" />
        <Link href="/mps"          aria-label="MPs"             className="bt-hot bt-n-mps" />
        <Link href="/departments"  aria-label="Departments"     className="bt-hot bt-n-depts" />
        <Link href="/signup"       aria-label="Login"           className="bt-hot bt-n-login" />
        <Link href="/about"        aria-label="About"           className="bt-hot bt-n-about" />

        {/* Page content overlaid in the empty middle of the template */}
        <div className="bt-content">{children}</div>

        {/* Footer hotspots — overlay the link grid baked into empty-template.png */}
        <Link href="/"         aria-label="The People's Chamber" className="bt-hot bt-f-brand" />
        <Link href="/bills"    aria-label="Bills"                className="bt-hot bt-f-col1" />
        <Link href="/expenses" aria-label="Expenses"             className="bt-hot bt-f-col2" />
        <Link href="/about"    aria-label="About"                className="bt-hot bt-f-col3" />
        <Link href="/support"  aria-label="Contact"              className="bt-hot bt-f-col4" />
      </div>
    </main>
  );
}
