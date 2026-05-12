import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBills } from '@/lib/data';
import MagazineNav from '../components/MagazineNav';
import MagazineFooter from '../components/MagazineFooter';
import './bills-magazine.css';

export const revalidate = 600;
const PAGE_SIZE = 20;

export const metadata: Metadata = {
  title: 'Bills',
  description:
    'Every bill going through UK Parliament. How MPs voted. How you voted. The gap between the two.',
  alternates: { canonical: '/bills' },
};

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw || '1', 10) || 1);

  const bills = await getAllBills();
  const acts = bills.filter((b) => b.is_act).length;
  const totalVotes = bills.reduce(
    (s, b) => s + (b.vote_count_yes || 0) + (b.vote_count_no || 0) + (b.vote_count_abstain || 0),
    0,
  );

  const totalPages = Math.max(1, Math.ceil(bills.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageBills = bills.slice(start, start + PAGE_SIZE);

  return (
    <main className="mag-bills-stage">
      <MagazineNav />

      <div className="mag-bills-body">
        <header className="mag-bills-header">
          <div>
            <span className="kicker">Bills · Issue 23</span>
            <h1>
              Every bill. <em>Every vote.</em>
            </h1>
            <p className="lede">
              Every bill going through UK Parliament. How MPs voted, how you
              voted, and the gap between the two. Updated daily from official
              Parliament feeds.
            </p>
          </div>

          <div className="mag-bills-stats">
            <div>
              <strong>{bills.length.toLocaleString()}</strong>
              <span>Bills tracked</span>
            </div>
            <div>
              <strong>{acts.toLocaleString()}</strong>
              <span>Acts passed</span>
            </div>
            <div>
              <strong>{totalVotes.toLocaleString()}</strong>
              <span>Public votes</span>
            </div>
          </div>
        </header>

        <section className="mag-bills-grid">
          {pageBills.map((bill) => {
            const yes = bill.vote_count_yes || 0;
            const no = bill.vote_count_no || 0;
            const abs = bill.vote_count_abstain || 0;
            const total = yes + no + abs;
            const yesPct = total > 0 ? Math.round((yes / total) * 100) : 0;
            const noPct = total > 0 ? Math.round((no / total) * 100) : 0;
            const absPct = total > 0 ? Math.max(0, 100 - yesPct - noPct) : 0;

            return (
              <Link key={bill.id} href={`/bills/${bill.id}`} className="mag-bill">
                <span className="tab">
                  {bill.is_act ? 'Act' : bill.bill_withdrawn ? 'Withdrawn' : 'Bill File'}
                </span>
                {bill.current_stage && <span className="stage">{bill.current_stage}</span>}
                <h3>{bill.title}</h3>

                <div className="tally-bar">
                  {yesPct > 0 && <span className="yes" style={{ width: `${yesPct}%` }} />}
                  {noPct > 0 && <span className="no" style={{ width: `${noPct}%` }} />}
                  {absPct > 0 && <span className="abs" style={{ width: `${absPct}%` }} />}
                </div>
                <div className="tally-nums">
                  <span>✓ {yesPct}%</span>
                  <span>{total.toLocaleString()} votes</span>
                  <span>✗ {noPct}%</span>
                </div>
              </Link>
            );
          })}
        </section>

        <Pagination page={safePage} totalPages={totalPages} />
      </div>

      <MagazineFooter />
    </main>
  );
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const pageHref = (p: number) => (p === 1 ? '/bills' : `/bills?page=${p}`);

  const pages: (number | 'gap')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== 'gap') {
      pages.push('gap');
    }
  }

  return (
    <nav className="mag-pagination" aria-label="Bills pagination">
      {page > 1 && <Link href={pageHref(page - 1)}>← Prev</Link>}
      {pages.map((p, i) =>
        p === 'gap' ? (
          <span key={`g${i}`} className="gap">…</span>
        ) : p === page ? (
          <span key={p} className="current" aria-current="page">{p}</span>
        ) : (
          <Link key={p} href={pageHref(p)}>{p}</Link>
        ),
      )}
      {page < totalPages && <Link href={pageHref(page + 1)}>Next →</Link>}
    </nav>
  );
}
