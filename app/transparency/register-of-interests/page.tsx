import type { Metadata } from 'next';
import RegisterListing from './RegisterListing';

// Register of interests, page 1 with no filter (F04 batch 3, A16): static, rebuilt only when its tags are refreshed or on a
// deploy. Later pages are /transparency/register-of-interests/page/<n>; any filter (?q=, ?mp=, ?cat=, ?from=, ?to=) is
// rewritten to .../search and keeps its address.
export const revalidate = false;

export const metadata: Metadata = {
  title: { absolute: "Register of Members' Financial Interests: Search Every MP" },
  description:
    "Search the Register of Members' Financial Interests: gifts, hospitality, employment, overseas visits, property and shareholdings declared by every UK MP.",
  alternates: { canonical: '/transparency/register-of-interests' },
};

export default function RegisterOfInterestsPage() {
  return <RegisterListing sp={{}} />;
}
