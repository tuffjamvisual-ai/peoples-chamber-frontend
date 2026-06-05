// /feed.xml — RSS 2.0 feed serving the 50 most recently updated MP
// profiles and bills. Pulls from existing mps + bill tables with no new
// indices required; sorts the unioned stream by recency and renders one
// <item> block per entry.
//
// Added 2026-06-05 as SEO Phase 1 Task 4. ISR cached for 30 min.

import { supabase } from '@/lib/supabase';

export const revalidate = 1800;

const SITE = 'https://www.thepeopleschamber.uk';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rfc822(iso: string | Date | null | undefined): string {
  if (!iso) return new Date().toUTCString();
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

function firstSentence(text: string | null | undefined, max = 240): string {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const period = cleaned.indexOf('.');
  let head = period > 0 ? cleaned.slice(0, period + 1) : cleaned;
  if (head.length > max) head = head.slice(0, max - 1).trimEnd() + '…';
  return head;
}

type FeedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  pubDateSort: number;
};

async function fetchMpItems(): Promise<FeedItem[]> {
  const { data: mpRows } = await supabase
    .from('mps')
    .select('member_id, display_name, name, party, constituency, updated_at')
    .eq('current_member', true)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .range(0, 24);
  if (!mpRows || mpRows.length === 0) return [];

  // Bios are keyed by member_id. One join query gets us the prose for
  // the description first-sentence.
  const ids = mpRows.map((m: { member_id: number }) => m.member_id);
  const { data: bios } = await supabase
    .from('mp_biography')
    .select('member_id, political_bio')
    .in('member_id', ids);
  const bioByMember = new Map<number, string>();
  (bios || []).forEach((b: { member_id: number; political_bio: string | null }) => {
    if (b.political_bio) bioByMember.set(b.member_id, b.political_bio);
  });

  return mpRows.map(
    (m: {
      member_id: number;
      display_name: string | null;
      name: string | null;
      party: string | null;
      constituency: string | null;
      updated_at: string | null;
    }) => {
      const fullName = m.display_name || m.name || `MP ${m.member_id}`;
      const subtitle = [m.party, m.constituency ? `MP for ${m.constituency}` : null]
        .filter(Boolean)
        .join(', ');
      const bioLead = firstSentence(bioByMember.get(m.member_id));
      const description = [subtitle, bioLead].filter(Boolean).join('. ');
      const ts = m.updated_at ? new Date(m.updated_at).getTime() : Date.now();
      return {
        title: `${fullName}${subtitle ? ` — ${subtitle}` : ''}`,
        link: `${SITE}/mps/${m.member_id}`,
        description,
        pubDate: rfc822(m.updated_at),
        pubDateSort: ts,
      };
    },
  );
}

async function fetchBillItems(): Promise<FeedItem[]> {
  const { data: billRows } = await supabase
    .from('bill')
    .select('id, title, plain_summary, current_stage, sponsor_name, last_update, is_act')
    .or(
      'commons_division_id.not.is.null,is_act.eq.true,current_stage.not.is.null',
    )
    .order('last_update', { ascending: false, nullsFirst: false })
    .range(0, 24);
  if (!billRows || billRows.length === 0) return [];

  return billRows.map(
    (b: {
      id: number;
      title: string;
      plain_summary: string | null;
      current_stage: string | null;
      sponsor_name: string | null;
      last_update: string | null;
      is_act: boolean | null;
    }) => {
      const lead = firstSentence(b.plain_summary, 200);
      const statusBits: string[] = [];
      if (b.is_act) statusBits.push('Now an Act of Parliament');
      else if (b.current_stage) statusBits.push(`Currently at ${b.current_stage}`);
      if (b.sponsor_name) statusBits.push(`sponsored by ${b.sponsor_name}`);
      const description = [lead, statusBits.join('; ')].filter(Boolean).join(' ');
      const ts = b.last_update ? new Date(b.last_update).getTime() : 0;
      return {
        title: b.title,
        link: `${SITE}/bills/${b.id}`,
        description,
        pubDate: rfc822(b.last_update),
        pubDateSort: ts,
      };
    },
  );
}

export async function GET() {
  const [mpItems, billItems] = await Promise.all([fetchMpItems(), fetchBillItems()]);

  const merged = [...mpItems, ...billItems]
    .sort((a, b) => b.pubDateSort - a.pubDateSort)
    .slice(0, 50);

  const itemsXml = merged
    .map(
      (it) => `    <item>
      <title>${xmlEscape(it.title)}</title>
      <link>${xmlEscape(it.link)}</link>
      <description>${xmlEscape(it.description)}</description>
      <pubDate>${it.pubDate}</pubDate>
      <guid isPermaLink="true">${xmlEscape(it.link)}</guid>
    </item>`,
    )
    .join('\n');

  const buildDate = rfc822(new Date());
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The People's Chamber — Recent Updates</title>
    <link>${SITE}/</link>
    <description>The 50 most recently updated MP profiles and bill stages on The People's Chamber, an independent record of how the United Kingdom is governed.</description>
    <language>en-GB</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
}
