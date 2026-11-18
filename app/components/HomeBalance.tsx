'use client';
// Homepage columns always balance (owner standing rule 18 Nov 2026, Cowork ENTRY 332): where the main column and the rail
// sit side by side, the blocks after each column's fixed top (the reports after the lead story, the rail's cards, From
// Whitehall and the newsletter) are placed, one at a time in a set order, into whichever column ends higher, so the two
// columns end within one block of each other whatever the reports' lengths. It runs after layout, again when the window is
// resized or the fonts load, and puts every block back where the HTML has it first, so phones and tablets (one column)
// and pages without JavaScript keep the HTML order (ENTRY 331's split). Nothing is removed or copied; only blocks that
// are shown are moved.
import { useEffect } from 'react';

// The movable blocks, in the order they are placed (a report, then a card, so both columns mix as before).
// The first report stays in the main column under the lead story (part of its fixed top), so the reports read on from it.
// 'report N' is the main column's Nth report block (nth-of-type would count the hidden phone cards too).
const ORDER = [
  '.og-rail > a.og-card[href="/bills"]',
  'report 2',
  '.og-rail > a.og-card[href="/expenses"]',
  'report 3',
  '.og-rail > a.og-card[href="/parties/manifestos"]',
  '.og-rail > a.og-card[href="/pmqs"]',
  '.og-rail > a.og-card[href="/departments"]',
  '.og-rail > a.og-card[href="/this-week"]',
  '.og-main > .og-whitehall-f',
  '.og-rail > #newsletter',
];

const shown = (e: Element) => e.getClientRects().length > 0;
const bottom = (col: Element) => {
  const kids = [...col.children].filter(shown);
  return kids.length ? Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)) : col.getBoundingClientRect().top;
};

export default function HomeBalance() {
  useEffect(() => {
    const main = document.querySelector('.og-main');
    const rail = document.querySelector('.og-rail');
    if (!main || !rail) return;
    // Each block's place in the HTML, found once, so every pass starts from the same order.
    const reports = [...main.querySelectorAll(':scope > a.og-brief:not(.og-desk)')];
    const blocks = ORDER.map((sel) => (sel.startsWith('report ') ? reports[Number(sel.slice(7)) - 1] : document.querySelector(sel))).filter((e): e is Element => !!e);
    const home = blocks.map((el) => ({ el, parent: el.parentElement!, next: el.nextElementSibling }));
    const restore = () => { for (const h of [...home].reverse()) h.parent.insertBefore(h.el, h.next && h.next.parentElement === h.parent ? h.next : null); };
    const sideBySide = () => rail.getBoundingClientRect().left > main.getBoundingClientRect().right - 1;
    const balance = () => {
      restore();
      if (!sideBySide()) return;
      const move = blocks.filter(shown);
      for (const el of move) el.remove();
      for (const el of move) (bottom(main) <= bottom(rail) ? main : rail).appendChild(el);
    };
    balance();
    let t: ReturnType<typeof setTimeout> | undefined;
    const later = () => { clearTimeout(t); t = setTimeout(balance, 150); };
    window.addEventListener('resize', later);
    document.fonts?.ready.then(balance).catch(() => {});
    return () => { window.removeEventListener('resize', later); clearTimeout(t); restore(); };
  }, []);
  return null;
}
