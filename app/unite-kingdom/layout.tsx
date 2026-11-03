import type { Metadata } from 'next';

// A test page (owner, 3 Nov 2026): kept, but never indexed and its links not followed. Set here in a layout so it
// covers the page (client or server) and anything under it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TestPageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
