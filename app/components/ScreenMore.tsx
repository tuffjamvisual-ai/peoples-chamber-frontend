'use client';

// "Show more" on phones with JavaScript on, for rows that are siblings (NoJsPager's njpItem), a screen at a time (pagesByHeight). Every row stays in the page;
// a rule hides those past the screens shown, so from 640px up and with JavaScript off (Next and Previous, NoJsPager) it does nothing. A link to something in a
// hidden row opens the screens up to it.
import { useEffect, useState } from 'react';

export default function ScreenMore({ id, sizes }: { id: string; sizes: number[] }) {
  const [screens, setScreens] = useState(1);
  useEffect(() => {
    const reveal = () => {
      const row = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1)))?.closest(`.njp-i-${id}`) : null;
      if (!row) return;
      const at = [...document.querySelectorAll(`.njp-i-${id}`)].indexOf(row);
      let upTo = 0, need = 0;
      while (need < sizes.length && upTo <= at) upTo += sizes[need++];
      setScreens((s) => Math.max(s, need));
      setTimeout(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(), 50);
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, [id, sizes]);
  if (sizes.length <= 1) return null;
  const shown = sizes.slice(0, screens).reduce((a, b) => a + b, 0);
  const total = sizes.reduce((a, b) => a + b, 0);
  const css = `@media (max-width:639.98px){html.og-js .njp-i-${id}:nth-child(n+${shown + 1} of .njp-i-${id}){display:none!important}}`;
  return (
    <>
      {screens < sizes.length && <style dangerouslySetInnerHTML={{ __html: css }} />}
      {screens < sizes.length && (
        <button type="button" className="og-phone-more" onClick={() => setScreens(screens + 1)}>
          Show more ({(total - shown).toLocaleString('en-GB')} left)
        </button>
      )}
    </>
  );
}
