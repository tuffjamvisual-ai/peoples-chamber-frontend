import { NextResponse } from 'next/server';
import { fetchMajorProject, ratingText, dateText, costText } from '@/lib/major-projects';

// One major project's years and the department's commentary (owner, 4 Nov 2026), loaded when its card is opened on a phone,
// so the list page stays small. Cached for a day like the list; a failed read throws, so an error is never cached.
export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { project } = await fetchMajorProject(decodeURIComponent(key));
  if (!project) return NextResponse.json({ years: [] }, { status: 404 });
  return NextResponse.json({
    id: project.id,
    years: [...project.years].reverse().map((y) => ({
      year: y.report_year,
      dataAsAt: y.data_as_at,
      rating: ratingText(y),
      end: dateText(y.end_date, y.end_text),
      cost: costText(y),
      commentary: [['Rating', y.rating_narrative], ['Schedule', y.schedule_narrative], ['Cost', y.cost_narrative]].filter(([, t]) => t),
    })),
  });
}
