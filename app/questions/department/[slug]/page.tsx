import type { Metadata } from 'next';
import DepartmentQuestionsView, { departmentQuestionsMetadata } from '../DepartmentQuestionsView';

// One answering department's written questions, newest first, 25 at a time (owner, 6 Nov 2026). Static (F04 batch 2): the
// next 25 are /questions/department/<slug>/before/<cursor>, and an old ?before= address moves there (next.config.ts).
export const revalidate = false; // A16: rebuilt only when parliament_written_questions changes, or on a deploy
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return departmentQuestionsMetadata((await params).slug, null);
}

export default async function DepartmentQuestions({ params }: { params: Promise<{ slug: string }> }) {
  return <DepartmentQuestionsView slug={(await params).slug} before={null} />;
}
