'use client';
// Shows one of two server-built pieces of a page by today's date in London (owner, 15 Nov 2026, COWORK-TO-T1 ENTRY 140):
// `passed` once the month given is over, otherwise `before`. The first render uses the day the server rendered the page
// (so the HTML matches and nothing moves); the browser then checks today (useToday). Pages are never rebuilt for the date.
import type { ReactNode } from 'react';
import { monthPassed } from '@/lib/london-date';
import { useToday } from './useToday';

export default function OnDate({ month, renderedOn, before, passed }: { month: string | null; renderedOn: string; before: ReactNode; passed: ReactNode }) {
  const today = useToday(renderedOn);
  return <>{month && monthPassed(month, today) ? passed : before}</>;
}
