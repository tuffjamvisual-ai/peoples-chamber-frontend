'use client';

// One helper, site wide (T1-MOB, owner 11 Nov 2026; mounted once in app/layout.tsx): an in-page shortcut or an address with
// a #fragment that points into a closed fold opens that fold and scrolls to the target, the way the Commons division
// shortcuts open the vote lists. It opens:
//   - every closed <details> around the target;
//   - a NoJsFold (details.njf, which hides the siblings after it up to its "-end" marker) that hides the target or one of
//     its ancestors;
//   - a SubFold (details.pf-sd, which hides the .pf-sb after it), and the older .pc-b and .rf-b folds, likewise;
//   - the folds at the top level of the target itself (a shortcut to a section that is one fold: the road types on
//     /councils/road-condition).
// Runs on arrival, on hashchange, and on a tap on a link to the current fragment (which fires no hashchange). Without
// JavaScript the browser still lands on the target, the fold's own label (owner: "with JavaScript off still landing on the
// fold"). Before 11 Nov 2026 this was on the PMQs pages and reports only (owner, 5 Nov 2026).
import { useEffect } from 'react';

const FOLD_BODY = ['pc-b', 'rf-b', 'pf-sb'];

function openFor(target: Element): boolean {
  let opened = false;
  const open = (d: Element | null) => { if (d instanceof HTMLDetailsElement && !d.open) { d.open = true; opened = true; } };
  for (let e: Element | null = target; e; e = e.parentElement) {
    if (e !== target && e instanceof HTMLDetailsElement) open(e);
    if (FOLD_BODY.some((c) => e!.classList.contains(c))) open(e.previousElementSibling);
    // A NoJsFold before this element whose end marker is after it hides it.
    for (let s = e.previousElementSibling; s; s = s.previousElementSibling) {
      if (!(s instanceof HTMLDetailsElement) || !s.classList.contains('njf') || s.open || !s.id) continue;
      const end = document.getElementById(`${s.id}-end`);
      if (end && (end.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_PRECEDING)) open(s);
    }
  }
  for (const d of target.querySelectorAll(':scope > details.njf, :scope > details.pf-sd, :scope > details.pa-fold')) open(d);
  return opened;
}

function run(hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  const target = id ? document.getElementById(id) : null;
  if (target && openFor(target)) target.scrollIntoView();
}

export default function OpenHashTarget() {
  useEffect(() => {
    const onHash = () => run(location.hash);
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as Element | null)?.closest?.('a[href^="#"]');
      if (!a) return;
      const hash = a.getAttribute('href')!;
      // A tap on the link to the fragment already in the address fires no hashchange.
      if (hash === location.hash) requestAnimationFrame(() => run(hash));
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    document.addEventListener('click', onClick);
    return () => { window.removeEventListener('hashchange', onHash); document.removeEventListener('click', onClick); };
  }, []);
  return null;
}
