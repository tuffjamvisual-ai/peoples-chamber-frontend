import { supabase } from '@/lib/supabase';
import '../components/magazine-layout.css';
import ScrollToTopButton from './ScrollToTopButton';

export const revalidate = 600;

export default async function PreviewHome2() {
  const [bioRes, mpRes] = await Promise.all([
    supabase.from('mp_biography').select('political_bio').eq('member_id', 3914).single(),
    supabase.from('mps').select('photo_url, display_name').eq('member_id', 3914).single(),
  ]);
  const bio = bioRes.data;
  const mp = mpRes.data;

  const paragraphs = (bio?.political_bio ?? '')
    .split(/\n\n+/)
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '1086px',
      margin: '0 auto',
      background: '#2a1810',
      // Three-layer template: header (top), footer (bottom), middle (tile).
      // First-listed background is rendered on top.
      backgroundImage:
        'url("/preview-header.png"), url("/preview-footer.png"), url("/preview-middle.png")',
      backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
      backgroundPosition: 'top center, bottom center, top center',
      backgroundSize: '100% auto, 100% auto, 100% auto',
    }}>
      {/* Paper grain overlay — fractal noise via inline SVG */}
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

      {/* Content overlay */}
      <div className="magazine-content-spacing" style={{ position: 'relative', zIndex: 2, color: '#14100d', fontFamily: 'Special Elite, monospace' }}>
        <a
          href="/mps"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            color: '#14100d',
            textDecoration: 'none',
            fontSize: '16px',
            transform: 'rotate(-0.2deg)',
          }}
        >
          ← Back to all MPs
        </a>
        <div style={{ display: 'flex', gap: '40px', marginBottom: '60px' }}>
          {/* Polaroid with distress — pulled to magazine's left edge */}
          <div style={{
            position: 'relative',
            background: '#fff',
            padding: '12px 12px 48px 12px',
            width: '284px',
            marginLeft: '-50px',
            transform: 'rotate(-2.3deg)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
            filter: 'contrast(1.05) brightness(0.98)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mp?.photo_url ?? ''}
              alt={mp?.display_name ?? 'Shabana Mahmood'}
              width={260}
              height={260}
              style={{ display: 'block', width: '260px', height: '260px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }}
            />
            {/* Paperclip overlay */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/paperclip.png"
              alt=""
              aria-hidden
              style={{
                position: 'absolute',
                top: '-80px',
                left: '-40px',
                width: '130px',
                height: 'auto',
                transform: 'rotate(75deg)',
                transformOrigin: 'center',
                pointerEvents: 'none',
                zIndex: 3,
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))',
              }}
            />
          </div>

          {/* Hero text with ink effects */}
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '44px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: '#14100d',
              fontFamily: 'Special Elite, monospace',
              transform: 'rotate(-0.3deg)',
              textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
              letterSpacing: '-0.02em',
            }}>
              Shabana Mahmood
            </h1>
            <p style={{ fontSize: '22px', marginBottom: '8px', color: '#14100d', transform: 'rotate(0.2deg)' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#e4003b', marginRight: '8px' }}></span>
              Labour • Birmingham Ladywood
            </p>
            <p style={{ fontSize: '16px', color: '#14100d', transform: 'rotate(-0.1deg)' }}>
              Member since 6 May 2010
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-px">
          {/* Sidebar — sticky like the dark-theme MP page */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-16">
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 8px 8px' }}>
              <div style={{
                padding: '12px 16px',
                borderLeft: '4px solid #7a1612',
                background: 'rgba(122,22,18,0.08)',
                fontWeight: 'bold',
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                transform: 'rotate(0.1deg)',
                boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.05)',
              }}>POLITICAL BIO</div>
              <div style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(-0.1deg)' }}>CONTACT</div>
              <div style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(0.15deg)' }}>VOTING RECORD</div>
              <div style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(-0.2deg)' }}>BILLS SPONSORED</div>
              <div style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(0.1deg)' }}>INTERESTS</div>
              <div style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(-0.15deg)' }}>ROLES</div>
              <div style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(0.2deg)' }}>EARNINGS</div>
              <div style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(-0.1deg)' }}>EXPENSES</div>
              </nav>
            </div>
          </aside>

          {/* Content with ink texture */}
          <div className="lg:col-span-3 p-6 sm:p-8">
            <h2 style={{
              fontSize: '30px',
              fontWeight: 'bold',
              marginBottom: '24px',
              color: '#14100d',
              fontFamily: 'Special Elite, monospace',
              transform: 'rotate(-0.2deg)',
              textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.15)',
            }}>
              Political Biography
            </h2>
            <div style={{
              lineHeight: '1.8',
              fontSize: '16px',
              color: '#14100d',
              letterSpacing: '0.01em',
            }}>
              {paragraphs.length === 0 ? (
                <p style={{ marginBottom: '16px', opacity: 1 }}>
                  Biography unavailable.
                </p>
              ) : (
                paragraphs.map((para: string, idx: number) => {
                  const tilt = idx % 4;
                  const rot =
                    tilt === 0 ? '0.1deg' : tilt === 1 ? '-0.15deg' : tilt === 2 ? '0.08deg' : '-0.1deg';
                  return (
                    <p
                      key={idx}
                      style={{
                        marginBottom: '16px',
                        transform: `rotate(${rot})`,
                        opacity: 1,
                      }}
                    >
                      {para}
                    </p>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      <ScrollToTopButton />
    </div>
  );
}
