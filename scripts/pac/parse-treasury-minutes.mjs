#!/usr/bin/env node
// Parse HM Treasury "Treasury Minutes" (the government's responses to the Committee of Public Accounts) and the
// Treasury Minutes Progress Reports into JSON, with per document checks (owner, 29 Oct 2026, "go stage 2").
// Source: GOV.UK, Open Government Licence v3.0.
//
//   node scripts/pac/parse-treasury-minutes.mjs --manifest <manifest.json> --out <parsed.json> [--checks <checks.txt>]
//
// The manifest is a JSON array of { file, url, title, published_on, pages, sha256, fetched_at } (one per PDF). The
// output holds every document with its reports, recommendations and checks; a document that fails a structural check
// (its contents list against the reports parsed, or gaps or duplicates in numbering) is marked excluded, with the
// reasons, and the loader (load-treasury-minutes.mjs) skips it. Nothing is guessed:
//   - a target date is read as a month only when it is a date ("Summer 2027", "by end March 2029, in line with ...");
//     a target written as a sentence that does not start with a date is kept as written, with no month;
//   - every date kept as written but not read, and every response not recognised, sets needs_review.
// Months are the END of the period named, so a target counts as passed only once the whole period is over:
//   Spring -> May, Summer -> August, Autumn -> November, Winter YYYY -> February YYYY+1, early -> April, mid -> July,
//   late / end / during / a bare year -> December.
// The session that began in July 2024 is written "2024-25" in documents from 2025 and "2024-26" after it was
// extended; both are stored as 2024-26, so one report is one row.

import { readFileSync, writeFileSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// ---------- text with layout kept (about pdftotext -layout): pieces grouped into lines by y, joined by x gaps
export async function extractPages(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    const lines = new Map();
    for (const it of items) {
      if (!it.str) continue;
      const y = Math.round(it.transform[5] / 2) * 2;
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y).push({ x: it.transform[4], s: it.str, w: it.width, h: Math.abs(it.transform[3]) || 10 });
    }
    pages.push([...lines.entries()].sort((a, b) => b[0] - a[0]).map(([, parts]) => {
      parts.sort((a, b) => a.x - b.x);
      let line = ' '.repeat(Math.max(0, Math.round(parts[0].x / 4.5) - 10)), end = null;
      for (const p of parts) {
        if (end !== null) {
          const gap = p.x - end;
          if (gap > p.h * 2.5) line = line.replace(/ +$/, '') + ' '.repeat(Math.max(3, Math.round(gap / 4.5)));
          else if (gap > p.h * 0.18 && !line.endsWith(' ') && !p.s.startsWith(' ')) line += ' ';
        }
        line += p.s; end = p.x + p.w;
      }
      return line.replace(/(\S) {2}(?=\S)/g, '$1 ').replace(/\s+$/, '');
    }).join('\n'));
  }
  return pages;
}

// ---------- helpers
const clean = (s) => s.replace(/\s+/g, ' ').replace(/ ([,.;:])/g, '$1').trim();
export const normaliseSession = (s) => { const t = s.replace(/–/g, '-'); return t === '2024-25' ? '2024-26' : t; };

// Lines with their 1 based line number and PDF page; page numbers and blank lines dropped.
function toLines(pages) {
  const out = [];
  let n = 0;
  pages.forEach((text, p) => {
    for (const raw of text.split('\n')) {
      n++;
      if (raw.trim() === '' || /^\s*\d{1,3}\s*$/.test(raw)) continue;
      out.push({ n, page: p + 1, text: raw });
    }
  });
  return out;
}

const UNITS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18,
  nineteenth: 19, twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60, seventieth: 70, eightieth: 80,
  ninetieth: 90, hundredth: 100 };
