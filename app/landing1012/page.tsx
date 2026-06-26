import type { Metadata } from 'next';
import './landing1012.css';

// /landing1012 — currently just the bg-folders backdrop, no content.
// All text and images removed per request; previous build is in git history.
export const metadata: Metadata = {
  title: 'OPEN GOVERNMENT — landing1012 (preview)',
  robots: { index: false, follow: false },
};

export default function Landing1012() {
  return <div className="og-stage" />;
}
