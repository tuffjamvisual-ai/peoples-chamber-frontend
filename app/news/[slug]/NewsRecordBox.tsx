// "What the record shows" (Cowork ENTRY 368, live as sampled by ENTRY 368 GO; lib/news-record.ts). Under the release,
// above the Related fold ("More from ..."). Every item links to an opengovt page (ENTRY 369); no source line inside the
// text (ENTRY 410). Phones and tablets: one closed fold under the heading (SectionFold), and each list opens with 3 and
// then Show 10 more (lib/phone-enhance.ts, owner's list rule); from 1,024px up the heading and lists in full (13 at most).
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { SectionFold } from '../../components/ReadOn';
import { KIND_ORDER, KIND_HEADING, type NewsRecord } from '@/lib/news-record-core';

const MONO = 'var(--font-special-elite), monospace';
const INK = '#14100d';
const ACCENT = '#7a1612';

const h2: CSSProperties = { fontFamily: MONO, fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: ACCENT, margin: '0 0 10px' };
const h3: CSSProperties = { fontFamily: MONO, fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: INK, margin: '18px 0 6px' };
const item: CSSProperties = { padding: '7px 0', borderBottom: '1px dotted rgba(20,16,13,0.18)', fontFamily: MONO, fontSize: '15px', lineHeight: 1.55 };
const note: CSSProperties = { display: 'block', marginTop: '2px', color: 'rgba(20,16,13,0.78)' };

export default function NewsRecordBox({ record }: { record: NewsRecord | null }) {
  if (!record || !record.items.length) return null;
  return (
    <section aria-labelledby="news-record" data-news-record="" style={{ marginTop: '36px', paddingTop: '18px', borderTop: '2px solid rgba(20,16,13,0.18)', maxWidth: '760px', color: INK }}>
      <SectionFold title="What the record shows" headingId="news-record" headingStyle={h2}>
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, margin: '0 0 4px' }}>
          Records on opengovt that name the same bills, programmes, bodies or places as this announcement{record.kinds.includes('spending') ? ', and the issuing department’s budget' : ''}.
        </p>
        {KIND_ORDER.filter((k) => record.kinds.includes(k)).map((k) => (
          <div key={k}>
            <h3 style={h3}>{KIND_HEADING[k]}</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {record.items.filter((i) => i.kind === k).map((i) => (
                <li key={i.href} style={item}>
                  <Link href={i.href} style={{ color: INK, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{i.label}</Link>
                  <span style={note}>{i.note}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </SectionFold>
    </section>
  );
}
