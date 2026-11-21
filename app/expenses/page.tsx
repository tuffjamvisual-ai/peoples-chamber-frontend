// /expenses: the latest year IPSA has published (ENTRY 495: 2025/26 by default; earlier years at /expenses/year/<yy_yy>).
import type { Metadata } from 'next';
import { latestExpensesYear, expensesYears } from '@/lib/expenses-year';
import { ExpensesView, expensesMetadata } from './ExpensesView';

export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

export async function generateMetadata(): Promise<Metadata> {
  return expensesMetadata(await latestExpensesYear(), '/expenses');
}

export default async function ExpensesPage() {
  const [year, years] = await Promise.all([latestExpensesYear(), expensesYears()]);
  return <ExpensesView year={year} years={years} />;
}
