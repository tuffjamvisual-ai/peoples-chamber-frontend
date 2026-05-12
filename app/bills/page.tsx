import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBills } from '@/lib/data';
import BillsGrid from '../components/BillsGrid';
import BillsGridMobile from '../components/BillsGridMobile';
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

  return (
    <main className="bills-template-page">
      {/* Single container — empty.png is the full background (header + cream + footer all in one image) */}
      <div className="bills-template-frame">
        {/* Header nav hotspots — overlay the nav strip baked into empty.png */}
        <Link href="/"             aria-label="Home"            className="bt-hot bt-n-home" />
        <Link href="/bills"        aria-label="Bills"           className="bt-hot bt-n-bills" />
        <Link href="/laws"         aria-label="Laws"            className="bt-hot bt-n-laws" />
        <Link href="/polls"        aria-label="People's Polls"  className="bt-hot bt-n-polls" />
        <Link href="/mps"          aria-label="MPs"             className="bt-hot bt-n-mps" />
        <Link href="/departments"  aria-label="Departments"     className="bt-hot bt-n-depts" />
        <Link href="/signup"       aria-label="Login"           className="bt-hot bt-n-login" />
        <Link href="/about"        aria-label="About"           className="bt-hot bt-n-about" />

        {/* Bills content overlaid in the empty middle of the template */}
        <div className="bt-content">
          <div className="md:hidden">
            <BillsGridMobile initialBills={bills} />
          </div>
          <div className="hidden md:block">
            <BillsGrid initialBills={bills} />
          </div>
        </div>

        {/* Footer hotspots — overlay the link grid baked into empty.png */}
        <Link href="/"         aria-label="The People's Chamber" className="bt-hot bt-f-brand" />
        <Link href="/bills"    aria-label="Bills"                className="bt-hot bt-f-col1" />
        <Link href="/expenses" aria-label="Expenses"             className="bt-hot bt-f-col2" />
        <Link href="/about"    aria-label="About"                className="bt-hot bt-f-col3" />
        <Link href="/support"  aria-label="Contact"              className="bt-hot bt-f-col4" />
      </div>
    </main>
  );
}
