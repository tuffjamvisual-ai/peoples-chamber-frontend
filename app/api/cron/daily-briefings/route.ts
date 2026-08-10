import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendBriefingNotification } from '@/lib/email';

// Daily automated briefings. Triggered by Vercel cron (GET) at 06:00 and 07:00
// UTC; the in-route Europe/London guard means the work only runs at 07:00 UK
// local, year-round across BST/GMT. Calls the Anthropic Messages API with the
// server-side web_search tool, parses three briefings, and stores them as
// DRAFTS (is_published = false) — nothing goes public until a human flips the
// flag after the review email. Manual test: GET with ?test=1 bypasses the
// time guard (auth still required).

export const runtime = 'nodejs';
export const maxDuration = 300;

const SYSTEM_PROMPT = `You are a sub-editor for opengovt, an independent UK accountability journalism site. Find the three most significant UK political stories from the last 24 hours. Write each as a short, sharp tabloid-style briefing.
Rules:

Tabloid rhythm. Short sentences. Short paragraphs. No paragraph longer than three sentences. Most paragraphs should be one or two.
Lead with the punch, not the context. The most shocking or important fact goes first. Background comes after, if it earns its place.
No throat-clearing. No 'it is worth noting,' no 'this is not just about X it is about Y,' no 'the question is,' no 'a functioning democracy requires.' If a sentence explains why the next sentence matters, cut the first one.
No analytical voice. Do not step back and comment on patterns, trends or what things 'suggest.' Stay in the story. Trust the reader to see the pattern.
No parallel constructions. Do not write 'Being X is not the same as being Y, and being Y is not the same as being Z.' One statement per sentence. Move on.
Closers must be concrete, not clever. End on a fact, a quote, or a one-line verdict. Not a summary. Not a restatement of the opening.
Every claim must be sourced to a specific document, vote, quote, or published figure. If you cannot source it, do not include it.
Hedge contested claims with 'reportedly' or 'according to.' State confirmed facts flatly.

Length: 300 to 500 words per briefing. Minimum 300, hard maximum 500. Every sentence must carry a real fact, figure, quote, or named source. Do not pad to reach the minimum. If you cannot reach 300 words of genuinely sourced material, the story is too thin — pick a different one.

Story selection and diversity:
Pick three stories that reflect the genuine spread of the day's news across different parties, departments, and institutions. Do not default to whichever politician has generated the most headlines.
No more than ONE story per day about Nigel Farage or Reform UK. If they are the single biggest story, cover it once, then make the other two about entirely different subjects.
You will be given the headlines already covered in recent daily briefings. Do not lead again with the person or party that dominated recent days unless something genuinely significant and NEW has happened — a material development, not a fresh angle, reaction, or quote on the same event.
Aim for three different subjects. A good spread is one government or departmental story, one opposition or other-party story, and one institutional or accountability story (a committee, regulator, court, watchdog, or public body).

Before finalising, count the words in each body. If any is under 300, do not pad — add more sourced substance: another figure, a named source, the specific mechanism, and the most relevant public response or counterpoint to the story (which you must include anyway). If you still cannot reach 300 words of genuine reporting, replace the story with a meatier one. Never submit a briefing under 300 words.

Headlines: short, punchy, no colons, no subtitle format. Should work as a Reddit post title.

Within the body text, use single quotes for any quoted speech (she said 'we got it wrong') — never double quotes — so the JSON always parses cleanly.
Output ONLY a valid JSON array, with nothing before or after it: [{headline, body, sources}]. Exactly three briefings. Do not write any commentary, reasoning, or preamble outside the JSON.`;

