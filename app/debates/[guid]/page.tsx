import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';

// In-house rendering of a Hansard debate. opengovt never links out, so rather
// than send readers to hansard.parliament.uk we pull the debate transcript from
// the Hansard API (server-side) and render it inside our own shell. API-in-render
// with 24h ISR — same approved carve-out as /bills/[id]/full: heavy payload, low
// per-debate traffic. Speaker names link to their on-site MP profile where we
// hold one, and the previous/next debate links stay on site.
export const revalidate = 86400;

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'Special Elite, monospace';
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif';

type DebateItem = {
  ItemType?: string;
  AttributedTo?: string | null;
  Value?: string | null;
  MemberId?: number | null;
};
type Debate = {
  Overview?: {
    Title?: string; Date?: string; House?: string; Location?: string; ExtId?: string;
    NextDebateExtId?: string | null; NextDebateTitle?: string | null;
    PreviousDebateExtId?: string | null; PreviousDebateTitle?: string | null;
  } | null;
  Items?: DebateItem[] | null;
  ChildDebates?: Debate[] | null;
};

async function getDebate(guid: string): Promise<Debate | null> {
  try {
    const res = await fetch(`https://hansard-api.parliament.uk/Debates/Debate/${guid}.json`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Debate;
  } catch {
    return null;
  }
}

// Trusted gov content. Strip scripts/styles, drop anchor tags (we don't link
// out) and the invisible column-number markers, and remove event handlers.
function sanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<span[^>]*class="column-number[^"]*"[^>]*>\s*<\/span>/gi, '')
    .replace(/<a\b[^>]*>/gi, '')
    .replace(/<\/a>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .trim();
}
const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim();

// House style: no hyphens. De-hyphenate ordinary compounds (letter-letter
// only, so number ranges like 2024-25 keep their hyphen). Covers the regular
// hyphen plus the Unicode hyphen and non-breaking hyphen used in Hansard.
const dehyphen = (s: string) => s.replace(/([A-Za-z])[‐‑-]([A-Za-z])/g, '$1 $2');

