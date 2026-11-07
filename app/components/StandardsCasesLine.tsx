import Link from 'next/link';
import { standardsLine } from '@/lib/standards-cases';

// One line on an MP or Lords profile (owner, 7 Nov 2026, T1): "Standards cases: 3 (2 rectified, 1 not upheld)", linking to
// the member's cases on /standards. Nothing for a member with none. Shown at every width.
export default function StandardsCasesLine({ memberId, style }: { memberId: number; style?: React.CSSProperties }) {
  const line = standardsLine(memberId);
  if (!line) return null;
  return (
    <p style={{ margin: '0 0 12px', fontSize: '15px', lineHeight: 1.5, ...style }}>
      <Link href={line.href} prefetch={false} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
        {line.text}
      </Link>
    </p>
  );
}
