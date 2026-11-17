import type { Metadata } from 'next';
import DebatesListing from './DebatesListing';

// Commons debates index (F04 batch 3, A16): static, rebuilt only when the debates tag is refreshed or on a deploy. Sections and
// pages are /debates/filter/...; a search (/debates?q=) is rewritten to /debates/search and keeps its address.
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Commons Debates',
  description:
    'Every debate held in the House of Commons since the July 2024 general election. Read the full record on site, by date and section.',
  alternates: { canonical: '/debates' },
};

export default function DebatesPage() {
  return <DebatesListing section={null} q="" pageNum={1} />;
}