// Second-pass fact-check. Each briefing is a single-source rewrite; before a draft
// is saved we automatically verify it against the original article and attach the
// result. Drafts still land unpublished for human review, but arrive pre-verified.
const VERIFY_SYSTEM = `You are a fact-checker for opengovt. Each briefing below is a single-source rewrite of an original reputable article, provided with its source URL(s). For EACH briefing, use web search to open the original source and verify four things:
1. facts_match — do the core facts and figures in the rewrite match the original source article exactly? Verify each claim against the public record generally, not only against the briefing's own listed sources; do not fail merely because a true claim is absent from that source list.
2. quotes_verbatim — is any quoted material verbatim (not paraphrased) and correctly attributed? If the briefing contains no direct quotes, pass with note "no direct quotes".
3. not_stale — has a real development since publication SUPERSEDED or contradicted the story (a correction, a status change, an event that overtook it)? A story that properly hedges a future or anticipated event ('on course to', 'expected to', 'if no other candidate comes forward') is NOT stale merely because that event has not happened yet — do not fail on those grounds. Fail only if a stated fact is now out of date or has been overtaken.
4. balanced — does the briefing omit a relevant, publicly available counterpoint or response that would make it one-sided? Pass = balanced or the counterpoint is included; fail = an available counterpoint is missing (say what).

Before flagging anything, read the ENTIRE briefing to the end. When you flag a point, quote the exact words from the briefing above that are wrong — copied, not reconstructed from memory. If you cannot quote the offending words verbatim from the briefing, do not raise the flag. For the balanced check specifically: if the counterpoint or response you think is missing already appears anywhere in the briefing (often in a later paragraph), the check PASSES.

Return ONLY a JSON array with one object per briefing, in the same order, no preamble:
[{"facts_match":{"pass":true,"note":"..."},"quotes_verbatim":{"pass":true,"note":"..."},"not_stale":{"pass":true,"note":"..."},"balanced":{"pass":true,"note":"..."}}]
Keep each note to one short sentence. Weigh two situations differently. If a source directly CONTRADICTS the briefing — a wrong figure, a misquote, a fabricated or misattributed quote, a superseded fact — mark it FAIL; this is the priority. If you simply could not locate a source but nothing contradicts the claim: for a DIRECT QUOTE attributed to a named person, search that person's, committee's, department's or the named outlet's own page directly before deciding, and if it is still unconfirmed mark FAIL (an unconfirmed direct quote is treated as a fabrication risk); for a BACKGROUND FACT that is not a quote — a historical event, a date, an established public record — mark PASS with a note beginning 'unconfirmed —' that says what still needs checking, rather than failing.`;

// Self-correction pass. A briefing that failed the fact-check on facts_match or
// balanced is sent back with the specific flagged points to fix — once.
const CORRECT_SYSTEM = `You are a sub-editor for opengovt correcting a single daily briefing that failed an automated fact-check. Fix ONLY the flagged problems, keeping the same story and the same house style:
Tabloid rhythm. Short sentences and paragraphs. Lead with the punch. No throat-clearing, no analytical voice, no parallel constructions. Closers concrete, not clever.
Every sentence carries a real fact, figure, quote, or named source. 300 to 500 words, minimum 300 — reach it with genuine sourced substance and by including the relevant public counterpoint or response, never by padding.
In the body, use single quotes for any quoted speech (she said 'we got it wrong'), never double quotes, so the JSON parses cleanly.
For each flagged problem: if it is a factual error, correct it to match the source exactly; if it is one-sidedness or a missing counterpoint, add the relevant publicly available response or counterpoint; if it is a misquote, fix it to the verbatim wording or remove the quotation. Use web search to confirm the correct facts and to find the counterpoint.
Output ONLY a valid JSON object, nothing before or after it: {"headline":"...","body":"...","sources":[...]}.`;

const MODEL = 'claude-sonnet-4-6';

// PIPELINE PAUSED 2026-07-15 to stop Anthropic credit spend. While false, both
// the cron GET and the verify-test POST no-op WITHOUT calling Anthropic. The
// cron schedule was also removed from vercel.json. TO RE-ENABLE: set this to
// true AND re-add { "path": "/api/cron/daily-briefings", "schedule": "0 6 * * *" }
// to the "crons" array in vercel.json, then redeploy. No other code was changed.
const PIPELINE_ENABLED = false;

function ukDate(): string {
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function slug(): string {
  return randomUUID().replace(/-/g, '').slice(0, 10);
}

interface Briefing { headline: string; body: string; sources: unknown }

function parseBriefings(text: string): Briefing[] {
  let jsonStr = text.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    jsonStr = fence[1].trim();
  } else {
    const s = text.indexOf('[');
    const e = text.lastIndexOf(']');
    if (s >= 0 && e > s) jsonStr = text.slice(s, e + 1);
  }
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error('Model output was not a JSON array');
  return parsed
    .filter((b) => b && typeof b.headline === 'string' && typeof b.body === 'string')
    .map((b) => ({ headline: b.headline.trim(), body: b.body.trim(), sources: b.sources ?? null }));
}

// Count briefings that centre on Farage / Reform UK — a light programmatic guard
// behind the prompt rule, surfaced to the human reviewer (does not block).
function farageReformCount(briefings: Briefing[]): number {
  const re = /\b(farage|reform uk)\b/i;
  return briefings.filter((b) => re.test(`${b.headline} ${b.body}`)).length;
}

