import type { Metadata } from 'next';
import QuestionsView, { type Search } from '../QuestionsView';

// /questions with any filter (A16 exception: search results, full text over about 194,000 written questions): next.config.ts
// rewrites /questions?<key>= here for each of its keys, so the address stays /questions?.... Not indexed; the canonical is
// /questions. The page reads the filters exactly as /questions did.
export const metadata: Metadata = {
  title: 'Written questions in Parliament',
  description: 'Search every written question since the July 2024 general election by words, MP or peer, department and date, with the answers as published.',
  alternates: { canonical: '/questions' },
  robots: { index: false, follow: true },
};

const KEYS = ['words', 'who', 'member', 'department', 'from', 'to', 'status', 'before', 'at', 'uin'] as const;

export default async function QuestionsSearch({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const s: Search = {};
  for (const k of KEYS) { const v = sp[k]; const one = Array.isArray(v) ? v[0] : v; if (one !== undefined) s[k] = one; }
  return <QuestionsView s={s} />;
}
