import '../components/magazine-layout.css';
import PillarsFooter from '../components/PillarsFooter';

// Preview-only route. Visit /preview-footer to see how the new
// PillarsFooter design lands at the bottom of a page that uses the
// same magazine chrome as /mps/[id] and /departments/[slug]. The fake
// "end of profile" strip above the footer provides visual context.

export const metadata = {
  title: 'Preview, Pillars footer',
  robots: { index: false, follow: false },
};

export default function PreviewFooterPage() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1086px',
        margin: '0 auto',
        background: '#2a1810',
        backgroundImage:
          'url("/preview-header.webp"), url("/preview-footer.webp"), url("/preview-middle.webp")',
        backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
        backgroundPosition: 'top center, bottom center, top center',
        backgroundSize: '100% auto, 100% auto, 100% auto',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")",
          pointerEvents: 'none',
        }}
      />

      <div
        className="magazine-content-spacing"
        style={{
          position: 'relative',
          zIndex: 2,
          color: '#14100d',
          fontFamily: 'Special Elite, monospace',
        }}
      >
        <p
          style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            opacity: 0.65,
            marginBottom: '16px',
          }}
        >
          Preview · Pillars footer (not live)
        </p>
        <h1
          style={{
            fontSize: '44px',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            marginBottom: '24px',
            textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
          }}
        >
          End of profile mock-up
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '720px', marginBottom: '24px' }}>
          This is filler content standing in for the bottom of an MP profile or department page
          (e.g. the last section of the bills list, or the FOI / press-contact block on
          /departments/treasury). The new footer renders directly below this strip. Scroll down to
          see how it sits against the magazine chrome.
        </p>

        <div
          style={{
            borderTop: '1px solid rgba(20,16,13,0.3)',
            paddingTop: '20px',
            marginTop: '40px',
            fontSize: '13px',
            opacity: 0.7,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Sample section heading (e.g. "Sponsored bills" or "Department staff")
        </div>
        <div style={{ height: '120px' }} />
      </div>

      <PillarsFooter />
    </div>
  );
}
