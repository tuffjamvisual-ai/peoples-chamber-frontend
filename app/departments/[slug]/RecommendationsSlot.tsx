'use client';
// The department page's "Recommendations" tab (see RecommendationsData.ts for what it shows). Sorted into its lists here,
// in the browser, by today's date in London (ENTRY 140): a target still to come moves to "target passed" once its
// month is over without the page being rebuilt. The first render uses the day the page was rendered (useToday).
import Link from 'next/link';
import { onDay } from '@/lib/pac-dated';
import { useToday } from '../../components/useToday';
import type { DepartmentRecommendations, DeptItem } from './RecommendationsData';

type Item = { href: string; title: string; status: string; later?: DeptItem['later'] };
const OPEN = new Set(['target_in_future', 'no_dated_target']);
const DELIVERED = new Set(['implemented', 'delivered_elsewhere']);
const CLOSED = new Set(['implemented', 'delivered_elsewhere', 'split', 'rejected', 'report_completed', 'not_listed_in_later_update']);
const SHORT = 5;

const INK = '#14100d';
const H2 = 'text-[15px] uppercase tracking-[0.25em] mb-4 font-semibold';
const link: React.CSSProperties = { color: INK, textDecoration: 'underline', textUnderlineOffset: '2px' };

function List({ heading, items, more }: { heading: string; items: Item[]; more?: { count: number; href: string } }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: '22px' }}>
      <h2 className={H2} style={{ color: INK }}>{heading}</h2>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((i) => (
          <li key={i.href} style={{ borderBottom: '1px dotted rgba(20,16,13,0.15)', padding: '10px 0' }}>
            <Link href={i.href} className="no-hover-scale" style={{ display: 'block', color: INK, textDecoration: 'none' }}>
              <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.45, fontWeight: 600, overflowWrap: 'anywhere' }}>{i.title}</span>
              <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '3px', overflowWrap: 'anywhere' }}>{i.status}</span>
            </Link>
            {i.later && (
              <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '3px', color: INK, overflowWrap: 'anywhere' }}>
                {i.later.map((s, k) => (s.href ? <a data-og-row-source="" key={k} href={s.href} style={link}>{s.text}</a> : <span key={k}>{s.text}</span>))}
              </span>
            )}
          </li>
        ))}
      </ol>
      {more && more.count > items.length && (
        <p style={{ fontSize: '15px', margin: '8px 0 0' }}><Link href={more.href} style={link}>See all {more.count}</Link></p>
      )}
    </div>
  );
}

export function RecommendationsSlot({ data: given }: { data: DepartmentRecommendations }) {
  const today = useToday(given.renderedOn);
  const mine = given.items.map((i) => { const [key, words] = onDay(i.status, today); return { ...i, key, words }; });
  const item = (r: (typeof mine)[number]): Item => ({ href: r.href, title: r.title, status: r.words, later: r.later });
  const of = (keys: Set<string>) => mine.filter((r) => keys.has(r.key));
  const data = {
    slug: given.slug, related: given.related,
    open: of(OPEN).map(item),
    moved: mine.filter((r) => r.moved && !CLOSED.has(r.key)).map(item),
    checked: mine.filter((r) => r.key === 'target_passed_checked').map(item),
    beingChecked: mine.filter((r) => r.key === 'target_passed_unchecked').map(item),
    delivered: of(DELIVERED).slice(0, SHORT).map(item),
    rejected: mine.filter((r) => r.key === 'rejected').slice(0, SHORT).map(item),
  };
  const c = { open: of(OPEN).length, delivered: of(DELIVERED).length, rejected: mine.filter((r) => r.key === 'rejected').length, beingChecked: data.beingChecked.length };
  const all = `/recommendations?department=${data.slug}`;
  const by = (status: string) => `${all}&status=${status}`;
  return (
    <section>
      <p style={{ fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 8px' }}>
        Recommendations the Committee of Public Accounts made to this department, from the government’s Treasury Minutes.{' '}
        <Link href={all} style={link}>All recommendations for this department</Link>
      </p>
      <p style={{ fontSize: '15px', lineHeight: 1.6, color: INK, fontWeight: 600, margin: '0 0 18px' }}>
        Open: {c.open}. Delivered: {c.delivered}. Rejected: {c.rejected}. Target passed, being checked: {c.beingChecked}.
      </p>
      {data.related.map((b) => (
        <p key={b.key} style={{ fontSize: '15px', lineHeight: 1.6, color: INK, margin: '-10px 0 18px' }}>
          Also: <Link href={`/recommendations?department=${b.key}`} style={link}>{b.name}</Link> ({b.role})
        </p>
      ))}
      <List heading="Still open" items={data.open} more={{ count: c.open, href: by('open') }} />
      <List heading="Targets moved" items={data.moved} />
      <List heading="Target passed, being checked" items={data.beingChecked} more={{ count: c.beingChecked, href: by('target_passed') }} />
      <List heading="Target passed, checked by opengovt" items={data.checked} more={{ count: data.checked.length, href: by('target_passed') }} />
      <List heading="Delivered" items={data.delivered} more={{ count: c.delivered, href: by('delivered') }} />
      <List heading="Rejected" items={data.rejected} more={{ count: c.rejected, href: by('rejected') }} />
    </section>
  );
}
