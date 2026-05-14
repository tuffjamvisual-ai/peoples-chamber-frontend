import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import MagazineMPsClient from './MagazineMPsClient';
import '../components/magazine-layout.css';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'MPs',
  description:
    'Search and explore profiles of all 650 current Members of Parliament including voting records, financial interests and contact details.',
  alternates: { canonical: '/mps' },
};

export default async function MPsPage() {
  const { data: rows, error } = await supabase
    .from('mps')
    .select('member_id, name, display_name, party, party_colour, constituency, photo_url')
    .eq('current_member', true)
    .order('name', { ascending: true });

  if (error) console.error('Error fetching MPs:', error);

  // Collapse name + display_name to a single resolved name server-side,
  // and drop the now-unused id column. Trims ~30 KB off the inline RSC
  // payload (~150 KB → ~120 KB) on /mps with all 650 MPs.
  const mps = (rows || []).map((r) => ({
    member_id: r.member_id,
    name: r.display_name || r.name || '',
    party: r.party,
    party_colour: r.party_colour,
    constituency: r.constituency,
    photo_url: r.photo_url,
  }));

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

      <div className="magazine-content-spacing" style={{ position: 'relative', zIndex: 2 }}>
        <Suspense fallback={<div style={{ minHeight: '400px' }} />}>
          <MagazineMPsClient mps={mps} />
        </Suspense>
      </div>
    </div>
  );
}
