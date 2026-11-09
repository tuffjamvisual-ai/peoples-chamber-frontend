import { shortMonthYear } from '@/lib/short-date';
// Staff with outside interests (owner's brief, 3 Nov 2026): the entries in the House of Commons register of interests
// of MPs' staff that name this MP, from mp_staff_interests (scripts/sync-staff-register.js).
// Shown on the Interests tab. Each line: job title · type · organisation · dates. Never a staff name (the register
// has none since January 2026); a councillor role is stored as "Councillor" with the council, never the ward. The
// opening line counts them (owner, 4 Nov 2026); the register's date is in the source line at the foot.

export type StaffInterest = {
  id: number;
  register_id: number;
  register_date: string | null;
  category: 'employment' | 'gift' | 'visit';
  job_title: string | null;
  description: string | null;
  organisation: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
};
// The row as read on the server (owner, 7 Nov 2026, AB1): Parliament's anonymous staff identifier is used there only, to count
// each staff member once, and never reaches the page or its data (the Open Parliament Licence does not cover personal data).
export type StaffInterestRow = StaffInterest & { staff_identifier: string | null };
// Distinct staff in a category, counted on the server from the rows with their identifier (a row without one counts on its own).
export const distinctStaff = (rows: StaffInterestRow[], category: StaffInterest['category']) =>
  new Set(rows.filter((r) => r.category === category).map((r) => r.staff_identifier ?? `row ${r.id}`)).size;

const INK = '#14100d';
const divider = '1px dashed rgba(20,16,13,0.2)';
const TYPE_LABEL: Record<StaffInterest['category'], string> = { employment: 'Employment', gift: 'Gift or hospitality', visit: 'Visit abroad' };
const ORDER: Record<StaffInterest['category'], number> = { employment: 0, gift: 1, visit: 2 };

// Parliament's dates carry no time zone: read the date part only, so the month never shifts.
const monthYear = (d: string) => shortMonthYear(`${d.slice(0, 10)}T12:00:00Z`);

function dates(s: StaffInterest): string | null {
  const from = s.start_date ? monthYear(s.start_date) : null;
  const to = s.end_date ? monthYear(s.end_date) : null;
  if (s.category === 'gift') return from;
  if (from && to) return from === to ? from : `${from} to ${to}`;
  if (from) return s.category === 'employment' ? `from ${from}` : from;
  if (to) return `until ${to}`;
  return null;
}

// Employment: the role and who pays ("Councillor, Wiltshire Council"); a gift: who gave it; a visit: where, and who paid.
function what(s: StaffInterest): string | null {
  const org = s.organisation?.trim() || null;
  if (s.category === 'employment') {
    const role = s.description?.trim() || null;
    if (role && org && role.toLowerCase() !== org.toLowerCase()) return `${role}, ${org}`;
    return role || org;
  }
  if (s.category === 'visit') {
    const place = s.country?.trim() || null;
    if (place && org) return `${place}, paid for by ${org}`;
    return place || org;
  }
  return org;
}

export default function StaffInterests({ items, employedStaff }: { items: StaffInterest[]; employedStaff: number }) {
  if (items.length === 0) return null;
  const sorted = [...items].sort((a, b) => ORDER[a.category] - ORDER[b.category] || (b.start_date || '').localeCompare(a.start_date || ''));
  const registerId = Math.max(...items.map((i) => i.register_id));
  const registerDate = items.find((i) => i.register_id === registerId)?.register_date ?? null;
  const link: React.CSSProperties = { color: INK, textDecoration: 'underline' };
  const gifts = items.filter((i) => i.category === 'gift').length;
  const visits = items.filter((i) => i.category === 'visit').length;
  const counts = [
    employedStaff > 0 && `${employedStaff} ${employedStaff === 1 ? 'staff member' : 'staff'} with outside employment`,
    gifts > 0 && `${gifts} ${gifts === 1 ? 'gift' : 'gifts'} registered`,
    visits > 0 && `${visits} overseas ${visits === 1 ? 'visit' : 'visits'}`,
  ].filter(Boolean).join(', ');
  return (
    // In the Staff interests folder (ST1c, 9 Nov 2026), under its opening line: no heading or intro of its own.
    <section style={{ marginTop: '12px', color: INK }}>
      <p style={{ fontSize: '15px', lineHeight: 1.6, marginBottom: '12px' }}>{counts}.</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '15px', lineHeight: 1.6 }}>
        {sorted.map((s) => {
          const parts = [s.job_title?.trim() || 'Staff member', TYPE_LABEL[s.category], what(s), dates(s)].filter(Boolean);
          return (
            <li key={s.id} style={{ padding: '6px 0', borderBottom: divider }}>
              {parts.join(' · ')}
            </li>
          );
        })}
      </ul>
      <p style={{ fontSize: '15px', color: INK, lineHeight: 1.55, margin: '12px 0 0' }}>
        Source:{' '}
        <a href="https://members.parliament.uk/members/commonsstaff/interests/publications" target="_blank" rel="noopener noreferrer" style={link}>
          Register of Interests of Members&rsquo; Staff (UK Parliament)
        </a>
        {registerDate ? `, published ${new Date(`${registerDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}` : ''}.
      </p>
    </section>
  );
}
