import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';
import HumaniserClient from './HumaniserClient';

// Internal editorial tool. Unlisted (not in nav, not in sitemap) and not indexed
// (noindex/nofollow + Disallow: /internal/ in robots.txt). Now requires a login:
// logged-out visitors are redirected to /login, and the API it calls independently
// rejects any request without a valid session. The client component lives in a
// separate file because Next.js cannot export `metadata` from a "use client" module.

export const metadata: Metadata = {
  title: 'Humaniser',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const store = await cookies();
  const userId = verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) redirect('/login?next=/internal/humaniser');
  return <HumaniserClient />;
}