// Automated pre-publication fact-check: one batched call over all three briefings,
// with web search, returning a verification object per briefing (same order).
async function verifyBriefings(key: string, briefings: Briefing[]): Promise<Array<unknown> | null> {
  const payload = briefings
    .map((b, i) => `Briefing ${i + 1}:\nHeadline: ${b.headline}\n\nBody:\n${b.body}\n\nSources: ${JSON.stringify(b.sources)}`)
    .join('\n\n----------\n\n');
  let j: { content?: Array<{ type: string; text?: string }>; error?: unknown };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 6000,
        system: VERIFY_SYSTEM,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 9 }],
        messages: [{ role: 'user', content: payload }],
      }),
    });
    j = await r.json();
  } catch {
    return null;
  }
  if (!j || j.error) return null;
  const text = (j.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n');
  // Robust extraction: prefer a fenced array, else find the JSON array that
  // contains "facts_match" and bracket-match its bounds (ignores stray '[' in
  // any search narration the model emits before the JSON).
  const candidates: string[] = [];
  const fence = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (fence) candidates.push(fence[1]);
  const anchor = text.indexOf('"facts_match"');
  if (anchor >= 0) {
    const start = text.lastIndexOf('[', anchor);
    if (start >= 0) {
      let depth = 0;
      for (let i = start; i < text.length; i++) {
        if (text[i] === '[') depth++;
        else if (text[i] === ']') {
          depth--;
          if (depth === 0) { candidates.push(text.slice(start, i + 1)); break; }
        }
      }
    }
  }
  const a = text.indexOf('['), e = text.lastIndexOf(']');
  if (a >= 0 && e > a) candidates.push(text.slice(a, e + 1));
  for (const cand of candidates) {
    try {
      const arr = JSON.parse(cand);
      if (Array.isArray(arr)) return arr;
    } catch { /* try next candidate */ }
  }
  return null;
}

// Does a verification object fail on a correctable dimension (facts or balance)?
function failsCorrectable(v: unknown): boolean {
  const c = v as Record<string, { pass?: boolean }> | null;
  return !!c && (c.facts_match?.pass === false || c.balanced?.pass === false);
}
// Autonomous-publish gate: every verification check must pass. A story that is
// clean on the initial check, or clears ALL checks after the one correction
// pass, publishes automatically; anything else stays an unpublished draft.
const CHECK_KEYS = ['facts_match', 'quotes_verbatim', 'not_stale', 'balanced'] as const;
function allChecksPass(v: unknown): boolean {
  const c = v as Record<string, { pass?: boolean }> | null;
  if (!c || typeof c !== 'object') return false;
  return CHECK_KEYS.every((k) => c[k]?.pass === true);
}
// Render the failing points of a verification object as instructions to fix.
function flaggedPoints(v: unknown): string {
  const c = v as Record<string, { pass?: boolean; note?: string }>;
  return ['facts_match', 'quotes_verbatim', 'not_stale', 'balanced']
    .filter((k) => c[k] && c[k].pass === false)
    .map((k) => `- ${k}: ${c[k].note ?? ''}`)
    .join('\n');
}

function parseOneBriefing(text: string): Briefing | null {
  try {
    let s = text.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1].trim();
    else {
      const a = text.indexOf('{');
      const e = text.lastIndexOf('}');
      if (a >= 0 && e > a) s = text.slice(a, e + 1);
    }
    const o = JSON.parse(s);
    if (o && typeof o.headline === 'string' && typeof o.body === 'string') {
      return { headline: o.headline.trim(), body: o.body.trim(), sources: o.sources ?? null };
    }
    return null;
  } catch {
    return null;
  }
}

