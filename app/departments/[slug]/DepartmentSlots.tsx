import Link from 'next/link';
import { listSummary } from '@/lib/editorials/list-summary';
import ContinueToArticle from '@/app/components/ContinueToArticle';
import { type DepartmentBudget, fmtBn, totalSpend } from '@/lib/department-budgets';

export type PressReleaseItem = {
  title: string;
  organisation: string | null;
  published_at: string | null;
  newsSlug: string;
};

export type InvestigationItem = {
  slug: string;
  headline: string;
  standfirst: string | null;
  summary: string | null;
  published_at: string;
  kicker: string | null;
  // The article address and the type label, as on /reports (23 Oct 2026).
  href: string;
  type: 'Investigation' | 'Briefing' | 'Commentary';
};

// Server-rendered content blocks for the department profile tabs
// (DepartmentTabs). Pure display, no hooks — so they ship in the static
// HTML even though they sit behind a client-side tab switcher.

const ACCENT = '#7a1612';
const H2_CLS = 'text-[15px] uppercase tracking-[0.25em] mb-4 font-semibold';

export function BudgetSlot({ budget }: { budget: DepartmentBudget | null }) {
  if (!budget) {
    return <p className="text-[15px]" >No published budget envelope is available for this department.</p>;
  }
  return (
    <section>
      <h2 className={H2_CLS} style={{ color: ACCENT }}>Budget · {budget.year}</h2>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ fontSize: '30px', fontWeight: 'bold', color: '#7a1612', lineHeight: 1 }}>{fmtBn(totalSpend(budget))}</div>
        <div style={{ fontSize: '15px' }}>
          Resource DEL {fmtBn(budget.resourceDel)} · Capital DEL {fmtBn(budget.capitalDel)}
          {budget.ame !== undefined && ` · AME ${fmtBn(budget.ame)}`}
        </div>
      </div>
      <p style={{ fontSize: '15px', lineHeight: 1.65 }}>{budget.prose}</p>
    </section>
  );
}

type Agency = { name: string; slug: string; acronym?: string; description?: string; hasPage: boolean };

