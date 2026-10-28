// Source line for the Cabinet Office's named list of special advisers (owner, 28 Oct 2026).
import { OGL_URL, releaseLabel } from '@/lib/spad-display';

export default function SpadSource({ slug, url }: { slug: string; url: string }) {
  return (
    <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '10px 0 0', color: '#14100d' }}>
      Source: <a href={url} rel="noopener" style={{ color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Cabinet Office, Special adviser data releases: numbers and costs, {releaseLabel(slug)}</a>.
      {' '}Crown copyright, <a href={OGL_URL} rel="noopener" style={{ color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Open Government Licence v3.0</a>.
    </p>
  );
}
