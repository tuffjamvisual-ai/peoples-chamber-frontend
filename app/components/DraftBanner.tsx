// The banner on the owner's private preview pages (lib/draft-preview.ts). Not on any public page.
export default function DraftBanner({ published }: { published: boolean }) {
  return (
    <div role="status" style={{ margin: '0 0 20px', padding: '10px 14px', border: '2px solid #7a1612', background: 'rgba(122,22,18,0.08)', color: '#7a1612', fontFamily: 'var(--font-special-elite), monospace', fontSize: '16px', fontWeight: 'bold', lineHeight: 1.4 }}>
      {published ? 'Private preview: this one is already published.' : 'DRAFT, not public'}
    </div>
  );
}
