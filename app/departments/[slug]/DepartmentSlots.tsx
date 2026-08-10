import Link from 'next/link';
import { type DepartmentBudget, fmtBn, totalSpend } from '@/lib/department-budgets';

// Server-rendered content blocks for the department profile tabs
// (DepartmentTabs). Pure display, no hooks — so they ship in the static
// HTML even though they sit behind a client-side tab switcher.

const ACCENT = '#7a1612';
const H2_CLS = 'text-[15px] uppercase tracking-[0.25em] mb-4 font-semibold';

export function BudgetSlot({ budget }: { budget: DepartmentBudget | null }) {
  if (!budget) {
    return <p className="text-[15px]" style={{ opacity: 0.7 }}>No published budget envelope is available for this department.</p>;
  }
  return (
    <section>
      <h2 className={H2_CLS} style={{ color: ACCENT }}>Budget · {budget.year}</h2>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ fontSize: '30px', fontWeight: 'bold', color: '#6b2417', lineHeight: 1 }}>{fmtBn(totalSpend(budget))}</div>
        <div style={{ fontSize: '15px', opacity: 0.75 }}>
          Resource DEL {fmtBn(budget.resourceDel)} · Capital DEL {fmtBn(budget.capitalDel)}
          {budget.ame !== undefined && ` · AME ${fmtBn(budget.ame)}`}
        </div>
      </div>
      <p style={{ fontSize: '15px', lineHeight: 1.65 }}>{budget.prose}</p>
    </section>
  );
}

type Agency = { name: string; slug: string; acronym?: string; description?: string };

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
    return <p className="text-[15px]" style={{ opacity: 0.7 }}>No agencies or arm&apos;s length bodies are listed for this department.</p>;
  }
  return (
    <section>
      <h2 className={H2_CLS} style={{ color: ACCENT }}>Agencies &amp; Arm&apos;s Length Bodies ({agencies.length})</h2>
      <ul className="flex flex-col gap-5">
        {agencies.map((org, i) => (
          <li key={i} style={{ borderLeft: '2px solid rgba(20,16,13,0.12)', paddingLeft: '14px' }}>
            <Link
              href={'/agencies/' + org.slug}
              className="text-[16px] font-semibold text-[#14100d] hover:text-[#7a1612] transition-colors"
              style={{ textDecoration: 'underline', textUnderlineOffset: '3px', lineHeight: 1.3, display: 'inline-block' }}
            >
              {org.name}
              {org.acronym && org.acronym.toLowerCase() !== org.name.toLowerCase() ? ` (${org.acronym})` : ''}
            </Link>
            {org.description && (
              <p className="text-[15px] leading-[1.6] mt-1" style={{ opacity: 0.85 }}>{shortSummary(org.description)}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ContactSlot({
  socialMedia,
  pressPhone,
}: {
  socialMedia: { service: string; url: string; title: string }[];
  pressPhone: string;
}) {
  const hasSocial = socialMedia && socialMedia.length > 0;
  if (!hasSocial && !pressPhone) {
    return <p className="text-[15px]" style={{ opacity: 0.7 }}>No published contact details are available for this department.</p>;
  }
  return (
    <section>
      <h2 className={H2_CLS} style={{ color: ACCENT }}>Contact</h2>
      {pressPhone && (
        <p className="text-[15px] mb-4 font-mono">
          <span className="uppercase tracking-[0.15em] font-semibold" style={{ color: ACCENT }}>Press</span>{' '}
          {pressPhone}
        </p>
      )}
      {hasSocial && (
        <div className="flex gap-3 flex-wrap items-center">
          {socialMedia.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.title || s.service}
              title={s.title || s.service}
              className="text-[#14100d] hover:text-[#7a1612] transition-colors"
              style={{ display: 'inline-flex' }}
            >
              {socialIcon(s.service)}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

// Brand glyph for a department's social link. Monochrome (currentColor),
// 20px. Falls back to a globe for anything unrecognised. Mirrors the helper
// that previously lived in DepartmentClient.
function socialIcon(service: string) {
  const s = (service || '').toLowerCase();
  const size = { width: 20, height: 20, viewBox: '0 0 24 24' };
  if (s.includes('twitter') || s === 'x') {
    return <svg {...size} fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" /></svg>;
  }
  if (s.includes('youtube')) {
    return <svg {...size} fill="currentColor" aria-hidden><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>;
  }
  if (s.includes('facebook')) {
    return <svg {...size} fill="currentColor" aria-hidden><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>;
  }
  if (s.includes('linkedin')) {
    return <svg {...size} fill="currentColor" aria-hidden><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" /></svg>;
  }
  if (s.includes('flickr')) {
    return <svg {...size} fill="currentColor" aria-hidden><circle cx="7.5" cy="12" r="4" /><circle cx="16.5" cy="12" r="4" /></svg>;
  }
  if (s.includes('instagram')) {
    return <svg {...size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" /></svg>;
  }
  return <svg {...size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></svg>;
}
