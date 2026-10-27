// The preferences page's data for the signed in member (job 74): digest setting, follows, saved searches and the
// newsletter choice, all their own rows only.
//   GET                       everything the page shows
//   POST {frequency}          'weekly' or 'off'
//   POST {newsletter}         true or false (users.newsletter_opt_in, as /api/account/newsletter)
//   DELETE                    delete every follow, saved search and the consent record
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionUserId } from '@/lib/session';
import { deleteAllFollowData, getSettings, listFollows, listSavedSearches, setFrequency, MAX_FOLLOWS, MAX_SAVED_SEARCHES } from '@/lib/member-data';
import { followHref } from '@/lib/follow-targets';
import { NO_STORE, badRequest, readJson, resultResponse, unauthorised } from '@/lib/member-http';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (userId == null) return unauthorised();
  const [settings, follows, searches, user] = await Promise.all([
    getSettings(supabaseAdmin, userId),
    listFollows(supabaseAdmin, userId),
    listSavedSearches(supabaseAdmin, userId),
    supabaseAdmin.from('users').select('newsletter_opt_in, email_verified').eq('id', userId).maybeSingle(),
  ]);
  if (!settings.ok) return resultResponse(settings, () => null);
  if (!follows.ok) return resultResponse(follows, () => null);
  if (!searches.ok) return resultResponse(searches, () => null);
  if (user.error) { console.error('[preferences] users:', user.error.message); return NextResponse.json({ error: 'error' }, { status: 500, headers: NO_STORE }); }
  return NextResponse.json({
    settings: settings.value ? { frequency: settings.value.frequency, consentedAt: settings.value.consented_at } : null,
    follows: follows.value.map((f) => ({ kind: f.kind, key: f.target_key, label: f.target_label, href: followHref(f.kind, f.target_key), since: f.created_at })),
    searches: searches.value,
    newsletter: user.data?.newsletter_opt_in === true,
    emailVerified: user.data?.email_verified === true,
    limits: { follows: MAX_FOLLOWS, searches: MAX_SAVED_SEARCHES },
  }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (userId == null) return unauthorised();
  const b = await readJson(request);
  if (b?.frequency === 'weekly' || b?.frequency === 'off') {
    return resultResponse(await setFrequency(supabaseAdmin, userId, b.frequency), () => ({ frequency: b.frequency }));
  }
  if (typeof b?.newsletter === 'boolean') {
    const { error } = await supabaseAdmin.from('users').update({ newsletter_opt_in: b.newsletter }).eq('id', userId);
    if (error) { console.error('[preferences] newsletter:', error.message); return NextResponse.json({ error: 'error' }, { status: 500, headers: NO_STORE }); }
    return NextResponse.json({ newsletter: b.newsletter }, { headers: NO_STORE });
  }
  return badRequest();
}

export async function DELETE(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (userId == null) return unauthorised();
  return resultResponse(await deleteAllFollowData(supabaseAdmin, userId), () => ({ deleted: true }));
}
