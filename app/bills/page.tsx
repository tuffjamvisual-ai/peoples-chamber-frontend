import type { Metadata } from 'next';
import BillsListing from './BillsListing';

// /bills lists the bills going through Parliament now (lib/data.ts getBillsPage, from the bill_current view), 20 a
// page; Acts, withdrawn bills and earlier sessions are in the archive at /bills/sessions. Cached and rebuilt at most
// every 10 minutes; the bill syncs also refresh it as soon as they write (lib/revalidate-bills.ts). Page 2 onwards is
// /bills/page/[page]; old /bills?page=N links redirect there (next.config.ts). Owner's approval, 21 Oct 2026: this
// page was rendered on every request (force-dynamic).
export const revalidate = 600;

export const metadata: Metadata = {
  title: "UK Parliament Bills Tracker, Live Stages, Votes & Acts",
  description:
    "The bills going through UK Parliament now: current stage, sponsor, how MPs voted and the public verdict. Every earlier bill, Act and withdrawn bill is in the archive by session.",
  alternates: { canonical: '/bills' },
};

export default function BillsPage() {
  return <BillsListing page={1} />;
}
