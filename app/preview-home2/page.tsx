import Image from 'next/image';

const FONT = {
  logo:    "'Playfair Display', Georgia, serif",
  head:    "'Bebas Neue', Impact, sans-serif",
  nav:     "'Oswald', sans-serif",
  body:    "'Libre Baskerville', Georgia, serif",
  notes:   "'Special Elite', 'Courier New', monospace",
  marker:  "'Permanent Marker', cursive",
};

export default function PreviewHome2() {
  return (
    <div style={{ position: 'relative', width: '1024px', margin: '0 auto', minHeight: '1400px', background: '#2a1810' }}>
      {/* Template background */}
      <Image
        src="/preview-home2.png"
        alt=""
        fill
        unoptimized
        style={{ objectFit: 'contain', objectPosition: 'top center', zIndex: 0 }}
      />

      {/* Shabana Mahmood content overlay */}
      <div style={{ position: 'relative', zIndex: 1, padding: '350px 80px 60px 80px', color: '#14100d' }}>
        <div style={{ display: 'flex', gap: '40px', marginBottom: '60px' }}>
          <div style={{
            background: '#fff',
            padding: '12px 12px 48px 12px',
            width: '280px',
            transform: 'rotate(-2deg)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://members-api.parliament.uk/api/Members/3914/Portrait?cropType=ThreeFour"
              alt="Shabana Mahmood"
              width="280"
              height="280"
              style={{ display: 'block' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '64px',
              fontWeight: 900,
              lineHeight: 1,
              marginBottom: '14px',
              color: '#14100d',
              fontFamily: FONT.logo,
              letterSpacing: '-0.02em',
            }}>
              Shabana Mahmood
            </h1>
            <p style={{ fontSize: '22px', marginBottom: '8px', color: '#4a3d2f', fontFamily: FONT.notes }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#e4003b', marginRight: '8px' }}></span>
              Labour • Birmingham Ladywood
            </p>
            <p style={{ fontSize: '14px', color: '#4a3d2f', fontFamily: FONT.notes, letterSpacing: '0.05em' }}>
              Member since 6 May 2010
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '40px' }}>
          <div>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '16px', color: '#4a3d2f', fontFamily: FONT.nav }}>Sections</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: FONT.nav }}>
              <div style={{ padding: '12px 16px', borderLeft: '4px solid #7a1612', background: 'rgba(122,22,18,0.08)', fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>POLITICAL BIO</div>
              <div style={{ padding: '12px 16px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a3d2f' }}>CONTACT</div>
              <div style={{ padding: '12px 16px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a3d2f' }}>VOTING RECORD</div>
              <div style={{ padding: '12px 16px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a3d2f' }}>BILLS SPONSORED</div>
              <div style={{ padding: '12px 16px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a3d2f' }}>INTERESTS</div>
              <div style={{ padding: '12px 16px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a3d2f' }}>ROLES</div>
              <div style={{ padding: '12px 16px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a3d2f' }}>EARNINGS</div>
              <div style={{ padding: '12px 16px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a3d2f' }}>EXPENSES</div>
            </div>
          </div>

          <div>
            <h2 style={{
              fontSize: '52px',
              marginBottom: '24px',
              color: '#14100d',
              fontFamily: FONT.head,
              letterSpacing: '0.02em',
              lineHeight: 1,
              textTransform: 'uppercase',
            }}>
              Political Biography
            </h2>
            <div style={{ lineHeight: 1.7, fontSize: '16px', color: '#14100d', fontFamily: FONT.body }}>
              <p style={{ marginBottom: '16px' }}>Shabana Mahmood, Labour MP for Birmingham Ladywood and now Home Secretary, has built one of the more substantial careers in the Starmer-era Labour Party. First elected in 2010, she has lasted through New Labour&apos;s aftershock, the Corbyn years, Labour&apos;s electoral collapse, its rebuild, and finally government. That alone says something. Many MPs enter Westminster, make three speeches, develop a taste for panels, and vanish into the upholstery. Mahmood has endured, adapted and risen.</p>

              <p style={{ marginBottom: '16px' }}>She is clearly one of Labour&apos;s sharpest political operators. Her role as National Campaign Co-ordinator from 2021 to 2023 mattered because Labour&apos;s campaign machine under Starmer became far more disciplined, data-driven and ruthless than in previous years.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
