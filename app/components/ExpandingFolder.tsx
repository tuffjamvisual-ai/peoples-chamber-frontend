'use client';
import { useEffect, useRef, useState } from 'react';

// The folder starts at a normal (portrait) folder size and grows DOWNWARD as the user
// scrolls, revealing content as it opens. Within a section it never shrinks (the revealed
// height is monotonic); switching sections re-fits to the new content height (caught via a
// MutationObserver, since a tab swap fires no scroll/resize). Content is clipped to the
// current height (overflow hidden); the sliced bg layers fill it so the bottom edge slides
// down as it expands.
export default function ExpandingFolder({
  style,
  className,
  defaultHeightCss,
  children,
}: {
  style?: React.CSSProperties;
  className?: string;
  defaultHeightCss: string; // CSS for the starting (default) folder height
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const defaultH = el.offsetHeight; // the default folder height (clamped by the maxHeight CSS)
    let maxH = defaultH;
    const compute = () => {
      const fullH = el.scrollHeight; // full height of the CURRENT section's content
      const topDoc = el.getBoundingClientRect().top + window.scrollY;
      const want = window.scrollY + window.innerHeight - topDoc + 220;
      // Always at least the default folder size; expand above it as you scroll, up to the
      // content height; re-fit (down to default, never below) when the section changes.
      maxH = Math.max(maxH, Math.min(want, fullH)); // grow as you scroll (within a section)
      maxH = Math.min(maxH, Math.max(fullH, defaultH)); // don't exceed content, but keep ≥ default
      maxH = Math.max(maxH, defaultH);              // never shrink below the default folder size
      setHeight(maxH);
    };
    compute();
    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    const mo = new MutationObserver(() => compute());
    mo.observe(el, { subtree: true, childList: true, characterData: true });
    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
      mo.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        overflow: 'hidden',
        // Always at least a default-sized folder — even with little content. This also makes
        // offsetHeight read the true default at mount (maxHeight alone only caps, never pads).
        minHeight: defaultHeightCss,
        ...(height !== null
          ? { height: `${height}px`, maxHeight: 'none' }
          : { maxHeight: defaultHeightCss }),
      }}
    >
      {children}
    </div>
  );
}
