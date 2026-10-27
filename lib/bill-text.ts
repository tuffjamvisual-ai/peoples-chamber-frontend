// The text of a bill for /bills/[id]/full (owner, 27 Oct 2026): Parliament's latest HTML version of the bill, cleaned
// into the site's own markup, with a contents list of its clauses and schedules.
//
// Where the text comes from: the Bills API lists every publication of a bill. A "Bill" publication is one version of
// the bill text (as introduced, as amended in committee, as brought from the other House...), in PDF, HTML and XML,
// either as files served by the Bills API (bills-api.parliament.uk/.../Documents/{id}/Download) or as links to
// publications.parliament.uk. Amendment papers ("Lords Amendments" and the like) are publications of the same type but
// not the bill text, so they are left out. The latest version is the one with the newest date.
//
// publications.parliament.uk sits behind a Cloudflare challenge that answers a script with a "Just a moment" page; that
// answer is recognised and treated as "no HTML", so the page offers the PDF instead. We never try to get past it.
//
// Parliament's HTML (Akoma Ntoso, from Lawmaker) carries every page and line reference, a data-guid on every element
// and a hidden metadata block: a big bill is over 4 MB. Cleaning keeps the structure (parts, cross headings, clauses,
// subsections, paragraphs, schedules, quoted text, tables) in a few classes of our own and drops the rest, including any
// script, style, link or form.
import { parse, type HTMLElement, NodeType, type Node } from 'node-html-parser';
import { unstable_cache } from 'next/cache';

export type ApiFile = { id: number; filename?: string; contentType?: string; contentLength?: number };
export type ApiLink = { title?: string; url?: string; contentType?: string };
export type ApiPublication = {
  id: number; title?: string; displayDate?: string; house?: string;
  publicationType?: { name?: string }; links?: ApiLink[]; files?: ApiFile[];
};

export type TextSource = { url: string; viaBillsApi: boolean };
export type PdfSource = { url: string; bytes: number | null };
export type LatestText = { label: string; house: string | null; date: string | null; title: string; html: TextSource | null; pdf: PdfSource | null };

const NOT_TEXT = /amendment|reasons|marshalled|explanatory|consideration|selection of|proceedings/i;
// "Bill 131 2026-27 (as amended in Public Bill Committee) – html" -> "Bill 131 2026-27 (as amended in Public Bill Committee)"
export const versionTitle = (t: string) => t.replace(/\s*[-–]\s*(large print\s*[-–]\s*)?(pdf|html|xml)(\s+download)?\s*$/i, '').trim();
const isHtml = (ct?: string, url?: string) => /html/i.test(ct || '') || /\.html?$/i.test(url || '');
const isPdf = (ct?: string, url?: string) => /pdf/i.test(ct || '') || /\.pdf$/i.test(url || '');
const download = (pubId: number, fileId: number) => `https://bills-api.parliament.uk/api/v1/Publications/${pubId}/Documents/${fileId}/Download`;

// "(as amended in Public Bill Committee)" -> "As amended in Public Bill Committee"; "(introduced)" -> "As introduced".
function versionLabel(title: string, house: string | null): string {
  const m = title.match(/\(([^)]+)\)\s*$/) || title.match(/\(([^)]+)\)/);
  let v = (m ? m[1] : '').trim();
  if (/^introduced$/i.test(v)) v = 'as introduced';
  if (!v) v = 'latest version';
  const label = v.charAt(0).toUpperCase() + v.slice(1);
  // "As introduced" names its House; the other versions already say where they come from.
  if (/^as introduced$/i.test(v) && house) return `${label} in the House of ${house}`;
  return label;
}

