import type { Metadata } from 'next';

// The account page is a client component, so its robots setting lives here.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
