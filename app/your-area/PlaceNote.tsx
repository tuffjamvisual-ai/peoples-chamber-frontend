'use client';
// The place a reader searched for, from the address (?place=), on a council's static /your-area page (F04 batch 4). A label
// only, never looked up, read in the browser so the page stays static (A16). Cleaned as the page cleaned it before; the style is the shared para (Shell.tsx), copied so no server file enters the browser bundle.
import { useSearchParams } from 'next/navigation';

export default function PlaceNote() {
  const place = (useSearchParams().get('place') ?? '').replace(/[^\p{L}\p{N} '’.,()-]/gu, '').slice(0, 60);
  if (!place) return null;
  return <p style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', lineHeight: 1.7, color: '#14100d', margin: '0 0 18px' }}>Results for the area containing the centre of {place}. Enter a postcode for an exact match.</p>;
}
