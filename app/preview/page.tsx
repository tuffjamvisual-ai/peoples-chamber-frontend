import Image from 'next/image';
import Link from 'next/link';
import MagazineShell from '../components/MagazineShell';

export const revalidate = 3600;

// 9-card landing-card layout on the shared MagazineShell (same chrome as
// /bills, /laws, /mps). Candidate to replace the standalone Tailwind
// landing at /.

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
    <MagazineShell>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {linkCards.map((card) => (
          <Link
            key={card.src}
            href={card.href}
            aria-label={card.alt}
            className={`relative block overflow-hidden rounded-sm ${card.gridClass}`}
          >
            <Image
              src={card.src}
              alt=""
              width={card.width}
              height={card.height}
              className="h-full w-full object-cover"
              priority={card.priority}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </Link>
        ))}
      </div>
    </MagazineShell>
  );
}
