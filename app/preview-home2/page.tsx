import Image from 'next/image';

export default function PreviewHome2() {
  return (
    <div style={{ position: 'relative', width: '1024px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Template background */}
      <Image
        src="/preview-home2.png"
        alt=""
        fill
        unoptimized
        style={{ objectFit: 'contain', objectPosition: 'top center', zIndex: 0 }}
      />

      {/* Shabana Mahmood content overlay */}
      <div style={{ position: 'relative', zIndex: 1, padding: '400px 60px 60px 60px' }}>
        <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
          <div style={{
            background: '#fff',
            padding: '12px 12px 48px 12px',
            width: '240px',
            transform: 'rotate(-2deg)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://members-api.parliament.uk/api/Members/3914/Portrait?cropType=ThreeFour"
              alt="Shabana Mahmood"
              width="240"
              height="300"
              style={{ display: 'block' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>
              Shabana Mahmood
            </h1>
            <p style={{ fontSize: '20px', marginBottom: '8px' }}>
              Labour • Birmingham Ladywood
            </p>
            <p style={{ fontSize: '14px' }}>
              Member since 6 May 2010
            </p>
          </div>
        </div>

        <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
          Political Biography
        </h2>
        <div style={{ lineHeight: '1.6' }}>
          <p>
            Shabana Mahmood, Labour MP for Birmingham Ladywood and now Home Secretary,
            has built one of the more substantial careers in the Starmer-era Labour
            Party. First elected in 2010, she has lasted through New Labour&apos;s
            aftershock, the Corbyn years, Labour&apos;s electoral collapse, its
            rebuild, and finally government.
          </p>
        </div>
      </div>
    </div>
  );
}
