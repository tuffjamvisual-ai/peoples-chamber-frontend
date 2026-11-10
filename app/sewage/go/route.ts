// The phone league table selectors on /sewage with JavaScript off (UX2e, 10 Nov 2026): a GET form sends the chosen table
// and sort here, and this sends the reader to that table's own cached page (app/sewage/t/[table]/[sort]). Unknown values go
// back to /sewage. With JavaScript on the form never submits; the selectors change the table in place.
import { NextResponse, type NextRequest } from 'next/server';
import { SEWAGE_TABLE_IDS, SORT_KEYS } from '../table-ids';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const table = q.get('table') ?? '';
  const sort = q.get('sort') ?? 'hours';
  const ok = SEWAGE_TABLE_IDS.includes(table) && (SORT_KEYS as string[]).includes(sort);
  return NextResponse.redirect(new URL(ok ? `/sewage/t/${table}/${sort}#league` : '/sewage#league', req.url), 303);
}
