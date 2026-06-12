import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';

// In-house rendering of a Hansard debate. The People's Chamber never links
// out, so rather than send readers to hansard.parliament.uk we pull the
// debate transcript from the Hansard API (server-side) and render it inside
// our own shell. API-in-render with 24h ISR — same approved carve-out as
// /bills/[id]/full: heavy payload, low per-debate traffic.
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
  Overview?: { Title?: string; Date?: string; House?: string; Location?: string; ExtId?: string } | null;
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

export async function generateMetadata({ params }: { params: Promise<{ guid: string }> }): Promise<Metadata> {
  const { guid } = await params;
  const d = await getDebate(guid);
  const title = d?.Overview?.Title?.trim() || 'Debate';
  return { title: `${title} | The People's Chamber`, alternates: { canonical: `/debates/${guid}` } };
}

export default async function DebatePage({ params }: { params: Promise<{ guid: string }> }) {
  const { guid } = await params;
  const debate = await getDebate(guid);
  if (!debate || !debate.Overview) notFound();

  const ov = debate.Overview;
  const items = allItems(debate).filter((it) => plain(it.Value || '').length > 0);

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/mps"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
      />

      <header style={{ marginBottom: '6%' }}>
        <div style={{ fontFamily: MONO, fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, marginBottom: '8px' }}>
          Hansard{ov?.House ? ` · ${ov.House}` : ''}{ov?.Date ? ` · ${fmtDate(ov.Date)}` : ''}
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(26px, 3.4vw, 42px)', fontWeight: 600, lineHeight: 1.15, margin: 0, color: INK }}>
          {ov?.Title?.trim() || 'Debate'}
        </h1>
        {ov?.Location && (
          <div style={{ fontFamily: MONO, fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: INK, opacity: 0.55, marginTop: '8px' }}>{ov.Location}</div>
        )}
      </header>

      <div style={{ maxWidth: '46em', margin: '0 auto' }}>
        {items.length === 0 ? (
          <p style={{ fontFamily: MONO, fontSize: '14px', opacity: 0.7 }}>No transcript text is available for this debate.</p>
        ) : (
          items.map((it, i) => {
            const speaker = (it.AttributedTo || '').trim();
            return (
              <div key={i} style={{ marginBottom: '20px' }}>
                {speaker && (
                  <div style={{ fontFamily: MONO, fontSize: '13px', fontWeight: 'bold', color: ACCENT, marginBottom: '4px', letterSpacing: '0.02em' }}>
                    {speaker}
                  </div>
                )}
                <div
                  style={{ fontFamily: MONO, fontSize: '14px', lineHeight: 1.75, color: INK }}
                  className="pca-hansard"
                  dangerouslySetInnerHTML={{ __html: sanitize(it.Value || '') }}
                />
              </div>
            );
          })
        )}
      </div>
      <style>{`.pca-hansard p { margin: 0 0 10px 0; } .pca-hansard em { font-style: italic; }`}</style>
    </DossierShell>
  );
}
