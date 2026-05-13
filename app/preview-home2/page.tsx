import Image from 'next/image';

export default function PreviewHome2() {
  return (
    <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', background: '#2a1810' }}>
      {/* Template background */}
      <Image
        src="/preview-home2.png"
        alt=""
        fill
        unoptimized
        style={{ objectFit: 'contain', objectPosition: 'top center', zIndex: 0 }}
      />

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
      <div style={{ position: 'relative', zIndex: 2, padding: '350px 80px 60px 80px', color: '#14100d', fontFamily: 'Special Elite, monospace' }}>
        <div style={{ display: 'flex', gap: '40px', marginBottom: '60px' }}>
          {/* Polaroid with distress */}
          <div style={{
            background: '#fff',
            padding: '12px 12px 48px 12px',
            width: '220px',
            transform: 'rotate(-2.3deg)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
            filter: 'contrast(1.05) brightness(0.98)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://members-api.parliament.uk/api/Members/3914/Portrait?cropType=ThreeFour"
              alt="Shabana Mahmood"
              width="220"
              height="220"
              style={{ display: 'block', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }}
            />
          </div>

          {/* Hero text with ink effects */}
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '52px',
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '40px' }}>
          {/* Sidebar with roughened edges */}
          <div>
            <p style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              marginBottom: '16px',
              color: '#14100d',
              transform: 'rotate(-0.2deg)',
            }}>Sections</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
            </div>
          </div>

          {/* Content with ink texture */}
          <div>
            <h2 style={{
              fontSize: '36px',
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
              <p style={{ marginBottom: '16px', transform: 'rotate(0.1deg)', opacity: 1 }}>
                Shabana Mahmood, Labour MP for Birmingham Ladywood and now Home Secretary, has built one of the more substantial careers in the Starmer-era Labour Party. First elected in 2010, she has lasted through New Labour&apos;s aftershock, the Corbyn years, Labour&apos;s electoral collapse, its rebuild, and finally government. That alone says something. Many MPs enter Westminster, make three speeches, develop a taste for panels, and vanish into the upholstery. Mahmood has endured, adapted and risen.
              </p>

              <p style={{ marginBottom: '16px', transform: 'rotate(-0.15deg)', opacity: 1 }}>
                She is clearly one of Labour&apos;s sharpest political operators. Her role as National Campaign Co-ordinator from 2021 to 2023 mattered because Labour&apos;s campaign machine under Starmer became far more disciplined, data-driven and ruthless than in previous years.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
