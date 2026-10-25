import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// House of Commons committee "press releases". GOV.UK's press-release feed
// (sync-press-releases) only carries ministerial-department releases; it does
// not carry anything from Parliament. The parliament.uk website and its RSS
// feeds sit behind a Cloudflare challenge, so a serverless function cannot
// fetch them. The Committees API subdomain, however, returns clean JSON with
// no challenge, so we source committee reports from there.
//
// We keep only genuine report-style publications (Report / Special Report),
// Commons house only, and drop the noise (correspondence letters, formal
// minutes, written/scrutiny evidence). Each report is stored in the shared
// press_releases table so it renders on /transparency/press-releases and its
// own on-site /news/[slug] page alongside the GOV.UK releases, labelled by
// committee. Rows are distinguished from GOV.UK rows by the parliament.uk
// domain in gov_url, which also drives per-source retention. Added 2026-07-10.

const COMMITTEES_API =
  'https://committees-api.parliament.uk/api/Publications?take=60';

const REPORT_TYPES = new Set(['Report', 'Special Report']);
const API_TIMEOUT_MS = 20_000;

type Publication = {
  id: number;
  description?: string | null;
  publicationStartDate?: string | null;
  type?: { name?: string } | null;
  committee?: { name?: string; house?: string } | null;
  hcNumber?: { number?: string; sessionDescription?: string } | null;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Build an on-site HTML body from the metadata we have. The report text itself
// is a PDF on parliament.uk, so we do not inline it; we present the summary and
// cite the source as plain text (no offsite links).
function buildBody(p: Publication, committee: string): string {
  const parts: string[] = [];
  if (p.description) parts.push(`<p>${esc(p.description)}</p>`);
  const date = fmtDate(p.publicationStartDate || null);
  const typeName = p.type?.name || 'Report';
  parts.push(
    `<p>${esc(typeName)} published by the ${esc(committee)} (House of Commons)${date ? ` on ${esc(date)}` : ''}.</p>`,
  );
  if (p.hcNumber?.number) {
    const session = p.hcNumber.sessionDescription ? `, Session ${esc(p.hcNumber.sessionDescription)}` : '';
    parts.push(`<p>Report reference: ${esc(p.hcNumber.number)}${session}.</p>`);
  }
  parts.push(
    `<p>Source: UK Parliament, Committees. The full report is published by the committee on parliament.uk.</p>`,
  );
  return parts.join('\n');
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
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

  try {
    // A 20 s limit on the Committees API (25 Oct 2026, report 43): the request had none, so one slow answer used the
    // whole 60 s and the run timed out (25 Oct 06:15). The next run, two hours later, reads the same newest 60 again.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(COMMITTEES_API, {
        headers: { Accept: 'application/json', 'User-Agent': 'PeoplesChamber/1.0' },
        signal: ctrl.signal,
      });
    } catch (e) {
      if (ctrl.signal.aborted) return NextResponse.json({ ok: false, error: `committees-api: no answer within ${API_TIMEOUT_MS / 1000} s` }, { status: 504 });
      throw e;
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return NextResponse.json({ error: `committees-api ${res.status}` }, { status: 502 });

    const data = (await res.json()) as { items?: Publication[] };
    const items = data.items || [];

    // Commons house + report-style only, newest first, cap at 40.
    const reports = items
      .filter(
        (p) =>
          p.committee?.house === 'Commons' &&
          REPORT_TYPES.has(p.type?.name || '') &&
          !!p.description,
      )
      .sort((a, b) => (b.publicationStartDate || '').localeCompare(a.publicationStartDate || ''))
      .slice(0, 40);

    // Each report is written once (25 Oct 2026, report 43): the run used to upsert all of them, one request each, every
    // two hours. Now it reads which are already stored, and writes only new reports and any whose details changed, in
    // one request.
    const now = new Date().toISOString();
    const records = reports.map((p) => {
      const committee = p.committee?.name || 'House of Commons';
      return {
        title: p.description as string,
        description: p.type?.name === 'Special Report' ? 'Special report' : 'Select committee report',
        organisation: committee,
        published_at: p.publicationStartDate || null,
        gov_url: `https://committees.parliament.uk/publications/${p.id}`,
        body: buildBody(p, committee),
        body_fetched_at: now,
        fetched_at: now,
      };
    });
    const { data: stored, error: storedErr } = records.length
      ? await supabase.from('press_releases').select('gov_url, title, description, organisation, published_at, body').in('gov_url', records.map((r) => r.gov_url))
      : { data: [], error: null };
    if (storedErr) return NextResponse.json({ ok: false, error: `stored reports: ${storedErr.message}` }, { status: 500 });
    const byUrl = new Map((stored ?? []).map((r) => [r.gov_url as string, r]));
    const sameTime = (a: string | null, b: string | null) => (a && b ? Date.parse(a) === Date.parse(b) : a === b);
    const changed = records.filter((r) => {
      const old = byUrl.get(r.gov_url);
      return !old || old.title !== r.title || old.description !== r.description || old.organisation !== r.organisation
        || old.body !== r.body || !sameTime(old.published_at as string | null, r.published_at);
    });
    let upserted = 0;
    if (changed.length) {
      const { error } = await supabase.from('press_releases').upsert(changed, { onConflict: 'gov_url' });
      if (error) return NextResponse.json({ ok: false, error: `upsert: ${error.message}` }, { status: 500 });
      upserted = changed.length;
    }

    return NextResponse.json({
      ok: true,
      fetched: items.length,
      commonsReports: reports.length,
      added: changed.filter((r) => !byUrl.has(r.gov_url)).length,
      updated: changed.filter((r) => byUrl.has(r.gov_url)).length,
      unchanged: records.length - changed.length,
      upserted,
      syncedAt: now,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-commons-press-releases', GET_impl);
