import { OPEN_PARLIAMENT_LICENCE_URL } from '../components/ParliamentSourceCredit';

const link = { color: '#7a1612', textDecoration: 'underline' };

// On every page that shows the PMQs archive (owner, 5 Nov 2026).
export default function ArchiveCredit() {
  return (
    <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '20px 0 0', color: '#14100d' }}>
      Contains Parliamentary information licensed under the <a href={OPEN_PARLIAMENT_LICENCE_URL} rel="noopener" style={link}>Open Parliament Licence v3.0</a>.
    </p>
  );
}
