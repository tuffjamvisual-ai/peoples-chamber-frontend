import Link from 'next/link';
import Image from 'next/image';
import MagazineShell from './components/MagazineShell';

export const revalidate = 3600;

type Card = {
  id: string;
  title: string;
  href: string;
  src: string;
  width: number;
  height: number;
  span: string;
  priority?: boolean;
};

// Landing-page link cards. 9 content tiles (the bundle's nav_header /
// footer_brand / footer_links PNGs are skipped because MagazineShell
// already renders those as HTML). Dead routes from the manifest
// (/parliament, /cover-story, /street-view) are mapped to live pages.
const cards: Card[] = [
  {
    id: 'hero_power',
    title: "Power Isn't Hidden. It's Published.",
    href: '/bills',
    src: '/link-cards/hero_power.png',
    width: 400,
    height: 385,
    span: 'lg:col-span-5',
    priority: true,
  },
  {
    id: 'hero_illustration',
    title: 'Parliament street scene',
    href: '/bills',
    src: '/link-cards/hero_illustration.png',
    width: 560,
    height: 385,
    span: 'lg:col-span-7',
    priority: true,
  },
  {
    id: 'cover_story',
    title: 'Cover story: The Bill of Their Lives',
    href: '/bills',
    src: '/link-cards/cover_story.png',
    width: 460,
    height: 305,
    span: 'lg:col-span-5',
  },
  {
    id: 'street_view',
    title: 'Street View',
    href: '/mps',
    src: '/link-cards/street_view.png',
    width: 250,
    height: 305,
    span: 'lg:col-span-3',
  },
  {
    id: 'bills_to_watch',
    title: 'Bills to Watch',
    href: '/bills',
    src: '/link-cards/bills_to_watch.png',
    width: 250,
    height: 420,
    span: 'lg:col-span-4 lg:row-span-2',
  },
  {
    id: 'follow_money',
    title: 'Where Your Tax Really Goes',
    href: '/expenses',
    src: '/link-cards/follow_money.png',
    width: 465,
    height: 187,
    span: 'lg:col-span-5',
  },
  {
    id: 'whos_who',
    title: "Who's Who",
    href: '/mps',
    src: '/link-cards/whos_who.png',
    width: 380,
    height: 150,
    span: 'lg:col-span-3',
  },
  {
    id: 'see_all_bills_button',
    title: 'See all bills',
    href: '/bills',
    src: '/link-cards/see_all_bills_button.png',
    width: 132,
    height: 74,
    span: 'lg:col-span-3',
  },
  {
    id: 'poll_strip',
    title: 'Weekly Poll',
    href: '/polls',
    src: '/link-cards/poll_strip.png',
    width: 835,
    height: 82,
    span: 'lg:col-span-12',
  },
];

export default function HomePage() {
  return (
    <MagazineShell activeHref="/">
      <section className="link-card-grid" aria-label="Browse">
        {cards.map((card) => {
          const spanStyle = spanToGridColumn(card.span);
          return (
            <Link
              key={card.id}
              href={card.href}
              aria-label={card.title}
              className="link-card no-hover-scale"
              style={spanStyle}
            >
              <Image
                src={card.src}
                alt=""
                width={card.width}
                height={card.height}
                priority={card.priority}
                sizes="(max-width: 560px) 100vw, (max-width: 860px) 50vw, 33vw"
              />
            </Link>
          );
        })}
      </section>
    </MagazineShell>
  );
}

// Translates the manifest's Tailwind-style span strings into inline
// `grid-column` / `grid-row` style values so the cards work inside the
// CSS grid defined in magazine-shell.css without depending on Tailwind
// for layout.
function spanToGridColumn(span: string): React.CSSProperties {
  const styles: React.CSSProperties = {};
  const colMatch = span.match(/(?:^|\s)lg:col-span-(\d+)/);
  const rowMatch = span.match(/(?:^|\s)lg:row-span-(\d+)/);
  if (colMatch) styles.gridColumn = `span ${colMatch[1]} / span ${colMatch[1]}`;
  if (rowMatch) styles.gridRow = `span ${rowMatch[1]} / span ${rowMatch[1]}`;
  return styles;
}
