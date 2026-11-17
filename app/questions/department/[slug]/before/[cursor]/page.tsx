import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DepartmentQuestionsView, { departmentQuestionsMetadata } from '../../../DepartmentQuestionsView';

// /questions/department/<slug>/before/<date>_<id>: the 25 questions before that one (F04 batch 2), a fixed keyset slice, so a
// static page built on first visit and rebuilt only when parliament_written_questions' tag is refreshed. Not indexed; the
// canonical is the department's first page.
export const revalidate = false; // A16: rebuilt only when parliament_written_questions changes, or on a deploy
export function generateStaticParams() { return []; }

const CURSOR = /^\d{4}-\d{2}-\d{2}_\d{1,10}$/;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; cursor: string }> }): Promise<Metadata> {
  const { slug, cursor } = await params;
  if (!CURSOR.test(cursor)) notFound();
  return departmentQuestionsMetadata(slug, cursor);
}

export default async function DepartmentQuestionsBefore({ params }: { params: Promise<{ slug: string; cursor: string }> }) {
  const { slug, cursor } = await params;
  if (!CURSOR.test(cursor)) notFound();
  return <DepartmentQuestionsView slug={slug} before={cursor} />;
}
