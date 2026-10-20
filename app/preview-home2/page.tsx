import { SHOW_DEMO_PAGES } from '@/lib/feature-flags';
import { notFound, redirect } from 'next/navigation';

export default function PreviewHome2Redirect() {
  if (!SHOW_DEMO_PAGES) notFound(); // hidden (lib/feature-flags.ts)
  redirect('/preview-home2/3914');
}
