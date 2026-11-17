import type { Metadata } from 'next';
import QuestionsView from './QuestionsView';

// Written questions (F04 batch 3, A16): static, the newest first with no filter, rebuilt only when its tags are refreshed or on
// a deploy. Any filter (/questions?words=, ?who=, ?department=, ...) is rewritten to /questions/search and keeps its address.
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Written questions in Parliament',
  description: 'Search every written question since the July 2024 general election by words, MP or peer, department and date, with the answers as published.',
  alternates: { canonical: '/questions' },
};

export default function QuestionsPage() {
  return <QuestionsView s={{}} />;
}