const CARD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
export function ordinal(words) {
  let total = 0;
  for (const w of words.toLowerCase().replace(/-/g, ' ').split(/\s+/)) {
    if (w === 'and' || !w) continue;
    if (w === 'hundred' || w === 'hundredth') { total = (total || 1) * 100; continue; }
    if (UNITS[w] !== undefined) total += UNITS[w];
    else if (CARD[w] !== undefined) total += CARD[w];
    else return null;
  }
  return total || null;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_OR_SEASON = '(?:january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|winter)';
// A date as written -> { year, month, precision } (month = end of the period), or null when it is not a date.
export function parseDate(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/[–-]\s*future updates.*$/, '').replace(/[.,]$/, '').trim();
  let m;
  if (/^every\b|^to be advised|^tba\b|^tbc$/.test(s)) return null;
  const leadsWithDate = new RegExp(`^(?:by\\s+(?:the\\s+)?end(?:\\s+of)?\\s+|by\\s+|in\\s+|end(?:\\s+of)?\\s+)?${MONTH_OR_SEASON}\\s+\\d{4}\\b`).test(s)
    || /^(?:by\s+)?(?:the\s+)?(?:end of|end|early|mid|late)\s+\d{4}\b/.test(s);
  if (s.split(/\s+/).length > 6 && !leadsWithDate) return null;
  const monthYear = [...s.matchAll(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/g)];
  if (monthYear.length) { m = monthYear[leadsWithDate ? 0 : monthYear.length - 1]; return { year: +m[2], month: MONTHS.indexOf(m[1]) + 1, precision: 'month' }; }
  if ((m = s.match(/\b(spring|summer|autumn|winter)\s+(\d{4})\b/))) {
    return { year: +m[2] + (m[1] === 'winter' ? 1 : 0), month: { spring: 5, summer: 8, autumn: 11, winter: 2 }[m[1]], precision: 'season' };
  }
  if ((m = s.match(/\b(early|mid|late|end of|end|during|tbc|by end of|by the end of)\s+(\d{4})\b/))) {
    return { year: +m[2], month: { early: 4, mid: 7 }[m[1]] ?? 12, precision: m[1] === 'tbc' ? 'year (tbc)' : 'part of year' };
  }
  if ((m = s.match(/^(?:by |in |ongoing )?(\d{4})$/))) return { year: +m[1], month: 12, precision: 'year' };
  return null;
}
export const monthDate = (d) => (d ? `${d.year}-${String(d.month).padStart(2, '0')}-01` : null);

// "The government agrees with the Committee's recommendation", also "The profession ...", "notes", "partially agrees".
export function responseOf(text) {
  const m = text.match(/\bThe (government|profession|department|BBC|Treasury|Cabinet Office|[A-Z][\w&]+) ((?:\w+ ){0,3}?)(agrees|agree|disagrees|disagree|notes|accepts|rejects)( in part)? (?:with )?(?:the |this )?(?:Committee['’]?s |committee['’]?s )?recommendations?/i);
  if (!m) {
    // Not agree, partly, disagree or notes: keep the government's own words (the first sentence) when it is a
    // statement about the recommendation ("The government is considering this recommendation").
    const first = (text.split('\n')[0] ?? '').replace(/^\d+\.\d+\s+/, '');
    const sentence = first.match(/^[^.]*\./)?.[0] ?? first;
    if (/\b(recommendations?|report)\b/i.test(sentence) && /\b(government|BBC|department|profession|Committee)/.test(sentence) && /\b(consider\w*|implemented|superseded|not a matter|agrees?|keeping)\b/i.test(sentence)) return { kind: 'as_worded', as_worded: clean(sentence), by: null };
    return null;
  }
  const words = clean(`${m[2]}${m[3]}${m[4] ?? ''}`);
  const kind = /disagree|reject/i.test(m[3]) ? 'disagree' : /\bnotes\b/i.test(m[3]) ? 'notes' : /\bpart/i.test(words) ? 'partly' : 'agree';
  return { kind, as_worded: words, by: m[1].toLowerCase() };
}

