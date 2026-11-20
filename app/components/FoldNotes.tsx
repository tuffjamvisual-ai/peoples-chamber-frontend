// Licence and attribution lines inside a Sources fold (Cowork ENTRY 410): passed as PageSources children, so they sit in
// the fold above its list. A note with an address links its whole text (the licence), as the OGL lines did in the page.
import { uniqueNotes, type FoldNote } from '@/lib/fold-notes';

export default function FoldNotes({ notes }: { notes: (FoldNote | null | false | undefined)[] }) {
  const list = uniqueNotes(notes);
  if (list.length === 0) return null;
  return (
    <>
      {list.map((n) => (
        <p key={n.text} style={{ margin: '6px 0' }}>
          {n.href ? <a href={n.href} rel="noopener noreferrer" style={{ color: '#14100d', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{n.text}</a> : n.text}
        </p>
      ))}
    </>
  );
}
