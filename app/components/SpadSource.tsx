// Source line for the Cabinet Office's named list of special advisers (owner, 28 Oct 2026).
import { OGL_URL, releaseLabel } from '@/lib/spad-display';

// EL1 (owner, 10 Nov 2026): the release is linked in the page's Sources fold (spadReleaseSource), not here.
export const spadReleaseSource = (slug: string, url: string) => ({ label: `Cabinet Office, Special adviser data releases: numbers and costs, ${releaseLabel(slug)}`, href: url });

export default function SpadSource({ slug }: { slug: string; url?: string }) {
  return (
    <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '10px 0 0', color: '#14100d' }}>
      Source: Cabinet Office, Special adviser data releases: numbers and costs, {releaseLabel(slug)} (in Sources at the end of the page).
      {' '}Crown copyright, <a href={OGL_URL} rel="noopener" style={{ color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Open Government Licence v3.0</a>.
    </p>
  );
}
