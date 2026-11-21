// /expenses/year/<yy_yy>: an earlier year's ten highest business costs (ENTRY 495: 2024/25 stays selectable). The latest
// year lives at /expenses; its address here sends readers there. Unknown years are a real 404.
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { expensesYears } from '@/lib/expenses-year';
import { ExpensesView, expensesMetadata } from '../../ExpensesView';

export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy
export function generateStaticParams() { return []; }

type Params = { params: Promise<{ year: string }> };

async function pick(params: Params['params']) {
  const { year } = await params;
  const years = await expensesYears();
  if (!/^\d\d_\d\d$/.test(year) || !years.includes(year)) notFound();
  if (year === years[0]) permanentRedirect('/expenses');
  return { year, years };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { year } = await pick(params);
  return expensesMetadata(year, `/expenses/year/${year}`);
}

export default async function ExpensesYearPage({ params }: Params) {
  const { year, years } = await pick(params);
  return <ExpensesView year={year} years={years} />;
}
