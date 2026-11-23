// The X logo (Cowork ENTRY 512 change 3, owner approved 23 Nov 2026): X's own mark from x-logo.zip on X's brand toolkit
// (logo.svg, sha256 dd46f96b...c699d4), path and viewBox unmodified; filled black, or white on a dark background (T2,
// 23 Nov: SiteFooter is dark), the only two colours X supplies it in (the toolkit publishes no other colour, size or
// spacing rules). Inline, so nothing is fetched from x.com. Sized to the
// text around it (1em tall); the link around it carries the name ("opengovt on X"), so the drawing is hidden from
// screen readers.
export default function XLogo({ white = false }: { white?: boolean }) {
  return (
    <svg viewBox="0 0 1200 1227" width="0.98em" height="1em" fill="none" aria-hidden="true" focusable="false" style={{ display: 'inline-block', verticalAlign: '-0.12em' }}>
      <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" fill={white ? '#fff' : '#000'} />
    </svg>
  );
}
