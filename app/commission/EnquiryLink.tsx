'use client';

import type { CSSProperties } from 'react';

// "Start an enquiry" beside the price (owner, 8 Nov 2026, HP1b): a plain link to the form (#enquiry), so the jump works
// with JavaScript off. With JavaScript on it scrolls there itself and moves keyboard focus to the form's heading, and
// leaves the address alone, as the skip link does (SkipLink.tsx): a #enquiry entry in the history would pull focus back
// to the form when the phone menu closes with Escape (it closes by going back).
export default function EnquiryLink({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <a
      data-main-action
      href="#enquiry"
      className={className}
      style={style}
      onClick={(e) => {
        const section = document.getElementById('enquiry');
        const heading = document.getElementById('enquiry-heading');
        if (!section || !heading) return;
        e.preventDefault();
        section.scrollIntoView({ block: 'start' });
        heading.focus({ preventScroll: true });
      }}
    >
      Start an enquiry
    </a>
  );
}
