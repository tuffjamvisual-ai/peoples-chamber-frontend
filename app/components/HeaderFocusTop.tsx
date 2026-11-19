'use client';
// The back folder stays still behind the page from 768px (Cowork ENTRY 356), so once the page has scrolled the menu is
// covered. A keyboard user tabbing into the header (the logo, Log in / Support us, the menu) is taken back to the top so
// the focused link is seen; the tab order and what screen readers read are unchanged. Phones (under 768px) have their own
// header and are left alone.
import { useEffect } from 'react';

export default function HeaderFocusTop() {
  useEffect(() => {
    const header = document.querySelector('.og-header');
    if (!header) return;
    const onFocus = () => {
      if (window.innerWidth >= 768 && window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    header.addEventListener('focusin', onFocus);
    return () => header.removeEventListener('focusin', onFocus);
  }, []);
  return null;
}
