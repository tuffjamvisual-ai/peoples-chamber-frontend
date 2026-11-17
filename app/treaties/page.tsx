import { fitTitle } from '@/lib/seo-title';
import type { Metadata } from 'next';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import TreatiesListing from './TreatiesListing';

// Every treaty laid before Parliament under the Constitutional Reform and Governance Act 2010, newest laid first
// (report 81), from the treaties table (UK Parliament Treaties API, loaded daily by
// /api/sync-statutory-instruments-treaties).
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

export const metadata: Metadata = {
  title: fitTitle('Treaties laid before Parliament', 'Treaties'), // T1-A3 (6) (owner approved)
  description: PAGE_DESCRIPTIONS['/treaties'],
  alternates: { canonical: '/treaties' },
};

// Page 1; pages 2 onwards are /treaties/page/<n>, and an old /treaties?page=N moves there (proxy.ts, 308).
export default function TreatiesPage() {
  return <TreatiesListing page={1} />;
}
