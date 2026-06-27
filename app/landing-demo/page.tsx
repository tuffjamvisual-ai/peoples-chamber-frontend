import Link from 'next/link';
import type { Metadata } from 'next';
import './landing-demo.css';

export const metadata: Metadata = {
  title: "Open Govt, Clickable Landing Demo",
  robots: { index: false, follow: false },
};

// Hotspots ported verbatim from the zip's index.html (positions in %,
// hrefs kept as-authored). Several targets (/campaigns, /latest, /stories/…,
// /parliament, /economy, /nhs, /voices, /join) are placeholders that don't
// resolve to real routes yet — see the note in the chat.
type Hotspot = {
  href: string;
  label: string;
  top: number; left: number; width: number; height: number; // %
};

const hotspots: Hotspot[] = [
  { href: '/',           label: "Home: Open Govt masthead",                 left: 21.5, top: 3.2,  width: 53.5, height: 22.5 },
  { href: '/about',      label: 'About: No spin, no paywall, just the truth',          left: 4.2,  top: 10.1, width: 15.8, height: 12.6 },
  { href: '/campaigns',  label: 'Campaigns and investigations',                        left: 76.6, top: 3.3,  width: 19.7, height: 22.0 },
  { href: '/latest',     label: 'Latest briefings and top story',                      left: 4.1,  top: 27.0, width: 16.5, height: 38.0 },
  { href: '/stories/parliament-returns-after-easter-recess', label: 'Main hero story: Parliament returns after Easter recess', left: 22.0, top: 28.6, width: 21.4, height: 35.2 },
  { href: '/parliament', label: 'Parliament tracker and Westminster image',            left: 45.5, top: 28.4, width: 50.2, height: 34.3 },
  { href: '/economy',    label: 'Cost of living story',                                left: 4.0,  top: 68.0, width: 27.0, height: 25.5 },
  { href: '/nhs',        label: 'NHS story',                                           left: 34.0, top: 68.0, width: 28.0, height: 25.5 },
  { href: '/voices',     label: 'Voices from the Nation',                              left: 65.0, top: 68.0, width: 30.5, height: 25.5 },
  { href: '/join',       label: 'Join Open Govt',                      left: 19.0, top: 94.5, width: 67.5, height: 3.2 },
];

export default async function LandingDemo({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const { debug } = await searchParams;

  return (
    <main className="newspaper-stage">
      <div
        className={`newspaper-shell${debug !== undefined ? ' debug' : ''}`}
        aria-label="Open Govt clickable newspaper landing page"
      >
        {hotspots.map((h) => (
          <Link
            key={h.label}
            href={h.href}
            aria-label={h.label}
            className="newspaper-hotspot"
            style={{
              left: `${h.left}%`,
              top: `${h.top}%`,
              width: `${h.width}%`,
              height: `${h.height}%`,
            }}
          >
            {h.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
