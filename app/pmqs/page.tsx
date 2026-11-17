import type { Metadata } from 'next';
import PmqsBody, { PMQS_META } from './PmqsBody';

// F04 batch 3 (ENTRY 134; T2's f04-32-routes.md section 11): static. A Prime Minister, year or page is /pmqs/filter/... (not
// indexed); a search (/pmqs?q=) is rewritten to /pmqs/search and keeps its address. The canonical is /pmqs.
export const metadata: Metadata = PMQS_META;

export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

export default function PmqsPage() {
  return <PmqsBody filters={{}} />;
}
