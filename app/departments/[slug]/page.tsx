import Link from 'next/link';
import { notFound } from 'next/navigation';
import { departments } from '@/lib/departments';
import '../../components/magazine-layout.css';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import DepartmentClient from './DepartmentClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DepartmentPage({ params }: PageProps) {
  const { slug } = await params;
  const dept = departments.find((d) => d.slug === slug);
  if (!dept) notFound();

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
          ['/mps',         'MPs',            48,   11],
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
          href="/departments"
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
          ← Back to all departments
        </a>

        {/* Magazine hero — cream/ink */}
        <header style={{ marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85, transform: 'rotate(-0.2deg)' }}>
            UK Government · Department
          </p>
          <h1 style={{ fontSize: '52px', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)', lineHeight: 1.05 }}>
            {dept.name}
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '720px', marginBottom: '16px' }}>
            {dept.description}
          </p>
          {dept.controlZones && dept.controlZones.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {dept.controlZones.map((zone) => (
                <span
                  key={zone}
                  style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 600,
                    padding: '3px 8px',
                    color: '#7a1612',
                    border: '1px solid rgba(122,22,18,0.3)',
                    background: 'rgba(122,22,18,0.06)',
                  }}
                >
                  {zone}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Detail sections — keeps the existing client (still in dark theme for now) */}
        <DepartmentClient slug={slug} />

        <ScrollToTopButton />
      </div>
    </div>
  );
}