// The latest version of the bill text, with its HTML (if any) and PDF.
export function latestText(pubs: ApiPublication[]): LatestText | null {
  const text = pubs.filter((p) => p.publicationType?.name === 'Bill' && !NOT_TEXT.test(p.title || ''));
  if (!text.length) return null;
  const newest = text.map((p) => (p.displayDate || '').slice(0, 10)).sort().pop()!;
  const latest = text.filter((p) => (p.displayDate || '').slice(0, 10) === newest);
  // A day can carry two versions (rare); keep the one with the most formats, so its HTML and PDF go together.
  const byVersion = new Map<string, ApiPublication[]>();
  for (const p of latest) byVersion.set(versionTitle(p.title || ''), [...(byVersion.get(versionTitle(p.title || '')) ?? []), p]);
  const [title, group] = [...byVersion.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  let html: TextSource | null = null;
  let pdf: PdfSource | null = null;
  for (const p of group) {
    const large = /large print/i.test(p.title || '');
    for (const f of p.files ?? []) {
      if (!html && isHtml(f.contentType, f.filename)) html = { url: download(p.id, f.id), viaBillsApi: true };
      if (!large && !pdf && isPdf(f.contentType, f.filename)) pdf = { url: download(p.id, f.id), bytes: f.contentLength ?? null };
    }
    for (const l of p.links ?? []) {
      if (!html && l.url && isHtml(l.contentType, l.url)) html = { url: l.url, viaBillsApi: false };
      if (!large && !pdf && l.url && isPdf(l.contentType, l.url)) pdf = { url: l.url, bytes: null };
    }
  }
  // Prefer the Bills API's own file over a publications.parliament.uk link when both exist.
  for (const p of group) for (const f of p.files ?? []) if (isHtml(f.contentType, f.filename)) html = { url: download(p.id, f.id), viaBillsApi: true };
  const house = group.find((p) => p.house)?.house ?? null;
  return { label: versionLabel(title, house && house !== 'Unassigned' ? house : null), house, date: newest || null, title, html, pdf };
}

// ---- cleaning ----
export type TocEntry = { id: string; kind: 'part' | 'chapter' | 'crossheading' | 'clause' | 'schedule'; num: string; heading: string; group: number };
export type CleanBill = { preamble: string; groups: { id: string; html: string; bytes: number }[]; toc: TocEntry[]; bytes: number };

const KEEP_TAGS = new Set(['section', 'div', 'p', 'h2', 'h3', 'h4', 'h5', 'blockquote', 'q', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'span', 'em', 'strong', 'i', 'b', 'sup', 'sub', 'abbr']);
const DROP_TAGS = new Set(['script', 'style', 'link', 'meta', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'noscript', 'img', 'svg', 'nav', 'header', 'footer']);
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function ourClass(cls: string): string | null {
  if (/\bprov1\b|\bsection\b.*\bprov1\b/.test(cls)) return 'bt-clause';
  if (/\bschedule\b/.test(cls)) return 'bt-schedule';
  if (/\bpart\b/.test(cls)) return 'bt-part';
  if (/\bchapter\b/.test(cls)) return 'bt-chapter';
  if (/\bcrossheading\b/.test(cls)) return 'bt-crossheading';
  if (/\bprov2\b|\bsubsection\b/.test(cls)) return 'bt-sub';
  if (/\bschProv1\b|\bparagraph\b/.test(cls)) return 'bt-sub';
  if (/\bpara\d\b|\bsubparagraph\b|\bschProv\d\b|\blevel\b/.test(cls)) return 'bt-para';
  if (/\bnum\b/.test(cls)) return 'bt-num';
  if (/\bheading\b/.test(cls)) return 'bt-heading';
  if (/\bdefinition\b/.test(cls)) return 'bt-def';
  if (/\bintro\b|\bwrapUp\b|\bcontent\b/.test(cls)) return 'bt-block';
  return null;
}

// Our anchor for an element Parliament gave an id: clause 12 -> clause-12, schedule 3 -> schedule-3, parts and
// cross headings keep a short form of their own id.
function ourId(id: string, cls: string | null): string | null {
  if (!id) return null;
  let m;
  if (cls === 'bt-clause' && (m = id.match(/^sec_(\d+[A-Z]*)$/i))) return `clause-${m[1]}`;
  if (/qstr|__/.test(id) && cls !== 'bt-clause') return null; // inside quoted text (an amendment) or a sub-element
  if (cls === 'bt-schedule' && (m = id.match(/^sch(?:ed)?_(\d+[A-Z]*)$/i))) return `schedule-${m[1]}`;
  if (cls === 'bt-part' || cls === 'bt-chapter' || cls === 'bt-crossheading') return `bt-${id.replace(/[^A-Za-z0-9_-]/g, '').toLowerCase()}`;
  return null;
}

function render(node: Node): string {
  if (node.nodeType === NodeType.TEXT_NODE) return esc((node as unknown as { rawText: string }).rawText.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))));
  if (node.nodeType !== NodeType.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (DROP_TAGS.has(tag)) return '';
  const cls = el.getAttribute('class') || '';
  if (/\bmeta\b|\bdisclaimer\b|authorialNote/.test(cls)) return '';
  if (tag === 'br') return ' ';
  const inner = el.childNodes.map(render).join('');
  if (tag === 'a' || tag === 'cite' || !KEEP_TAGS.has(tag)) return inner; // links into Parliament's tools, citations: text only
  const ours = ourClass(cls);
  // Page and line wrappers carry nothing but text.
  if (tag === 'span' && !ours) return inner;
  const id = ourId(el.getAttribute('id') || '', ours);
  const attrs = `${ours ? ` class="${ours}"` : ''}${id ? ` id="${id}"` : ''}`;
  if (tag === 'td' || tag === 'th') {
    const span = ['colspan', 'rowspan'].map((a) => (el.getAttribute(a) && /^\d{1,2}$/.test(el.getAttribute(a)!) ? ` ${a}="${el.getAttribute(a)}"` : '')).join('');
    return `<${tag}${attrs}${span}>${inner}</${tag}>`;
  }
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

const text = (el: HTMLElement | null) => (el ? el.text.replace(/\s+/g, ' ').trim() : '');

// Clean one bill's HTML. Groups are the body's top level sections (parts, or cross headings where a bill has no parts)
// and the schedules, so a big bill can be sent a group at a time.
export function cleanBillHtml(raw: string): CleanBill | null {
  const root = parse(raw.replace(/^﻿/, ''), { blockTextElements: { script: false, style: false, noscript: false, pre: true } });
  const bill = root.querySelector('span.bill') ?? root.querySelector('body');
  if (!bill) return null;
  const tops = bill.childNodes.filter((n) => n.nodeType === NodeType.ELEMENT_NODE) as HTMLElement[];
  const bodyEl = tops.find((n) => (n.getAttribute('class') || '').split(/\s+/).includes('body'));
  if (!bodyEl) return null;
  const preambleEl = tops.find((n) => (n.getAttribute('class') || '').split(/\s+/).includes('preamble'));
  const conclusions = tops.find((n) => (n.getAttribute('class') || '').split(/\s+/).includes('conclusions'));
  const elementsOf = (el: HTMLElement) => el.childNodes.filter((n) => n.nodeType === NodeType.ELEMENT_NODE) as HTMLElement[];
  // A group over SPLIT_BYTES (for example every schedule in one wrapper) is split into its children, so each loads on
  // its own; the back matter (Parliament's closing page: title, version, printing order, copyright) is one small
  // group at the end.
  const SPLIT_BYTES = 200_000;
  // One level only, and never inside a schedule, clause or part (each stays whole, with its heading and anchor).
  const split = (el: HTMLElement): HTMLElement[] => {
    const kids = elementsOf(el);
    const own = ourClass(el.getAttribute('class') || '');
    if (own && ['bt-schedule', 'bt-clause', 'bt-part', 'bt-chapter'].includes(own)) return [el];
    if (kids.length > 1 && el.outerHTML.length > SPLIT_BYTES * 2) return kids;
    return [el];
  };
  const groupEls: HTMLElement[] = elementsOf(bodyEl).flatMap(split).filter((g) => /[\p{L}\p{N}]/u.test(g.text));
  const toc: TocEntry[] = [];
  const groups = groupEls.map((g, i) => {
    // Contents entries for this group: its own heading (part, chapter, cross heading, schedule) and its clauses.
    const walk = (el: HTMLElement) => {
      const c = el.getAttribute('class') || '';
      const ours = ourClass(c);
      const id = ourId(el.getAttribute('id') || '', ours);
      if (id && ours && ['bt-part', 'bt-chapter', 'bt-crossheading', 'bt-clause', 'bt-schedule'].includes(ours)) {
        const h = el.childNodes.find((n) => n.nodeType === NodeType.ELEMENT_NODE && /^h\d$/i.test((n as HTMLElement).tagName)) as HTMLElement | undefined;
        const num = text(h?.querySelector('.num') ?? null);
        const heading = text(h?.querySelector('.heading') ?? null) || text(h ?? null).replace(num, '').trim();
        toc.push({ id, kind: ours.slice(3) as TocEntry['kind'], num, heading, group: i });
      }
      if (ours === 'bt-clause') return; // clauses hold no further contents entries
      for (const ch of el.childNodes) if (ch.nodeType === NodeType.ELEMENT_NODE) walk(ch as HTMLElement);
    };
    walk(g);
    const html = render(g).replace(/\s{2,}/g, ' ');
    return { id: `bt-group-${i}`, html, bytes: Buffer.byteLength(html) };
  });
  if (conclusions && /[\p{L}\p{N}]/u.test(conclusions.text)) {
    const html = `<div class="bt-back">${render(conclusions).replace(/\s{2,}/g, ' ')}</div>`;
    groups.push({ id: `bt-group-${groups.length}`, html, bytes: Buffer.byteLength(html) });
  }
  const preamble = preambleEl ? text(preambleEl) : '';
  return { preamble, groups, toc, bytes: groups.reduce((s, g) => s + g.bytes, 0) };
}

// Fetch a version's HTML. Returns null for anything that is not the bill: an error, an empty answer, a Cloudflare
// challenge page, or a page with no body of the bill in it.
export async function fetchBillHtml(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { Accept: 'text/html', 'User-Agent': 'OpenGovt/1.0 (contact@opengovt.uk)' },
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const raw = await res.text();
  if (raw.length < 2000 || /<title>\s*Just a moment/i.test(raw) || !/class="body"/.test(raw)) return null;
  return raw;
}

// ---- cached loading ----
// Good answers are kept a long time; an empty answer (no publications, no HTML text) for one hour at most; an error
// is never kept (owner, 27 Oct 2026: an empty list or an error must never stay for more than an hour).
const EMPTY = 'empty answer, kept for an hour';
async function keepGoodLong<T>(key: string[], longSeconds: number, load: () => Promise<T | null>): Promise<T | null> {
  let empty: { v: T | null } | null = null;
  try {
    return await unstable_cache(async () => {
      const v = await load();
      if (v == null) { empty = { v }; throw new Error(EMPTY); }
      return v;
    }, key, { revalidate: longSeconds })();
  } catch (e) {
    if ((e as Error)?.message !== EMPTY) throw e;
  }
  return unstable_cache(async () => (empty ? empty.v : await load()), [...key, 'empty'], { revalidate: 3600 })();
}

// Every publication of a bill. A settled bill (not updated by Parliament for 90 days) keeps its answer for 30 days, a
// current bill for a day (report 43). Throws when the Bills API cannot be read.
export async function getBillPublications(parliamentId: number, settled: boolean): Promise<ApiPublication[]> {
  const pubs = await keepGoodLong(['bill-publications-v2', String(parliamentId)], settled ? 30 * 86400 : 86400, async () => {
    const res = await fetch(`https://bills-api.parliament.uk/api/v1/Bills/${parliamentId}/Publications`, {
      headers: { Accept: 'application/json', 'User-Agent': 'OpenGovt/1.0 (contact@opengovt.uk)' }, signal: AbortSignal.timeout(20000), cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Parliament's Bills API answered HTTP ${res.status}`);
    const list = ((await res.json()) as { publications?: ApiPublication[] }).publications ?? [];
    return list.length ? list : null;
  });
  return pubs ?? [];
}

// The cleaned text of one version, kept for 24 hours (fetched on the first visit, then reused). Null when the version
// has no readable HTML (kept for an hour, then tried again).
export async function getBillText(url: string): Promise<CleanBill | null> {
  return keepGoodLong(['bill-text-v1', url], 86400, async () => {
    const raw = await fetchBillHtml(url);
    const clean = raw ? cleanBillHtml(raw) : null;
    return clean && clean.groups.length ? clean : null;
  });
}

// The Act, once the bill has become one (legislation.gov.uk).
export function actLink(pubs: ApiPublication[]): { title: string; url: string } | null {
  const p = pubs.find((x) => x.publicationType?.name === 'Act of Parliament');
  const url = p?.links?.find((l) => /^https:\/\/www\.legislation\.gov\.uk\//.test(l.url || ''))?.url;
  return p && url ? { title: p.title || 'The Act', url } : null;
}

// How much of a bill's text goes into the page itself. The text is also carried in the page's data for React, so it
// counts about twice: 350 KB keeps the page under 2 MB even with a long documents list (the Health Bill: 251). The rest loads a part at a time (BillTextGroups).
export const INLINE_TEXT_BUDGET = 350_000;
export function inlineGroupCount(clean: CleanBill): number {
  let used = 0;
  for (let i = 0; i < clean.groups.length; i++) {
    used += clean.groups[i].bytes;
    if (used > INLINE_TEXT_BUDGET) return Math.max(1, i);
  }
  return clean.groups.length;
}
