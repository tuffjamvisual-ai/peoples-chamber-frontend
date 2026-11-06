import Link from 'next/link';
import { petitionDate, type MpPetitionsTop } from '@/lib/petition-pages';

const INK = '#14100d';

// The MP page's "Petitions in this constituency" (owner, 6 Nov 2026): the five most signed there, with a link to the rest.
export default function ConstituencyPetitions({ top, gss }: { top: MpPetitionsTop; gss: string }) {
  return (
    <section aria-labelledby="mp-constituency-petitions" style={{ margin: '0 0 36px', color: INK }}>
      <h2 id="mp-constituency-petitions" style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px' }}>Petitions in this constituency</h2>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {top.petitions.map((p) => (
          <li key={p.id} style={{ borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
            <Link href={`/petitions/${p.id}`} prefetch={false} style={{ display: 'block', minHeight: '44px', padding: '10px 0', color: INK, textDecoration: 'none' }}>
              <span style={{ display: 'block', fontSize: '16px', fontWeight: 'bold', lineHeight: 1.35, textDecoration: 'underline', overflowWrap: 'anywhere' }}>{p.title}</span>
              <span style={{ display: 'block', fontSize: '15px', marginTop: '2px' }}>{p.here.toLocaleString('en-GB')} signatures here, {p.total.toLocaleString('en-GB')} in total</span>
            </Link>
          </li>
        ))}
      </ol>
      {top.checkedOn && <p style={{ fontSize: '15px', margin: '8px 0 0' }}>Counts as checked on {petitionDate(top.checkedOn)}.</p>}
      <p style={{ fontSize: '15px', margin: '4px 0 0' }}><Link href={`/petitions?constituency=${gss}`} prefetch={false} style={{ display: 'inline-block', padding: '10px 0', color: INK }}>More petitions in this constituency</Link></p>
    </section>
  );
}
