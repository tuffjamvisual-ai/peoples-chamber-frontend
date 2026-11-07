import { distinctStaff, type StaffInterestRow } from './StaffInterests';

// One summary line near the top of an MP profile (owner, 7 Nov 2026, Z2), beside the standards line: "Staff interests:
// 4 staff with outside employment, 1 gift or benefit, 2 visits outside the UK (12 October 2026 register)". Counted from
// mp_staff_interests, the rows the page already reads for its "Staff with outside interests" section, in the latest
// edition only. Each staff member counts once per category, by Parliament's anonymous staff identifier (a row without
// one counts on its own). Only the parts that apply; nothing for an MP with none. Links to the Interests tab.
const day = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function staffInterestsText(items: StaffInterestRow[]): string | null {
  const dates = items.map((s) => s.register_date?.slice(0, 10)).filter((d): d is string => !!d);
  if (!items.length || !dates.length) return null;
  const latest = dates.reduce((a, b) => (b > a ? b : a));
  const inLatest = items.filter((s) => s.register_date?.slice(0, 10) === latest);
  const staff = (c: StaffInterestRow['category']) => distinctStaff(inLatest, c);
  const n = (k: number) => k.toLocaleString('en-GB');
  const employment = staff('employment'), gift = staff('gift'), visit = staff('visit');
  const parts = [
    employment && `${n(employment)} staff with outside employment`,
    gift && `${n(gift)} ${gift === 1 ? 'gift or benefit' : 'gifts and benefits'}`,
    visit && `${n(visit)} ${visit === 1 ? 'visit' : 'visits'} outside the UK`,
  ].filter(Boolean);
  return parts.length ? `Staff interests: ${parts.join(', ')} (${day(latest)} register)` : null;
}

// Takes the finished text (staffInterestsText, on the server), so no row reaches the component.
export default function StaffInterestsLine({ text, style }: { text: string | null | undefined; style?: React.CSSProperties }) {
  if (!text) return null;
  return (
    <p className="mp-staff-line" style={{ margin: '0 0 12px', fontSize: '15px', lineHeight: 1.5, ...style }}>
      <a href="#interests" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
        {text}
      </a>
    </p>
  );
}