// One correction pass for a single briefing, given its flagged points.
async function correctBriefing(key: string, b: Briefing, points: string): Promise<Briefing | null> {
  const user =
    `Briefing to correct:\nHeadline: ${b.headline}\n\nBody:\n${b.body}\n\nSources: ${JSON.stringify(b.sources)}\n\n` +
    `The automated fact-check flagged these problems — fix each one:\n${points}\n\nOutput only the corrected JSON object.`;
  let j: { content?: Array<{ type: string; text?: string }>; error?: unknown };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: CORRECT_SYSTEM,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
        messages: [{ role: 'user', content: user }],
      }),
    });
    j = await r.json();
  } catch {
    return null;
  }
  if (!j || j.error) return null;
  const text = (j.content ?? []).filter((x) => x.type === 'text').map((x) => x.text ?? '').join('\n');
  return parseOneBriefing(text);
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!PIPELINE_ENABLED) {
    return NextResponse.json(
      { ok: false, paused: true, message: 'Daily-briefings pipeline is paused (PIPELINE_ENABLED=false). No generation, verification, correction or publishing runs; no Anthropic calls made.' },
      { status: 200 },
    );
  }

  // Dry-run preview: generate + verify but do NOT persist or email. Returns the
  // full briefings, word counts, verification and diversity flag for review.
  const preview = new URL(req.url).searchParams.get('preview') === '1';

  // Single daily cron (06:00 UTC = 07:00 UK in summer, 06:00 UK in winter). No
  // UK-hour guard: with one schedule the job simply runs when the cron fires, so
  // it can no longer skip itself across the BST/GMT switch. ?test=1 still works
  // as a manual trigger (auth required).

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 500 });

  // 0. Recent-coverage context for the diversity rule: the last 8 days of
  // briefing headlines, so the model can avoid repeating the dominant subject.
  const since = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(Date.now() - 8 * 86400000));
  const { data: recentRows } = await supabaseAdmin
    .from('briefings')
    .select('headline, run_date')
    .gte('run_date', since)
    .order('run_date', { ascending: false })
    .limit(40);
  const recentList = (recentRows ?? []).map((r) => `- [${r.run_date}] ${r.headline}`).join('\n') || '(none on record)';
  const userMessage =
    "Produce today's three briefings now, following the rules exactly.\n\n" +
    'Headlines already covered in recent daily briefings — apply the diversity rule, and do not let the same person or party dominate again unless something genuinely new and material has happened:\n' +
    recentList +
    '\n\nOutput only the JSON array, no preamble.';

  // 1 & 2. Generate with web search, then parse. Retry once on a parse failure —
  // a single stray unescaped quote in one body must not cost the whole day's run.
  async function generateRaw(): Promise<string> {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    const j: { content?: Array<{ type: string; text?: string }>; error?: { message?: string } } = await r.json();
    if (j.error) throw new Error(j.error.message || 'anthropic_error');
    return (j.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n');
  }

  let briefings: Briefing[] | null = null;
  let lastRaw = '';
  let lastErr = '';
  for (let attempt = 0; attempt < 2 && !briefings; attempt++) {
    try {
      lastRaw = await generateRaw();
    } catch (e) {
      return NextResponse.json({ error: 'anthropic_error', detail: e instanceof Error ? e.message : String(e) }, { status: 502 });
    }
    try {
      const parsed = parseBriefings(lastRaw);
      if (parsed.length > 0) briefings = parsed;
      else lastErr = 'no_briefings_parsed';
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  if (!briefings) {
    return NextResponse.json({ error: 'parse_failed', detail: lastErr, rawPreview: lastRaw.slice(0, 500) }, { status: 502 });
  }

  const top3 = briefings.slice(0, 3);

  // 2b. Automatic pre-publication fact-check (batched, web search).
  const initialChecks = await verifyBriefings(key, top3);

  // 2c. Self-correction: any story failing facts_match or balanced gets ONE
  // correction pass (run in parallel), then a single batched re-verification.
  // Anything still failing after that is saved flagged for manual review — no
  // further looping.
  const needIdx = initialChecks ? top3.map((_, i) => i).filter((i) => failsCorrectable(initialChecks[i])) : [];
  const corrections = await Promise.all(
    needIdx.map((i) => correctBriefing(key, top3[i], flaggedPoints(initialChecks![i])).then((c) => ({ i, c }))),
  );
  const correctedById = new Map<number, Briefing>();
  for (const { i, c } of corrections) if (c) correctedById.set(i, c);

  const reIdx = [...correctedById.keys()];
  const reChecks = reIdx.length ? await verifyBriefings(key, reIdx.map((i) => correctedById.get(i)!)) : null;

  const finalBriefings: Briefing[] = top3.map((b, i) => correctedById.get(i) ?? b);
  const finalChecks = top3.map((_, i) => {
    if (correctedById.has(i)) {
      const pos = reIdx.indexOf(i);
      return (reChecks && reChecks[pos]) ?? (initialChecks ? initialChecks[i] : null);
    }
    return initialChecks ? initialChecks[i] : null;
  });
  const correctionSummary = needIdx.map((i) => ({
    index: i,
    fixedPoints: flaggedPoints(initialChecks![i]).split('\n').filter(Boolean),
    corrected: correctedById.has(i),
    stillFailing: failsCorrectable(finalChecks[i]),
  }));

  const farageCount = farageReformCount(finalBriefings);
  const wc = (s: string) => (s.trim().match(/\S+/g) || []).length;

  if (preview) {
    return NextResponse.json({
      preview: true,
      count: finalBriefings.length,
      farageReformStories: farageCount,
      diversityFlag: farageCount > 1 ? 'MORE THAN ONE FARAGE/REFORM STORY — review' : 'ok',
      correctionsAttempted: needIdx.length,
      correctionsCleared: correctionSummary.filter((c) => c.corrected && !c.stillFailing).length,
      wouldPublish: finalChecks.filter(allChecksPass).length,
      wouldStayDraft: finalChecks.filter((v) => !allChecksPass(v)).length,
      corrections: correctionSummary,
      briefings: finalBriefings.map((b, i) => ({
        headline: b.headline,
        words: wc(b.body),
        body: b.body,
        sources: b.sources,
        corrected: correctedById.has(i),
        wouldPublish: allChecksPass(finalChecks[i]),
        initialVerification: (initialChecks && initialChecks[i]) ?? { error: 'verification unavailable' },
        finalVerification: finalChecks[i] ?? { error: 'verification unavailable' },
        stillFailing: failsCorrectable(finalChecks[i]),
      })),
    });
  }

  // 3. Persist. Autonomous publishing: a story that passes every verification
  // check (clean initially, or cleared after the one correction pass) is
  // published immediately. Anything still failing any check stays an
  // unpublished draft flagged for manual review.
  const runDate = ukDate();
  const nowIso = new Date().toISOString();
  const saved: { headline: string; slug: string; published: boolean }[] = [];
  for (let i = 0; i < finalBriefings.length; i++) {
    const b = finalBriefings[i];
    const s = slug();
    const publishNow = allChecksPass(finalChecks[i]);
    const stored = {
      ...((finalChecks[i] as Record<string, unknown> | null) ?? {}),
      _corrected: correctedById.has(i),
      _published: publishNow,
      _needs_review: !publishNow,
      ...(correctedById.has(i) ? { _initial: initialChecks ? initialChecks[i] : null } : {}),
    };
    const { error } = await supabaseAdmin.from('briefings').insert({
      slug: s,
      headline: b.headline,
      body: b.body,
      sources: b.sources,
      verification: stored,
      is_published: publishNow,
      published_at: publishNow ? nowIso : null,
      model: MODEL,
      run_date: runDate,
    });
    if (!error) saved.push({ headline: b.headline, slug: s, published: publishNow });
  }

  if (saved.length === 0) {
    return NextResponse.json({ error: 'db_insert_failed' }, { status: 500 });
  }

  // 4. Revalidate the index (drafts aren't listed, but keeps it fresh) and email for review.
  revalidatePath('/briefings');
  const emailResult = await sendBriefingNotification(saved);

  const publishedSlugs = saved.filter((s) => s.published).map((s) => s.slug);
  const draftSlugs = saved.filter((s) => !s.published).map((s) => s.slug);
  return NextResponse.json({
    ok: true,
    count: saved.length,
    runDate,
    publishedCount: publishedSlugs.length,
    draftCount: draftSlugs.length,
    publishedSlugs,
    draftSlugs,
    verificationAttached: Array.isArray(initialChecks),
    correctionsAttempted: needIdx.length,
    correctionsCleared: correctionSummary.filter((c) => c.corrected && !c.stillFailing).length,
    farageReformStories: farageCount,
    diversityFlag: farageCount > 1 ? 'MORE THAN ONE FARAGE/REFORM STORY — review' : 'ok',
    email: emailResult,
  });
}

// Verify-only test harness. Auth-gated, no DB writes, no publishing. POST a
// { briefings: [{headline, body, sources}] } payload and it runs the current
// VERIFY_SYSTEM checks and returns them — used to test prompt changes against
// specific drafts (and deliberately-fabricated cases) without a full run.
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!PIPELINE_ENABLED) {
    return NextResponse.json({ ok: false, paused: true, message: 'Daily-briefings verify-test is paused (PIPELINE_ENABLED=false).' }, { status: 200 });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 500 });
  let payload: { briefings?: Briefing[] };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }
  const briefings = (payload.briefings ?? []).filter((b) => b && typeof b.body === 'string').slice(0, 6);
  if (!briefings.length) return NextResponse.json({ error: 'no_briefings' }, { status: 400 });

  const checks = await verifyBriefings(key, briefings);
  return NextResponse.json({
    verifyTest: true,
    results: briefings.map((b, i) => ({
      headline: b.headline,
      checks: (checks && checks[i]) ?? { error: 'verification unavailable' },
    })),
  });
}
