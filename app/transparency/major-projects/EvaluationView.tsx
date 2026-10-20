'use client';
// /transparency/major-projects?evaluation=no shows only the projects that said in March 2025 they had no evaluation
// plan (owner's decision, 20 Oct 2026). Both lists are rendered on the server so the page stays statically cached;
// this only chooses which one is shown once the page has loaded (without JavaScript, the full list shows).
import { useEffect, useState, type ReactNode } from 'react';

export default function EvaluationView({ all, noPlan }: { all: ReactNode; noPlan: ReactNode }) {
  const [view, setView] = useState<'all' | 'no'>('all');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('evaluation') === 'no') setView('no');
  }, []);
  return (
    <>
      <div hidden={view !== 'all'}>{all}</div>
      <div hidden={view !== 'no'}>{noPlan}</div>
    </>
  );
}
