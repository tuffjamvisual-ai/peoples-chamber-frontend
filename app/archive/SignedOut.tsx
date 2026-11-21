// What a signed out visitor sees on any archive page (Cowork ENTRY 480 ADDENDUM; wording for the whole SSD archive, PART A, owner approved 21 Nov 2026): a short
// explanation of what the archive holds and the site's own sign up and log in, nothing more. Rendered by the server
// before any index read or tunnel call. Log in returns to the page asked for; sign up has no return address yet.
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';

const INK = '#14100d';
const button = { display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '10px 18px', border: `2px solid ${INK}`, fontSize: '16px', textDecoration: 'none' } as const;

export default function ArchiveSignedOut({ returnTo }: { returnTo: string }) {
  return (
    <OpenGovShell>
      <section style={{ color: INK, maxWidth: '46em' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 12px', lineHeight: 1.1 }}>The archive</h1>
        <p style={{ fontSize: '16px', lineHeight: 1.7, margin: '0 0 12px' }}>
          3.2 million records: Commons and Lords debates and written answers, House of Lords debates from 1914 to 2005, petitions, legislation, public contracts and more. Search the full text, then open any record.
        </p>
        <p style={{ fontSize: '16px', lineHeight: 1.7, margin: '0 0 20px' }}>The archive is for signed in readers. Signing up is free.</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/signup" prefetch={false} style={{ ...button, background: INK, color: '#fffdf7' }}>Sign up</Link>
          <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} prefetch={false} style={{ ...button, background: 'transparent', color: INK }}>Log in</Link>
        </div>
      </section>
    </OpenGovShell>
  );
}
