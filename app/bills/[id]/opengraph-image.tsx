// Share image for each bill page (OG1, audit, 8 Nov 2026): "Bill" and the bill's title, on the site's share card
// (lib/og-card.tsx). No stage, date or vote figures, which change. A bill we do not show gets the plain "Bills" card.
// Drawn on first request and kept for a week, like the page.

import { ogCard } from '@/lib/og-card';
import { supabase } from '@/lib/supabase';

export const alt = 'Bill from opengovt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 604800;
export function generateStaticParams() { return []; }

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const billId = parseInt(id, 10);
  let title: string | null = null;
  if (Number.isFinite(billId)) {
    const { data, error } = await supabase.from('bill').select('title, long_title, hidden_reason').eq('id', billId).maybeSingle();
    if (error) throw new Error(`/bills/[id]/opengraph-image bill: ${error.message}`);
    if (data && !data.hidden_reason) title = data.title || data.long_title || null;
  }
  return ogCard(title ? { kicker: 'Bill', title } : { kicker: 'Bills', title: 'Bills before the UK Parliament' });
}
