import { namedTitle } from '@/lib/seo-title';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { departments } from '@/lib/departments';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dept = departments.find((d) => d.slug === slug);
  if (!dept) return { title: 'Department' };
  return {
    // T1-A3 (6) (owner approved): what the page holds, after the name; the name is never cut (lib/seo-title.ts).
    title: namedTitle(dept.name, (n) => [`${n}: ministers, budget and grants`, `${n}: ministers and budget`, n]),
    description: `${dept.name}, ministers, control zones and what every party says about each topic.`,
    alternates: { canonical: `/departments/${slug}` },
  };
}

// Server-side slug validation. notFound() inside generateMetadata is
// flaky across Next.js versions — calling it from the layout body is
// the reliable way to return a real 404 status.
export default async function DepartmentSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  if (!departments.find((d) => d.slug === slug)) notFound();
  return children;
}
