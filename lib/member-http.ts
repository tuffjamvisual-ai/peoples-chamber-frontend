// Shared answers for the member routes (job 74): private, never cached, and a member data result turned into a
// status (409 consent needed, 422 over the limit, 404, 500).
import { NextResponse } from 'next/server';
import type { Result } from '@/lib/member-data';

export const NO_STORE = { 'Cache-Control': 'private, no-store' };

export const unauthorised = () => NextResponse.json({ error: 'sign_in' }, { status: 401, headers: NO_STORE });
export const badRequest = () => NextResponse.json({ error: 'bad_request' }, { status: 400, headers: NO_STORE });

export function resultResponse<T>(r: Result<T>, ok: (v: T) => unknown): NextResponse {
  if (r.ok) return NextResponse.json(ok(r.value), { headers: NO_STORE });
  if (r.reason === 'error') console.error('[member data]', r.message);
  const status = r.reason === 'needs_consent' ? 409 : r.reason === 'limit' ? 422 : r.reason === 'not_found' ? 404 : 500;
  return NextResponse.json({ error: r.reason }, { status, headers: NO_STORE });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try { const b = await request.json(); return b && typeof b === 'object' ? b as Record<string, unknown> : null; } catch { return null; }
}
