import type { Metadata } from 'next';
import PressListing from './PressListing';

// Press releases, the latest day (F04 batch 3, A16): static, rebuilt only when the press_releases tag is refreshed or on a
// deploy. Other days are /transparency/press-releases/day/<date>; a search (?q=) is rewritten to .../search.
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Press Releases',
  description:
    'The full archive of UK Government department press releases from 2007 to today, and House of Commons select committee reports, each with its full text.',
  alternates: { canonical: '/transparency/press-releases' },
};

export default function PressReleasesIndexPage() {
  return <PressListing sp={{}} />;
}
