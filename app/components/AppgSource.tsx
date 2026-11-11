// APPG data credit and amounts (owner's brief, 3 Nov 2026). The APPG groups, officers and funders come from
// mySociety's "APPG Groups and Memberships" dataset, licensed CC BY 4.0, which asks for visible attribution: every
// page or section showing that data carries this line (/appg-funders, /secretariats, /secretariats/[slug], the APPG
// section on MP pages).

export const APPG_DATASET_URL = 'https://pages.mysociety.org/appg-membership/datasets/appg_groups_and_memberships/latest';
const CC_BY_URL = 'https://creativecommons.org/licenses/by/4.0/';
const INK = '#14100d';

export default function AppgSource({ style }: { style?: React.CSSProperties }) {
  const link: React.CSSProperties = { color: INK, textDecoration: 'underline' };
  return (
    <p data-og-attribution="" style={{ fontSize: '15px', color: INK, lineHeight: 1.55, margin: '12px 0 0', ...style }}>
      Source:{' '}
      <a href={APPG_DATASET_URL} target="_blank" rel="noopener noreferrer" style={link}>mySociety APPG dataset</a>{' '}
      (<a href={CC_BY_URL} target="_blank" rel="noopener noreferrer license" style={link}>CC BY 4.0</a>)
    </p>
  );
}

// A funder line's amount: the exact figure for a Financial Benefit, the Register's £1,500 band for a Benefit In Kind.
export function appgAmount(f: { value_exact?: number | string | null; value_band?: string | null }): string | null {
  const exact = f.value_exact == null || f.value_exact === '' ? NaN : Number(f.value_exact);
  if (Number.isFinite(exact)) return `£${exact.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
  return f.value_band ? `£${f.value_band}` : null;
}