// Trim a gov.uk org description to a short summary: first sentence(s) up to
// ~220 chars, cut on a word boundary.
function shortSummary(text: string): string {
  // De-hyphenate ordinary compounds (house style): world-leading -> world
  // leading, ex-servicemen -> ex servicemen. Letter-letter only, so numbers
  // and codes (F-35, 2024-25) keep their hyphen.
  const t = text.replace(/\s+/g, ' ').replace(/([A-Za-z])-([A-Za-z])/g, '$1 $2').trim();
  if (t.length <= 220) return t;
  const cut = t.slice(0, 220);
  const lastStop = cut.lastIndexOf('. ');
  if (lastStop > 120) return cut.slice(0, lastStop + 1);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

export function AgenciesSlot({ agencies }: { agencies: Agency[] }) {
  if (!agencies || agencies.length === 0) {
    return <p className="text-[15px]" >No agencies or arm&apos;s length bodies are listed for this department.</p>;
  }
  return (
    <section>
      <h2 className={H2_CLS} style={{ color: ACCENT }}>Agencies &amp; Arm&apos;s Length Bodies ({agencies.length})</h2>
      <ul className="flex flex-col gap-5">
        {agencies.map((org, i) => (
          <li key={i} style={{ borderLeft: '2px solid rgba(20,16,13,0.12)', paddingLeft: '14px' }}>
            {/* Linked only when agency_cache has the body, so /agencies/<slug> has a page; otherwise the name alone. */}
            {org.hasPage ? (
              <Link
                href={'/agencies/' + org.slug}
                className="text-[16px] font-semibold text-[#14100d] hover:text-[#7a1612] transition-colors"
                style={{ textDecoration: 'underline', textUnderlineOffset: '3px', lineHeight: 1.3, display: 'inline-block' }}
              >
                {org.name}
                {org.acronym && org.acronym.toLowerCase() !== org.name.toLowerCase() ? ` (${org.acronym})` : ''}
              </Link>
            ) : (
              <span className="text-[16px] font-semibold text-[#14100d]" style={{ lineHeight: 1.3, display: 'inline-block' }}>
                {org.name}
                {org.acronym && org.acronym.toLowerCase() !== org.name.toLowerCase() ? ` (${org.acronym})` : ''}
              </span>
            )}
            {org.description && (
              <p className="text-[15px] leading-[1.6] mt-1" >{shortSummary(org.description)}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Contact: the press office number. The department's social media links were removed (EL1, owner, 10 Nov 2026: only
// sources link outside); its GOV.UK page is in the page's Sources fold.
export function ContactSlot({ pressPhone }: { pressPhone: string }) {
  return (
    <section>
      <h2 className={H2_CLS} style={{ color: ACCENT }}>Contact</h2>
      <p className="text-[15px] mb-4 font-mono">
        <span className="uppercase tracking-[0.15em] font-semibold" style={{ color: ACCENT }}>Press</span>{' '}
        {pressPhone}
      </p>
    </section>
  );
}

export function ReleasesSlot({ releases }: { releases: PressReleaseItem[] }) {
  return (
    <section>
      <h2 className={H2_CLS} style={{ color: ACCENT }}>Press Releases ({releases.length})</h2>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {releases.map((r, i) => (
          <li key={i} style={{ borderBottom: '1px dotted rgba(20,16,13,0.15)', padding: '8px 0' }}>
            <Link
              href={`/news/${r.newsSlug}`}
              style={{ display: 'block', fontSize: '15px', color: '#14100d', textDecoration: 'none', lineHeight: 1.45 }}
            >
              {r.title}
            </Link>
            <span style={{ display: 'block', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', color: '#14100d', marginTop: '3px' }}>
              {r.organisation && r.published_at ? `${r.organisation} · ` : (r.organisation ?? '')}
              {r.published_at
                ? new Date(r.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : ''}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function InvestigationsSlot({ investigations }: { investigations: InvestigationItem[] }) {
  return (
    <section>
      <h2 className={H2_CLS} style={{ color: ACCENT }}>Reports ({investigations.length})</h2>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {investigations.map((item, i) => (
          <li key={i} style={{ borderBottom: '1px dotted rgba(20,16,13,0.15)', padding: '10px 0' }}>
            <Link href={item.href} className="no-hover-scale" style={{ display: 'block', color: '#14100d', textDecoration: 'none' }}>
              <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.45, fontWeight: 600 }}>{item.headline}</span>
              {listSummary(item) && (
                <span style={{ display: 'block', fontSize: '15px', margin: '3px 0 0', lineHeight: 1.5 }}>
                  {listSummary(item)}
                </span>
              )}
              <span style={{ display: 'block', fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', marginTop: '4px' }}>
                {item.type} · {item.kicker && item.kicker.toLowerCase() !== item.type.toLowerCase() ? `${item.kicker} · ` : ''}
                {new Date(item.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <ContinueToArticle style={{ fontSize: '15px', marginTop: '4px' }} />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export type ProgrammeItem = {
  id: number;
  slug: string;
  name: string;
  status: string;
  summary: string | null;
};

const STATUS_COLOUR: Record<string, string> = {
  active:    '#1a5c36',
  paused:    '#7a5c12',
  cancelled: '#7a1612',
  completed: '#1a3a6e',
};

export function ProgrammesSlot({ programmes }: { programmes: ProgrammeItem[] }) {
  return (
    <section>
      <h2 className={H2_CLS} style={{ color: ACCENT }}>Programmes ({programmes.length})</h2>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {programmes.map((prog, i) => {
          const statusColour = STATUS_COLOUR[prog.status] ?? '#14100d';
          return (
            <li key={i} style={{ borderBottom: '1px dotted rgba(20,16,13,0.15)', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{
                  fontFamily: 'var(--font-special-elite), monospace',
                  fontSize: '15px', letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: statusColour,
                  border: `1px solid ${statusColour}`,
                  padding: '1px 5px', flexShrink: 0,
                }}>
                  {prog.status}
                </span>
                <Link
                  href={`/programmes/${prog.slug}`}
                  style={{ fontSize: '15px', color: '#14100d', textDecoration: 'none', lineHeight: 1.45, fontWeight: 600 }}
                >
                  {prog.name}
                </Link>
              </div>
              {prog.summary && (
                <p style={{ fontSize: '15px', color: '#14100d', margin: '3px 0 0', lineHeight: 1.5 }}>
                  {prog.summary.length > 140 ? prog.summary.slice(0, 140) + '…' : prog.summary}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
