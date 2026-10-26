'use client';

// Rendered on /newsletter?status=confirmed: this browser has confirmed, so the newsletter strip is not shown again.
import { useEffect } from 'react';
import { markNewsletterSubscribed } from '@/lib/newsletter-strip';

export default function MarkNewsletterSubscribed() {
  useEffect(() => { markNewsletterSubscribed(); }, []);
  return null;
}
