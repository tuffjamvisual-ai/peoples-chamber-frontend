// Notes inside this page's Sources fold (Cowork ENTRY 415 v3b PICTURES): which measures share a source, and the licences.
// The licence link sits inside a sentence, not alone in its paragraph: a lone link is marked as a tap target by the shared
// phone script (lib/phone-enhance.ts adds data-pt-tap before React hydrates), which React reported as a hydration mismatch
// with FoldNotes' link-only line. Kept local to this page so no other page changes.
import { OGL_URL } from '@/lib/fold-notes';
import { MEASURE_COUNT, SOURCE_COUNT } from './data';

export default function SourceNotes() {
  const p = { margin: '6px 0' } as const;
  return (
    <>
      <p style={p}>{MEASURE_COUNT} measures, {SOURCE_COUNT} sources: gigabit broadband and indoor 4G from all four networks both come from Ofcom Connected Nations.</p>
      <p style={p}>
        Government sources are published under the{' '}
        <a href={OGL_URL} rel="noopener noreferrer" style={{ color: '#14100d', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Open Government Licence v3.0</a>.
        {' '}OHID Fingertips states: &ldquo;All content is available under the Open Government Licence, except where otherwise stated&rdquo;, Crown copyright 2026 (cited as: Office for Health Improvement and Disparities, Public health profiles, 2026). Ofcom Connected Nations data is published by Ofcom.
      </p>
    </>
  );
}
