import type { Metadata } from 'next';
import MadeWithoutAVoteListing, { MWV_METADATA } from './MadeWithoutAVoteListing';

// Every statutory instrument laid before Parliament, newest laid first (report 81), from the statutory_instruments
// table (UK Parliament Statutory Instruments API, loaded daily by /api/sync-statutory-instruments-treaties). With no
// choices; a department, procedure, flag or page is /laws/made-without-a-vote/filter/... (F04 batch 2), and an old
// ?department=...&page= address moves there (proxy.ts, lib/list-path.ts).
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

export const metadata: Metadata = MWV_METADATA;

export default function MadeWithoutAVotePage() {
  return <MadeWithoutAVoteListing />;
}