// Hansard marks paragraphs with blank lines, not <p> tags, so the browser
// collapses them into one block. Wrap each blank-line block in a <p> so
// paragraphs actually break on the page.
function paragraphize(raw: string): string {
  const blocks = sanitize(raw)
    .split(/\r?\n\s*\r?\n+/)
    .map((b) => b.replace(/\s*\r?\n\s*/g, ' ').trim())
    .filter(Boolean);
  // A blank line is only a real paragraph break when the preceding block ends
  // a sentence. Otherwise it is layout (motion clauses, wrapped quotes and
  // lists), so merge it back rather than emit a one-line fragment.
  const merged: string[] = [];
  for (const b of blocks) {
    const prev = merged[merged.length - 1];
    if (prev && !/[.!?”"’)\]]$/.test(prev)) merged[merged.length - 1] = `${prev} ${b}`;
    else merged.push(b);
  }
  return dehyphen(merged.map((b) => `<p>${b}</p>`).join(''));
}

function fmtDate(s?: string) {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Flatten a debate + its child debates into an ordered list of items.
function allItems(d: Debate): DebateItem[] {
  const out: DebateItem[] = [...(d.Items || [])];
  for (const c of d.ChildDebates || []) out.push(...allItems(c));
  return out;
}

// A plain-English "what this debate is about" line, taken straight from the
// official record: the motion ("That this House has considered ...") for
// debates and committees, or the opening question for oral questions. Returns
// null for adjournment and general debates whose opening is purely procedural
// ("That this House do now adjourn") — there the title already says the subject.
function debateAbout(items: DebateItem[]): string | null {
  const texts = items.map((it) => plain(it.Value || '')).filter(Boolean);

  // 1. "... has considered <subject>." (debates, Westminster Hall, committees).
  //    Scanned over a wide window: committee membership lists precede the motion.
  for (const t of texts.slice(0, 40)) {
    const m = t.match(/That (?:this House|the House|the Committee|the Grand Committee) has considered\b[\s\S]*?(?=\.\s|\.$)/i);
    if (m && m[0].length > 30) return m[0].trim() + '.';
  }
  // 2. Bill stage motions ("That the X Bill be now read a Second time.")
  for (const t of texts.slice(0, 40)) {
    const m = t.match(/That the .{3,}?\bbe (?:now )?read (?:a (?:Second|Third) time|the [A-Za-z]+ time)\b[\s\S]*?(?=\.\s|\.$)/i);
    if (m) return m[0].trim() + '.';
  }
  // 3. Oral questions: the opening line is the question itself (Hansard ends
  //    these with a full stop, not a question mark).
  for (const t of texts.slice(0, 3)) {
    const q = t.match(/^\d{0,3}\.?\s*((?:What|Whether|If|When|How|Why|Which|To ask)\b.+?[.?])(?:\s|$)/i);
    if (q && q[1].length > 20) return q[1].trim();
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ guid: string }> }): Promise<Metadata> {
  const { guid } = await params;
  const d = await getDebate(guid);
  const title = d?.Overview?.Title?.trim() || 'Debate';
  return { title: `${title}`, alternates: { canonical: `/debates/${guid}` } };
}

export default async function DebatePage({ params }: { params: Promise<{ guid: string }> }) {
  const { guid } = await params;
  const debate = await getDebate(guid);
  if (!debate || !debate.Overview) notFound();

  const ov = debate.Overview;
  const allDebateItems = allItems(debate);
  const about = debateAbout(allDebateItems);
  const rawItems = allDebateItems.filter((it) => it.ItemType !== 'Timestamp' && plain(it.Value || '').length > 0);
  // Group consecutive paragraphs by speaker so each contribution reads as a
  // distinct block (name once, paragraphs spaced) rather than one wall of text.
  type Group = { speaker: string; html: string; memberId: number | null };
  const groups: Group[] = [];
  for (const it of rawItems) {
    const speaker = (it.AttributedTo || '').trim();
    const html = paragraphize(it.Value || '');
    const memberId = typeof it.MemberId === 'number' && it.MemberId > 0 ? it.MemberId : null;
    const last = groups[groups.length - 1];
    if (speaker && (!last || last.speaker !== speaker)) groups.push({ speaker, html, memberId });
    else if (last) last.html += html;
    else groups.push({ speaker: '', html, memberId });
  }

  // Only link speakers we actually hold an MP profile for, so no link 404s.
  const memberIds = [...new Set(groups.map((g) => g.memberId).filter((x): x is number => x != null))];
  const linkable = new Set<number>();
  if (memberIds.length) {
    const { data } = await supabase.from('mps').select('member_id').in('member_id', memberIds);
    for (const r of data || []) linkable.add(r.member_id as number);
  }

  // Divisions held in this debate, linked to our own division pages (populated
  // and validated by the debates sync, so these never 404).
  const { data: drow } = await supabase.from('debates').select('division_ids').eq('hansard_ext_id', guid).maybeSingle();
  const divisionIds: string[] = Array.isArray(drow?.division_ids) ? (drow!.division_ids as string[]) : [];

  return (
    <OpenGovShell pageStamp="Debate">
      <BackLink
        fallbackHref="/mps"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
      />

      <header style={{ marginBottom: '6%' }}>
        <div style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, marginBottom: '8px' }}>
          Hansard{ov?.House ? ` · ${ov.House}` : ''}{ov?.Date ? ` · ${fmtDate(ov.Date)}` : ''}
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(26px, 3.4vw, 42px)', fontWeight: 600, lineHeight: 1.15, margin: 0, color: INK }}>
          {dehyphen(ov?.Title?.trim() || 'Debate')}
        </h1>
        {ov?.Location && (
          <div style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase', color: INK, opacity: 0.55, marginTop: '8px' }}>{ov.Location}</div>
        )}
        {divisionIds.length > 0 && (
          <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {divisionIds.map((slug) => {
              const num = slug.match(/-(\d+)-commons$/)?.[1];
              return (
                <Link key={slug} href={`/divisions/${slug}`} className="no-hover-scale" style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 'bold', color: '#fff', background: ACCENT, padding: '4px 10px', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {divisionIds.length > 1 && num ? `Division ${num} →` : 'Vote held →'}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {about && (
        <section style={{ maxWidth: '46em', margin: '0 auto 7%', borderLeft: `2px solid ${ACCENT}`, paddingLeft: '16px' }}>
          <div style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: '8px' }}>
            What this debate is about
          </div>
          <p style={{ fontFamily: SERIF, fontSize: '17px', lineHeight: 1.6, color: INK, margin: 0 }}>
            {dehyphen(about)}
          </p>
        </section>
      )}

      <div style={{ maxWidth: '46em', margin: '0 auto' }}>
        {groups.length === 0 ? (
          <p style={{ fontFamily: MONO, fontSize: '15px', opacity: 0.7 }}>No transcript text is available for this debate.</p>
        ) : (
          groups.map((g, i) => (
            <div
              key={i}
              style={{
                marginBottom: '30px',
                paddingLeft: g.speaker ? '16px' : 0,
                borderLeft: g.speaker ? '2px solid rgba(122,22,18,0.22)' : 'none',
              }}
            >
              {g.speaker && (
                <div style={{ fontFamily: MONO, fontSize: '15px', fontWeight: 'bold', color: ACCENT, marginBottom: '8px', letterSpacing: '0.02em' }}>
                  {g.memberId && linkable.has(g.memberId) ? (
                    <Link href={`/mps/${g.memberId}`} style={{ color: ACCENT, textDecoration: 'none' }} className="no-hover-scale">
                      {dehyphen(g.speaker)}
                    </Link>
                  ) : (
                    dehyphen(g.speaker)
                  )}
                </div>
              )}
              <div
                className="pca-hansard"
                style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.8, color: INK }}
                dangerouslySetInnerHTML={{ __html: g.html }}
              />
            </div>
          ))
        )}
      </div>

      <nav aria-label="Adjacent debates" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', maxWidth: '46em', margin: '40px auto 0', borderTop: '1px solid rgba(20,16,13,0.25)', paddingTop: '18px' }}>
        {ov?.PreviousDebateExtId ? (
          <Link href={`/debates/${ov.PreviousDebateExtId}`} className="no-hover-scale" style={{ flex: '1 1 240px', textDecoration: 'none', color: INK }}>
            <div style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, marginBottom: '4px' }}>← Previous debate</div>
            <div style={{ fontFamily: SERIF, fontSize: '16px' }}>{dehyphen(ov.PreviousDebateTitle?.trim() || 'Previous')}</div>
          </Link>
        ) : <span />}
        {ov?.NextDebateExtId ? (
          <Link href={`/debates/${ov.NextDebateExtId}`} className="no-hover-scale" style={{ flex: '1 1 240px', textDecoration: 'none', color: INK, textAlign: 'right' }}>
            <div style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, marginBottom: '4px' }}>Next debate →</div>
            <div style={{ fontFamily: SERIF, fontSize: '16px' }}>{dehyphen(ov.NextDebateTitle?.trim() || 'Next')}</div>
          </Link>
        ) : <span />}
      </nav>

      <style>{`.pca-hansard p { margin: 0 0 12px 0; } .pca-hansard p:last-child { margin-bottom: 0; } .pca-hansard em { font-style: italic; }`}</style>
    </OpenGovShell>
  );
}
