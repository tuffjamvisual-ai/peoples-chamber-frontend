'use client';

import { useEffect, useRef, useState } from 'react';

const INK = '#14100d';
const ACCENT = '#6b2417';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = "'Special Elite', monospace";

type Props = {
  total: number;
  entryCount: number;
  asOf: string | null;
};

function fmtGBP(n: number): string {
  return '£' + Math.round(n).toLocaleString('en-GB');
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DonationsCounter({ total, entryCount, asOf }: Props) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const run = () => {
      if (started.current) return;
      started.current = true;
      if (prefersReduced || total <= 0) {
        setValue(total);
        return;
      }
      const duration = 1800;
      let startTs: number | null = null;
      const step = (ts: number) => {
        if (startTs === null) startTs = ts;
        const p = Math.min(1, (ts - startTs) / duration);
        // easeOutExpo — fast start, gentle settle onto the exact figure.
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        setValue(total * eased);
        if (p < 1) requestAnimationFrame(step);
        else setValue(total);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) run();
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [total]);

  return (
    <div
      ref={ref}
      style={{
        marginTop: '22px',
        marginBottom: '4px',
        maxWidth: '760px',
        padding: '22px 24px',
        border: `1px solid ${HAIRLINE}`,
        borderTop: `3px solid ${ACCENT}`,
        background: 'rgba(107,36,23,0.03)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: MONO,
          fontSize: '15px',
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color: ACCENT,
          marginBottom: '10px',
        }}
      >
        Declared donations to MPs
      </p>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 'clamp(38px, 7vw, 68px)',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.01em',
          color: INK,
          fontVariantNumeric: 'tabular-nums',
        }}
        aria-label={`${fmtGBP(total)} in declared donations to MPs`}
      >
        {fmtGBP(value)}
      </div>
      <p style={{ margin: '14px 0 0', fontFamily: MONO, fontSize: '15px', lineHeight: 1.65, color: INK }}>
        Total across{' '}
        <strong>{entryCount.toLocaleString('en-GB')}</strong>{' '}donations declared by MPs in the Register of
        Members&rsquo; Financial Interests (Category 2){asOf ? <>, as of <strong>{fmtDate(asOf)}</strong></> : null}.
      </p>
      <p style={{ margin: '8px 0 0', fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, opacity: 1 }}>
        Register-declared figures only. Gifts and hospitality (benefits in kind) and Electoral Commission party donations
        are counted separately and are not included in this figure.
      </p>
    </div>
  );
}
