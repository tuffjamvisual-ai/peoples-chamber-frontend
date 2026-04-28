import type { Metadata } from 'next';
import { departments } from '@/lib/departments';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dept = departments.find((d) => d.slug === slug);
  if (!dept) return { title: 'Department' };
  return {
    title: dept.name,
    description: `${dept.name} — ministers, control zones and what every party says about each topic.`,
    alternates: { canonical: `/departments/${slug}` },
  };
}

export default function DepartmentSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
