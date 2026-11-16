'use client';
// The "NEW" mark on a figure (ENTRY 140): shown on its publication day and the 6 days after, by today's date in London.
// The page renders it as of the day it was built and the browser checks it again (useToday), so the page is never
// rebuilt just because a day passed. The mark always takes its space (hidden when not new), so nothing moves when it
// appears or goes.
import { isRecent } from '@/lib/london-date';
import { useToday } from '../components/useToday';

export default function NewMark({ publishedOn, days, renderedOn, color }: { publishedOn: string | null; days: number; renderedOn: string; color: string }) {
  const today = useToday(renderedOn);
  const shown = isRecent(publishedOn, days, today);
  if (!publishedOn) return null;
  return (
    <span aria-hidden={!shown} style={{ flex: 'none', fontSize: '13px', letterSpacing: '0.12em', border: `1px solid ${color}`, padding: '1px 6px', visibility: shown ? 'visible' : 'hidden' }}>
      NEW
    </span>
  );
}
