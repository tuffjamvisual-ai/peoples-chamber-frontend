// 404 boundary for /people/[slug]. Rendered when the page calls
// notFound() for an unknown slug, so the response carries a real 404
// status instead of a 200 soft 404. Keeps the same OpenGovShell +
// "Person not found." template the page used to render inline.
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';

const INK = '#14100d';

export default function PersonNotFound() {
  return (
    <OpenGovShell pageStamp="Profile">
      <BackLink
        fallbackHref="/departments"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <p style={{ fontSize: '16px', lineHeight: 1.7 }}>Person not found.</p>
    </OpenGovShell>
  );
}
