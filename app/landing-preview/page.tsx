import Image from 'next/image';
import Link from 'next/link';

// Image-map landing preview: the landing.png mockup as a fixed-aspect
// backdrop with clickable hotspots layered on top. The wrapper is locked
// to the image's intrinsic 1023x1537 ratio (max-width capped) so the
// percentage hotspots map to the same regions at any viewport width —
// object-cover would crop and break that mapping.
//
// Hotspots render as translucent labelled boxes while we calibrate;
// add ?clean to the URL to hide the boxes and preview the real feel.

type Hotspot = {
  href: string;
  label: string;
  top: number; left: number; width: number; height: number; // all %
};

// First-pass coordinates, eyeballed from the 1023x1537 mockup. Tune
// against the rendered screenshot.
const hotspots: Hotspot[] = [
  { href: '/bills',    label: 'Bills (hero)',     top: 21, left: 7,  width: 42, height: 19 },
  { href: '/mps',      label: 'MPs (Parliament)', top: 21, left: 50, width: 43, height: 19 },
  { href: '/bills',    label: 'Health & Care Bill', top: 48, left: 7,  width: 31, height: 14 },
  { href: '/polls',    label: 'Street View → Polls', top: 48, left: 40, width: 21, height: 14 },
  { href: '/bills',    label: 'Bills to Watch',   top: 40, left: 63, width: 30, height: 22 },
  { href: '/expenses', label: 'Tax pie → Expenses', top: 63, left: 7,  width: 31, height: 15 },
  { href: '/mps',      label: 'Portraits → MPs',  top: 63, left: 40, width: 53, height: 15 },
  { href: '/polls',    label: '72% → Polls',      top: 80, left: 7,  width: 86, height: 13 },
];

export default async function LandingPreview({
  searchParams,
}: {
  searchParams: Promise<{ clean?: string }>;
}) {
  const { clean } = await searchParams;
  const debug = clean === undefined;

  return (
    <div
      className="relative mx-auto w-full max-w-[1023px]"
      style={{ fontFamily: 'var(--font-typewriter)' }}
    >
      <Image
        src="/landing-mockup.png"
        alt="opengovt — landing page mockup"
        width={1023}
        height={1537}
        priority
        className="block h-auto w-full select-none"
      />

      {hotspots.map((h) => (
        <Link
          key={h.label}
          href={h.href}
          aria-label={h.label}
          className={
            'absolute block transition-colors ' +
            (debug
              ? 'bg-red-500/20 outline outline-2 outline-red-600 hover:bg-red-500/40'
              : 'hover:bg-white/10')
          }
          style={{
            top: `${h.top}%`,
            left: `${h.left}%`,
            width: `${h.width}%`,
            height: `${h.height}%`,
          }}
        >
          {debug && (
            <span className="absolute left-0 top-0 bg-red-600 px-1 text-[15px] font-bold leading-tight text-white">
              {h.label}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
