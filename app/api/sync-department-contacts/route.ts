import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { govukSlugs } from '@/lib/govuk-slugs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Contacts = {
  social_media_links: { service: string; url: string; title: string }[];
  foi_email: string;
  press_phone: string;
};

async function fetchContacts(govukSlug: string): Promise<Contacts> {
  const res = await fetch(
    `https://www.gov.uk/api/content/government/organisations/${govukSlug}`,
  );
  if (!res.ok) throw new Error(`gov.uk ${res.status}`);
  const data = await res.json();
  const details = (data?.details || {}) as Record<string, unknown>;
  const links = (data?.links || {}) as Record<string, unknown>;

  const social_media_links = (
    (details.social_media_links as Array<{ service_type: string; href: string; title: string }>) || []
  ).map((s) => ({ service: s.service_type, url: s.href, title: s.title }));

  const foiContacts = links.ordered_foi_contacts as
    | Array<{ details?: { email_addresses?: Array<{ email: string }> } }>
    | undefined;
  const foi_email = foiContacts?.[0]?.details?.email_addresses?.[0]?.email || '';

  const orderedContacts = links.ordered_contacts as
    | Array<{ title?: string; details?: { phone_numbers?: Array<{ number: string }> } }>
    | undefined;
  const press_phone =
    orderedContacts?.find((c) => c.title?.toLowerCase().includes('media'))?.details
      ?.phone_numbers?.[0]?.number || '';

  return { social_media_links, foi_email, press_phone };
}

export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. GitHub
  // Actions or manual curl callers should send the same header.
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key);

  const results: Array<{ deptSlug: string; status: 'ok' | 'fail'; detail?: string }> = [];
  for (const [deptSlug, govukSlug] of Object.entries(govukSlugs)) {
    try {
      const c = await fetchContacts(govukSlug);
      const { error } = await supabase.from('department_contacts').upsert(
        {
          dept_slug: deptSlug,
          social_media_links: c.social_media_links,
          foi_email: c.foi_email,
          press_phone: c.press_phone,
          last_synced: new Date().toISOString(),
        },
        { onConflict: 'dept_slug' },
      );
      if (error) throw error;
      results.push({ deptSlug, status: 'ok', detail: `social=${c.social_media_links.length}` });
    } catch (err) {
      results.push({ deptSlug, status: 'fail', detail: (err as Error).message });
    }
  }

  return NextResponse.json({
    ok: results.filter((r) => r.status === 'ok').length,
    fail: results.filter((r) => r.status === 'fail').length,
    syncedAt: new Date().toISOString(),
    results,
  });
}
