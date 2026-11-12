'use client';

import { usePagePath } from '@/lib/use-page-path';

// The footer's "Feedback" link (owner's brief, 2 Nov 2026): /feedback?from=<the current path>, so the message says
// which page the reader was on. On the feedback page itself it links to /feedback with no page.
export default function FeedbackFooterLink({ style, className }: { style?: React.CSSProperties; className?: string }) {
  const path = usePagePath(); // the page's own path, never '/index' (T1-HL)
  const href = path && path !== '/feedback' && path.length <= 200 ? `/feedback?from=${encodeURIComponent(path)}` : '/feedback';
  return <a href={href} rel="nofollow" style={style} className={className}>Feedback</a>;
}
