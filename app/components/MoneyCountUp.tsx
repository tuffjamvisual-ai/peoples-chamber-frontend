'use client';

import { useEffect, useRef, useState } from 'react';

// Animated £ count-up. Eases 0 → value once scrolled into view, settles on the
// exact figure, and respects prefers-reduced-motion (jumps straight to it).
export default function MoneyCountUp({
  value,
  durationMs = 1600,
  style,
  className,
}: {
  value: number;
  durationMs?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
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
      if (prefersReduced || value <= 0) {
        setV(value);
        return;
      }
      let startTs: number | null = null;
      const step = (ts: number) => {
        if (startTs === null) startTs = ts;
        const p = Math.min(1, (ts - startTs) / durationMs);
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        setV(value * eased);
        if (p < 1) requestAnimationFrame(step);
        else setV(value);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.5 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [value, durationMs]);

  return (
    <span
      ref={ref}
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
      aria-label={'£' + Math.round(value).toLocaleString('en-GB')}
    >
      {'£' + Math.round(v).toLocaleString('en-GB')}
    </span>
  );
}
