import Link from 'next/link';
import type { LinkedEdm, MpEdmsTop } from '@/lib/edm-pages';

const INK = '#14100d';

const List = ({ title, items }: { title: string; items: LinkedEdm[] }) => (items.length === 0 ? null : (
  <>
    <h3 style={{ fontSize: '17px', fontWeight: 'bold', margin: '12px 0 4px' }}>{title}</h3>
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((m) => (
        <li key={m.id} style={{ borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
          <Link href={`/edms/${m.id}`} prefetch={false} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '6px 0', fontSize: '16px', lineHeight: 1.35, color: INK, textDecoration: 'underline', overflowWrap: 'anywhere' }}>{m.title}</Link>
        </li>
      ))}
    </ul>
  </>
));

// The MP page's "Early day motions" (owner, 6 Nov 2026): the latest 5 tabled and the latest 5 signed, with a link to the rest.
export default function MpEdmsSection({ top, memberId }: { top: MpEdmsTop; memberId: number }) {
  return (
    <section aria-labelledby="mp-edms-short" style={{ margin: '0 0 36px', color: INK }}>
      <h2 id="mp-edms-short" style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px' }}>Early day motions</h2>
      <List title="Latest tabled" items={top.tabled} />
      <List title="Latest signed" items={top.signed} />
      <p style={{ fontSize: '15px', margin: '8px 0 0' }}><Link href={`/edms?member=${memberId}`} prefetch={false} style={{ display: 'inline-block', padding: '10px 0', color: INK, textDecoration: 'underline' }}>More early day motions from this MP</Link></p>
    </section>
  );
}
