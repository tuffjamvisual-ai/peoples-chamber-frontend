import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import '../../components/magazine-layout.css';
import ScrollToTopButton from '../../components/ScrollToTopButton';

export const revalidate = 600;

// Preview route — render on-demand only, do not prerender 650 variants.
export async function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewHome2Dynamic({ params }: PageProps) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) notFound();

  const [bioRes, mpRes] = await Promise.all([
    supabase.from('mp_biography').select('political_bio').eq('member_id', memberId).single(),
    supabase
      .from('mps')
      .select('photo_url, display_name, name, party, constituency, party_colour')
      .eq('member_id', memberId)
      .single(),
  ]);
  const bio = bioRes.data;
  const mp = mpRes.data;
  if (!mp) notFound();

  const fullName = mp.display_name || mp.name || '';
  const partyColour = mp.party_colour ? `#${mp.party_colour.replace('#', '')}` : '#7697a2';

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
      backgroundImage:
        'url("/preview-header.webp"), url("/preview-footer.webp"), url("/preview-middle.webp")',
      backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
      backgroundPosition: 'top center, bottom center, top center',
      backgroundSize: '100% auto, 100% auto, 100% auto',
    }}>
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

      {/* Header nav hotspots — overlay matches preview-header.webp (1023x330) */}
      <nav
        aria-label="Site"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          aspectRatio: '1023 / 330',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        {([
          ['/',            'Home',           5,    9],
          ['/bills',       'Bills',          16,   8],
          ['/laws',        'Laws',           25,   7],
          ['/polls',       "People's Polls", 34,   14],
          ['/mps',         'MPs',            50,   7],
          ['/departments', 'Departments',    59,   15],
          ['/login',       'Login',          76,   8],
          ['/about',       'About',          87,   9],
        ] as const).map(([href, label, left, width]) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            style={{
              position: 'absolute',
              top: '80%',
              left: `${left}%`,
              width: `${width}%`,
              height: '18%',
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
          />
        ))}
      </nav>

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
        <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '40px', marginBottom: '30px' }}>
          <div style={{
            position: 'relative',
            background: '#ebe5d8',
            padding: '12px 12px 48px 12px',
            width: '284px',
            marginTop: '-20px',
            marginRight: '-40px',
            transform: 'rotate(15deg)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
            filter: 'contrast(1.05) brightness(0.98)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mp.photo_url ?? ''}
              alt={fullName}
              width={260}
              height={260}
              style={{ display: 'block', width: '260px', height: '260px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/paperclip.png"
              alt=""
              aria-hidden
              style={{
                position: 'absolute',
                top: '-30px',
                right: '-5px',
                width: '65px',
                height: 'auto',
                transform: 'rotate(180deg)',
                transformOrigin: 'center',
                pointerEvents: 'none',
                zIndex: 3,
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))',
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '38px',
              marginTop: '20px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: '#14100d',
              fontFamily: 'Special Elite, monospace',
              transform: 'rotate(-0.3deg)',
              textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
              letterSpacing: '-0.02em',
            }}>
              {fullName}
            </h1>
            <p style={{ fontSize: '22px', marginBottom: '8px', color: '#14100d', transform: 'rotate(0.2deg)' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: partyColour, marginRight: '8px' }}></span>
              {[mp.party, mp.constituency].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-px" style={{ marginTop: '-80px' }}>
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-16">
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 8px 8px' }}>
                <Link href={`/mps/${memberId}#bio`} style={{
                  padding: '12px 16px',
                  borderLeft: '4px solid #7a1612',
                  background: 'rgba(122,22,18,0.08)',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  transform: 'rotate(0.1deg)',
                  boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.05)',
                  color: '#14100d',
                  textDecoration: 'none',
                }}>POLITICAL BIO</Link>
                <Link href={`/mps/${memberId}#contact`} style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(-0.1deg)', textDecoration: 'none' }}>CONTACT</Link>
                <Link href={`/mps/${memberId}#voting`} style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(0.15deg)', textDecoration: 'none' }}>VOTING RECORD</Link>
                <Link href={`/mps/${memberId}#bills`} style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(-0.2deg)', textDecoration: 'none' }}>BILLS SPONSORED</Link>
                <Link href={`/mps/${memberId}#interests`} style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(0.1deg)', textDecoration: 'none' }}>INTERESTS</Link>
                <Link href={`/mps/${memberId}#roles`} style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(-0.15deg)', textDecoration: 'none' }}>ROLES</Link>
                <Link href={`/mps/${memberId}#earnings`} style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(0.2deg)', textDecoration: 'none' }}>EARNINGS</Link>
                <Link href={`/mps/${memberId}#expenses`} style={{ padding: '12px 16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#14100d', transform: 'rotate(-0.1deg)', textDecoration: 'none' }}>EXPENSES</Link>
              </nav>
            </div>
          </aside>

          <div className="lg:col-span-3 p-6 sm:p-8">
            <h2 style={{
              fontSize: '26px',
              fontWeight: 'bold',
              marginBottom: '24px',
              color: '#14100d',
              fontFamily: 'Special Elite, monospace',
              transform: 'rotate(-0.2deg)',
              textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.15)',
            }}>
              Political Biography
            </h2>
            <div style={{ lineHeight: '1.8', fontSize: '16px', color: '#14100d', letterSpacing: '0.01em' }}>
              {paragraphs.length === 0 ? (
                <p style={{ marginBottom: '16px', opacity: 1 }}>Biography unavailable.</p>
              ) : (
                paragraphs.map((para: string, idx: number) => {
                  const tilt = idx % 4;
                  const rot =
                    tilt === 0 ? '0.1deg' : tilt === 1 ? '-0.15deg' : tilt === 2 ? '0.08deg' : '-0.1deg';
                  return (
                    <p key={idx} style={{ marginBottom: '16px', transform: `rotate(${rot})`, opacity: 1 }}>
                      {para}
                    </p>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <ScrollToTopButton />
      </div>
    </div>
  );
}
