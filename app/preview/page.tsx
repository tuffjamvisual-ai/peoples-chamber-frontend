import Image from 'next/image';
import Link from 'next/link';
import MagazineNav from '../components/MagazineNav';
import '../components/magazine-layout.css';

export const revalidate = 3600;

// 9-card preview that mirrors the existing magazine-template wrapper
// (#2a1810 paper background + preview-header/footer chrome + 8-hotspot
// MagazineNav + viewport-scaled `.magazine-content-spacing`). Identical
// shell to /bills, /laws, /mps so this can be compared against the
// standalone Tailwind landing at / before any swap is made.

type Card = {
  src: string;
  href: string;
  alt: string;
  width: number;
  height: number;
  gridClass: string;
  priority?: boolean;
};

const linkCards: Card[] = [
  // Row 1 — hero pair
  {
    src: '/link-cards/hero_power.png',
    href: '/bills',
    alt: "Power isn't hidden, it's published — explore Parliament",
    width: 400, height: 385,
    gridClass: 'col-span-1 md:col-span-5 md:row-span-2',
    priority: true,
  },
  {
    src: '/link-cards/hero_illustration_1779025435.png',
    href: '/unite-kingdom',
    alt: 'Unite the Kingdom',
    width: 1536, height: 1024,
    gridClass: 'col-span-1 md:col-span-7 md:row-span-2',
    priority: true,
  },

  // Row 2
  {
    src: '/link-cards/cover_story.png',
    href: '/bills',
    alt: 'Cover story: The Bill of Their Lives',
    width: 460, height: 305,
    gridClass: 'col-span-1 md:col-span-6',
  },
  {
    src: '/link-cards/street_view.png',
    href: '/polls',
    alt: 'Street View — real voices, real opinions, no filter',
    width: 250, height: 305,
    gridClass: 'col-span-1 md:col-span-3',
  },
  {
    src: '/link-cards/bills_to_watch.png',
    href: '/bills',
    alt: 'Bills to Watch — track current legislation',
    width: 250, height: 420,
    gridClass: 'col-span-1 md:col-span-3 md:row-span-2',
  },

  // Row 3
  {
    src: '/link-cards/follow_money.png',
    href: '/expenses',
    alt: 'Follow the money — where your tax really goes',
    width: 465, height: 187,
    gridClass: 'col-span-1 md:col-span-6',
  },
  {
    src: '/link-cards/whos_who.png',
    href: '/mps',
    alt: "Who's Who — meet your MPs",
    width: 380, height: 150,
    gridClass: 'col-span-1 md:col-span-3',
  },

  // Row 4 — poll strip + see-all button
  {
    src: '/link-cards/poll_strip.png',
    href: '/polls',
    alt: 'Weekly poll: take part',
    width: 835, height: 82,
    gridClass: 'col-span-1 md:col-span-9',
  },
  {
    src: '/link-cards/see_all_bills_button.png',
    href: '/bills',
    alt: 'See all bills',
    width: 132, height: 74,
    gridClass: 'col-span-1 md:col-span-3',
  },
];

export default function PreviewPage() {
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

      <MagazineNav />

      <div
        className="magazine-content-spacing"
        style={{
          position: 'relative',
          zIndex: 2,
          color: '#14100d',
          fontFamily: 'Special Elite, monospace',
        }}
      >
        <header style={{ marginBottom: '24px' }}>
          <p
            style={{
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              opacity: 0.7,
              marginBottom: '8px',
            }}
          >
            Preview · landing-card layout
          </p>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: 'bold',
              letterSpacing: '-0.02em',
              transform: 'rotate(-0.3deg)',
              margin: 0,
            }}
          >
            The People&rsquo;s Chamber
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {linkCards.map((card) => (
            <Link
              key={card.src}
              href={card.href}
              aria-label={card.alt}
              className={`group relative block overflow-hidden rounded-sm shadow-[3px_3px_0_rgba(20,16,13,0.15)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(20,16,13,0.2)] ${card.gridClass}`}
            >
              <Image
                src={card.src}
                alt=""
                width={card.width}
                height={card.height}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
                priority={card.priority}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