// ---------- recommendations inside one report
const CONC = /^\s*(\d+)\s*[.:]\s*PAC conclusion\s*:?\s*(.*)$/i;
const REC = /^\s*(\d+)\s*([a-z])?\s*[.:]?\s*PAC recommendation\s*:?\s*(.*)$/i;
const PARA = /^\s*(\d+)(?:\.|\s)(\d{1,2})\.?\s+([A-Z(‘'"“•].*)$/;
// Status lines start with a capital (so "... the original target implementation date." in prose is not one).
const STATUS = /^\s*(Original [Tt]arget [Ii]mplementation [Dd]ates?|Revised [Tt]arget [Ii]mplementation [Dd]ates?|Target [Ii]mplementation(?: [Dd]ates?)?|Recommendation [Ii]mplemented)\s*:?\s*(.*)$/;

export function parseRecommendations(lines) {
  const items = [];
  for (const l of lines) {
    let m;
    if ((m = l.text.match(CONC))) items.push({ kind: 'conc', num: m[1], text: m[2], n: l.n, page: l.page });
    else if ((m = l.text.match(REC))) items.push({ kind: 'rec', num: m[1], letter: (m[2] || '').toLowerCase(), text: m[3], n: l.n, page: l.page });
    else if ((m = l.text.match(STATUS))) {
      const label = m[1].toLowerCase().replace(/dates$/, 'date').replace(/^target implementation$/, 'target implementation date');
      const value = clean(m[2]).replace(/^[.:;\s]+/, '');
      // "Target implementation date: Recommendation implemented" says the recommendation is implemented.
      if (label !== 'recommendation implemented' && /^recommendation implemented\b/i.test(value)) items.push({ kind: 'status', label: 'recommendation implemented', value: clean(value.replace(/^recommendation implemented\s*:?\s*/i, '')), n: l.n });
      else items.push({ kind: 'status', label, value, n: l.n });
    }
    else if ((m = l.text.match(PARA))) items.push({ kind: 'para', num: m[1], sub: m[2], text: m[3], n: l.n });
    else if (items.length) {
      const last = items[items.length - 1];
      if (last.kind === 'status') {
        // A wrapped date value: read on (up to three lines) until it holds a year.
        // A wrapped value (the line right after a status line, when the value has not ended with a full stop).
        const open = last.value && !/[.)]$/.test(last.value) && (last.label !== 'recommendation implemented' || /[,]$/.test(last.value));
        if (open && (last.wrapped ?? 0) < 3) { last.value = clean(`${last.value} ${l.text}`); last.wrapped = (last.wrapped ?? 0) + 1; }
        else items.push({ kind: 'para', num: null, text: l.text, n: l.n });
      } else last.text += `\n${l.text}`;
    }
  }
  const recs = [];
  let conclusion = null, pending = [], current = null;
  for (const it of items) {
    if (it.kind === 'conc') { current = null; pending = []; conclusion = { num: it.num, text: clean(it.text) }; continue; }
    if (it.kind === 'rec') {
      if (current) { current = null; pending = []; }
      const base = { line: it.n, page: it.page, conclusion: conclusion && conclusion.num === it.num ? conclusion.text : null };
      const text = it.text.trim();
      // "(a) ... (b) ..." under one unlettered recommendation: one record per letter, sharing the response.
      const parts = !it.letter && /^\(a\)/.test(text) ? text.split(/\n?(?=\([a-z]\)\s)/).filter((p) => /^\([a-z]\)/.test(p)) : null;
      if (parts && parts.length > 1) for (const p of parts) { const r = { ...base, number: `${it.num}${p[1]}`, recommendation: clean(p.slice(3)) }; recs.push(r); pending.push(r); }
      else { const r = { ...base, number: `${it.num}${it.letter}`, recommendation: clean(text) }; recs.push(r); pending.push(r); }
      continue;
    }
    if (!pending.length) continue;
    if (!current) { current = { paragraphs: [], statuses: [] }; for (const r of pending) r.block = current; }
    if (it.kind === 'status') current.statuses.push({ label: it.label, value: it.value });
    else if (it.kind === 'para' && it.num !== null) current.paragraphs.push(`${it.num}.${it.sub} ${clean(it.text)}`);
    else if (current.paragraphs.length) current.paragraphs[current.paragraphs.length - 1] += ` ${clean(it.text)}`;
    current.last = it.n;
  }
  return recs.map((r) => {
    const b = r.block;
    delete r.block;
    const get = (label) => b?.statuses.find((s) => s.label === label)?.value ?? null;
    const dated = (v) => (v === null ? null : { as_written: v, parsed: parseDate(v) });
    const impl = b?.statuses.find((s) => s.label === 'recommendation implemented');
    return {
      ...r,
      response: b ? responseOf(b.paragraphs.join('\n')) : null,
      paragraphs: b?.paragraphs ?? [],
      implemented: impl ? { as_written: impl.value || null, parsed: parseDate(impl.value) } : null,
      target: dated(get('target implementation date')),
      original_target: dated(get('original target implementation date')),
      revised_target: dated(get('revised target implementation date')),
      raw_lines: [r.line, b?.last ?? r.line],
    };
  });
}

// ---------- report sections
const REPORT = /^\s*([A-Z][A-Za-z -]+?) [Rr]eport of [Ss]ession\s+(\d{4}(?:[-–]\d{2,4})?)\s*$/;
function splitReports(lines) {
  const starts = [];
  lines.forEach((l, i) => { const m = l.text.match(REPORT); if (m && ordinal(m[1])) starts.push({ i, number: ordinal(m[1]), session: normaliseSession(m[2]) }); });
  return starts.map((s, k) => {
    const body = lines.slice(s.i + 1, k + 1 < starts.length ? starts[k + 1].i : lines.length);
    const introAt = body.findIndex((l) => /^\s*(Introduction from the Committee|Relevant reports|Government response to the Committee|Update to the (Government|BBC)['’s]* response)/i.test(l.text));
    // Heading lines: up to the introduction (or the first line of prose, 85 characters or more), at most 4.
    const header = [];
    for (const l of body.slice(0, introAt >= 0 ? introAt : 4)) { if (header.length === 4 || clean(l.text).length >= 85) break; header.push(clean(l.text)); }
    return { ...s, header, body, line: lines[s.i].n, page: lines[s.i].page };
  });
}
// A section's heading lines are its department(s) then its title; the title is the last 1 to 3 lines, as many as best
// match the title listed for it (a document's own contents list can be wrong, so the heading wins).
const words = (x) => new Set(x.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean));
export const overlap = (a, b) => { const x = words(a), y = words(b); return [...x].filter((w) => y.has(w)).length / Math.max(x.size, y.size, 1); };
function titleAndDepartments(header, listedTitle) {
  let k = 1;
  if (listedTitle) for (let n = 2; n <= Math.min(3, header.length - 1); n++) if (overlap(header.slice(-n).join(' '), listedTitle) > overlap(header.slice(-k).join(' '), listedTitle) + 0.05) k = n;
  return { title: clean(header.slice(-k).join(' ')), departments: header.slice(0, header.length - k) };
}
const elsewhere = (body) => /can\s+be\s+found\s+on\s+the\s+Committee/i.test(body.map((l) => l.text).join(' '));

function parseTreasuryMinute(lines) {
  const first = lines.findIndex((l) => REPORT.test(l.text));
  const at = lines.findIndex((l) => /^\s*Report Title\s+Page\s*$/.test(l.text));
  const contents = [];
  for (const l of lines.slice(at + 1, first)) {
    const t = clean(l.text);
    let m;
    if ((m = t.match(/^([A-Za-z -]+?) report:?$/i)) && ordinal(m[1])) contents.push({ number: ordinal(m[1]), title: null, departments: [] });
    else if (contents.length && !contents[contents.length - 1].title && (m = t.match(/^(.*\S)\s+(\d+)$/))) contents[contents.length - 1].title = m[1];
    else if (contents.length) contents[contents.length - 1].departments.push(t);
  }
  // Contents entries and sections in the same order (a document may cover two sessions with repeated numbers).
  const sections = splitReports(lines);
  const reports = sections.map((r, k) => {
    const c = contents[k] && contents[k].number === r.number ? contents[k] : contents.find((x) => x.number === r.number);
    const { title, departments } = r.header.length > 1 ? titleAndDepartments(r.header, c?.title) : { title: c?.title ?? r.header[0], departments: c?.departments ?? [] };
    return { session: r.session, report_number: r.number, title, departments, contents_title: c?.title ?? null, contents_departments: c?.departments ?? null,
      page: r.page, line: r.line, updates_elsewhere: false, body_text: r.body.map((l) => l.text).join('\n'), rec_headings: r.body.filter((l) => REC.test(l.text)).length,
      recommendations: parseRecommendations(r.body).map((x) => ({ ...x, status: x.implemented ? 'implemented' : x.target ? 'target' : null })) };
  });
  return { contents, reports };
}

function parseProgress(lines) {
  const SESSION = /Committee of Public Accounts: Session\s+(\d{4}(?:[-–]\d{2})?)\s*$/;
  const sessions = [];
  let cur = null, mode = null;
  const reportLines = [];
  for (const line of lines) {
    const t = line.text;
    let m;
    if ((m = t.match(SESSION))) { cur = { session: normaliseSession(m[1]), outstanding_list: [], completed_list: [] }; sessions.push(cur); mode = null; continue; }
    if (REPORT.test(t)) mode = 'reports';
    if (!cur) continue;
    if (/^\s*Updates on reports with outstanding recommendations/i.test(t)) { mode = 'outstanding'; continue; }
    if (/^\s*Reports completed/i.test(t)) { mode = 'completed'; continue; }
    if (/^\s*#?\s*Report Title(\s+Page)?\s*$/.test(t) || /^\s*#\s*$/.test(t)) continue;
    if (mode === 'outstanding' || mode === 'completed') {
      const list = mode === 'outstanding' ? cur.outstanding_list : cur.completed_list;
      if ((m = t.match(/^\s*(\d{1,3})\s+(.*\S)\s*$/))) {
        let title = m[2];
        const mm = mode === 'outstanding' && title.match(/^(.*\S)\s+(\d{1,3})$/);
        if (mm) title = mm[1];
        list.push({ report_number: +m[1], title: clean(title) });
      } else if (list.length) {
        let extra = clean(t);
        const mm = mode === 'outstanding' && extra.match(/^(.*\S)\s+(\d{1,3})$/);
        if (mm) extra = mm[1];
        if (/^[–-]\s*No recommendations/i.test(extra)) list[list.length - 1].note = extra.replace(/^[–-]\s*/, '');
        else list[list.length - 1].title = clean(`${list[list.length - 1].title} ${extra}`);
      }
    }
    if (mode === 'reports') reportLines.push(line);
  }
  const reports = splitReports(reportLines).map((r) => {
    const s = sessions.find((x) => x.session === r.session);
    const listed = s?.outstanding_list.find((x) => x.report_number === r.number) ?? s?.completed_list.find((x) => x.report_number === r.number);
    const { title, departments } = titleAndDepartments(r.header, listed?.title);
    const recs = parseRecommendations(r.body).map((x) => ({ ...x, status: x.implemented ? 'implemented' : 'outstanding' }));
    return { session: r.session, report_number: r.number, title, departments, contents_title: listed?.title ?? null,
      page: r.page, line: r.line, updates_elsewhere: recs.length === 0 && elsewhere(r.body), body_text: r.body.map((l) => l.text).join('\n'), rec_headings: r.body.filter((l) => REC.test(l.text)).length, recommendations: recs };
  });
  return { sessions, reports };
}

// ---------- checks (structural failures exclude the document)
function numberingProblems(recs, gaps) {
  const problems = [];
  const seen = new Set();
  for (const r of recs) { if (seen.has(r.number)) problems.push(`duplicate ${r.number}`); seen.add(r.number); }
  const tops = [...new Set(recs.map((r) => +r.number.match(/^\d+/)[0]))];
  if (gaps) for (let k = 1; k <= Math.max(0, ...tops); k++) if (!tops.includes(k)) problems.push(`gap at ${k}`);
  for (const t of tops) {
    const letters = recs.filter((r) => +r.number.match(/^\d+/)[0] === t).map((r) => r.number.replace(/^\d+/, '')).filter(Boolean);
    if (gaps) letters.forEach((l, i) => { if (l !== 'abcdefghijklmnop'[i]) problems.push(`${t}: letters ${letters.join(',')}`); });
    if (letters.length && recs.some((r) => r.number === String(t))) problems.push(`${t}: both lettered and unlettered`);
  }
  return [...new Set(problems)];
}

export function checkDocument(doc) {
  const structural = [], notes = [];
  // Every "PAC recommendation" heading in a section's text must have been read as one.
  for (const r of doc.reports) {
    const headings = r.body_text.split('\n').filter((t) => /PAC\s+[Rr]ecommendation\b/.test(t) && /^\s*\d/.test(t)).length;
    if (headings !== r.rec_headings) structural.push(`${r.session} report ${r.report_number}: ${headings} recommendation headings in the text, ${r.rec_headings} read`);
  }
  if (doc.kind === 'treasury_minute') {
    const want = doc.contents.map((c) => c.number).join(','), got = doc.reports.map((r) => r.report_number).join(',');
    if (want !== got) structural.push(`contents list (${want}) and reports parsed (${got}) differ`);
    for (const r of doc.reports) {
      const p = numberingProblems(r.recommendations, true);
      if (p.length) structural.push(`${r.session} report ${r.report_number} numbering: ${p.join('; ')}`);
      if (!r.recommendations.length) notes.push(`${r.session} report ${r.report_number} "${r.title}": no recommendations answered in this document`);
      if (r.contents_title && overlap(r.contents_title, r.title) < 0.5) notes.push(`${r.session} report ${r.report_number}: heading title "${r.title}", contents list says "${r.contents_title}" (heading used)`);
    }
  } else {
    for (const s of doc.sessions) {
      const sections = doc.reports.filter((r) => r.session === s.session);
      const listed = s.outstanding_list.map((x) => x.report_number);
      // A section not in the outstanding list is fine only for a completed report whose section points to the
      // Committee's website.
      const counted = sections.filter((r) => !(r.updates_elsewhere && !listed.includes(r.report_number)));
      const got = counted.map((r) => r.report_number);
      const missing = listed.filter((n) => !got.includes(n)), extra = got.filter((n) => !listed.includes(n));
      if (missing.length || extra.length) structural.push(`session ${s.session}: outstanding list and sections differ (missing ${missing.join(',') || 'none'}, not listed ${extra.join(',') || 'none'})`);
      for (const r of sections) {
        const p = numberingProblems(r.recommendations, false);
        if (p.length) structural.push(`${r.session} report ${r.report_number} numbering: ${p.join('; ')}`);
        if (!r.recommendations.length && !r.updates_elsewhere) structural.push(`${r.session} report ${r.report_number}: no recommendations parsed`);
        if (r.updates_elsewhere) notes.push(`${r.session} report ${r.report_number} "${r.title}": no recommendations here (updates on the Committee's website)`);
      }
    }
  }
  const review = [];
  for (const r of doc.reports) for (const x of r.recommendations) {
    const why = [];
    for (const k of ['target', 'original_target', 'revised_target']) if (x[k] && !x[k].parsed) why.push(`${k.replace('_', ' ')} not a date: "${x[k].as_written}"`);
    // An implemented line with words but no date ("(subject to NAO approval)") is kept as written; only one that names
    // a year or month and cannot be read needs review.
    if (x.implemented?.as_written && !x.implemented.parsed && /\b\d{4}\b|january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|winter/i.test(x.implemented.as_written)) why.push(`implemented date not read: "${x.implemented.as_written}"`);
    if (!x.response) why.push('response not recognised');
    if (!x.status && !['disagree', 'notes'].includes(x.response?.kind)) why.push('no target, implemented or outstanding line');
    x.needs_review = why.length > 0;
    x.review_reasons = why;
    if (why.length) review.push({ session: r.session, report: r.report_number, rec: x.number, reasons: why });
  }
  return { structural, notes, review, excluded: structural.length > 0 };
}

export async function parseFile(entry) {
  const pages = await extractPages(entry.file);
  const lines = toLines(pages);
  const head = pages.slice(0, 3).join('\n');
  const cp = head.match(/\bCP\s?(\d{3,4})\b/);
  const kind = /Progress\s+Report/i.test(pages[0]) ? 'progress_report' : 'treasury_minute';
  const body = kind === 'treasury_minute' ? parseTreasuryMinute(lines) : parseProgress(lines);
  const doc = { ...entry, kind, cp_number: cp ? `CP ${cp[1]}` : null, pages_parsed: pages.length, ...body };
  doc.checks = checkDocument(doc);
  if (!doc.cp_number) { doc.checks.structural.push('no CP number found'); doc.checks.excluded = true; }
  doc.raw_lines = lines;
  return doc;
}

// ---------- command line
async function main() {
  const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
  const manifest = arg('--manifest'), out = arg('--out'), checksFile = arg('--checks');
  if (!manifest || !out) { console.error('usage: node scripts/pac/parse-treasury-minutes.mjs --manifest <manifest.json> --out <parsed.json> [--checks <checks.txt>]'); process.exit(1); }
  const docs = [];
  for (const entry of JSON.parse(readFileSync(manifest, 'utf8'))) docs.push(await parseFile(entry));
  const say = [];
  for (const d of docs) {
    const recs = d.reports.flatMap((r) => r.recommendations);
    const dates = recs.flatMap((x) => ['target', 'original_target', 'revised_target', 'implemented'].map((k) => x[k]).filter((v) => v?.as_written));
    const failed = dates.filter((v) => !v.parsed);
    say.push(`${d.cp_number} ${d.kind} ${d.published_on} "${d.title}": ${d.checks.excluded ? 'EXCLUDED' : 'ok'}; ${d.reports.length} reports, ${recs.length} recommendations; dates ${dates.length}, read ${dates.length - failed.length}, not read ${failed.length}`);
    if (d.kind === 'treasury_minute') say.push(`  contents ${d.contents.length} (${d.contents.map((c) => c.number).join(',')}), parsed ${d.reports.length} (${d.reports.map((r) => `${r.session}/${r.report_number}`).join(',')})`);
    else for (const s of d.sessions) say.push(`  session ${s.session}: outstanding list ${s.outstanding_list.length}, sections ${d.reports.filter((r) => r.session === s.session).length}, completed list ${s.completed_list.length}`);
    for (const p of d.checks.structural) say.push(`  STRUCTURAL: ${p}`);
    for (const n of d.checks.notes) say.push(`  note: ${n}`);
    for (const r of d.checks.review) say.push(`  needs review: ${r.session} report ${r.report} rec ${r.rec}: ${r.reasons.join('; ')}`);
  }
  // Ten random recommendations (fixed seed) with the raw text, from documents that are not excluded.
  let seed = 20261029;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pool = docs.filter((d) => !d.checks.excluded).flatMap((d) => d.reports.flatMap((r) => r.recommendations.map((x) => ({ d, r, x }))));
  const picks = [];
  while (picks.length < Math.min(10, pool.length)) { const p = pool[Math.floor(rand() * pool.length)]; if (!picks.includes(p)) picks.push(p); }
  say.push('\nTEN RANDOM RECOMMENDATIONS');
  const short = (s, n = 160) => (s && s.length > n ? `${s.slice(0, n)}...` : s);
  picks.forEach(({ d, r, x }, i) => {
    say.push(`\n[${i + 1}] ${d.cp_number} (${d.published_on}) session ${r.session} report ${r.report_number} "${r.title}" (${r.departments.join('; ')}), rec ${x.number}, page ${x.page}`);
    say.push(`  conclusion: ${short(x.conclusion, 120)}`);
    say.push(`  recommendation: ${short(x.recommendation)}`);
    say.push(`  response: ${x.response?.kind} ("${x.response?.as_worded}"), status ${x.status}`);
    for (const k of ['target', 'original_target', 'revised_target', 'implemented']) if (x[k]) say.push(`  ${k}: "${x[k].as_written ?? ''}" -> ${monthDate(x[k].parsed)}`);
    say.push('  raw text:');
    const from = d.raw_lines.findIndex((l) => l.n >= x.raw_lines[0]);
    for (const l of d.raw_lines.slice(Math.max(0, from - 4), from + 14)) say.push(`    | ${l.text.trim()}`);
  });
  for (const d of docs) { delete d.raw_lines; for (const r of d.reports) delete r.body_text; }
  writeFileSync(out, JSON.stringify(docs, null, 1));
  if (checksFile) writeFileSync(checksFile, say.join('\n') + '\n');
  console.log(say.filter((l) => !l.startsWith('    |')).slice(0, 400).join('\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
