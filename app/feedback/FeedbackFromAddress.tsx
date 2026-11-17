'use client';

import type { ComponentProps } from 'react';
import { useSearchParams } from 'next/navigation';
import { cleanFrom } from '@/lib/feedback';
import BackLink from '../components/BackLink';
import FeedbackForm from './FeedbackForm';

// /feedback?from=<path> read in the browser (F04 batch 2), so the page itself is static. cleanFrom keeps only a path of
// ours; the API cleans it again.
const useFrom = () => cleanFrom(useSearchParams().get('from') ?? '');

export function FeedbackFormFromAddress() {
  return <FeedbackForm from={useFrom()} />;
}

export function BackLinkFromAddress(props: Omit<ComponentProps<typeof BackLink>, 'fallbackHref'>) {
  const from = useFrom();
  return <BackLink {...props} fallbackHref={from || '/'} />;
}
