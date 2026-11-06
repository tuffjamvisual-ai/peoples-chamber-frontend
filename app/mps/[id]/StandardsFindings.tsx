import { shortMonthYear } from '@/lib/short-date';
// Standards findings (House of Commons Committee on Standards reports naming this member), from mp_conduct_findings
// (app/api/sync-standards-committee). Shown on a full profile's Background tab (MagazineProfileSections) and on the
// basic former-MP page (FormerMpProfile), so a former member's findings appear too (owner's brief, 3 Nov 2026).
// Outcome (as a plain label), rule and penalty show when they are filled.

export type ConductFinding = {
  id: number;
  mp_name_at_time: string;
  closed_date: string | null;
  outcome: string | null;
  rule_breached: string | null;
  summary: string | null;
  penalty: string | null;
  url: string | null;
  source: string | null;
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const divider = '1px dashed rgba(20,16,13,0.2)';
const link: React.CSSProperties = { color: ACCENT, textDecoration: 'underline', fontSize: '15px' };

// Plain labels for the stored outcome codes (owner's brief, 3 Nov 2026). An unknown code shows no label.
const OUTCOME_LABEL: Record<string, string> = {
  upheld: 'Breach found',
  partially_upheld: 'Breach found in part',
  not_upheld: 'No breach found',
  no_finding: 'No finding by the Committee',
  rectified: 'Rectified',
};

// A rule that already names itself ("Rule 14", "paragraph 11", "paragraphs 16 and 17") shows as written, capitalised, without the "Rule:"
// prefix; anything else keeps the prefix. A penalty of "none" (or empty), or one on a case with no breach, is hidden.
const ruleText = (r: string) => (/^(rules?|paragraphs?)\s/i.test(r.trim()) ? r.trim().charAt(0).toUpperCase() + r.trim().slice(1) : `Rule: ${r}`);
const showPenalty = (f: { penalty: string | null; outcome: string | null }) =>
  !!f.penalty && f.penalty.trim() !== '' && f.penalty.trim().toLowerCase() !== 'none' && f.outcome !== 'not_upheld';

// Parliament's dates carry no time zone: read the date part only, so the month never shifts.
const monthYear = (d: string) => shortMonthYear(`${d.slice(0, 10)}T12:00:00Z`);

export default function StandardsFindings({ findings, headingStyle }: { findings: ConductFinding[]; headingStyle?: React.CSSProperties }) {
  if (findings.length === 0) return null;
  return (
    <section style={{ marginTop: '32px', padding: '14px 16px', border: '1px solid #a64030', background: 'rgba(166,64,48,0.04)', color: INK }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', ...headingStyle, marginTop: 0, marginBottom: '8px', color: INK }}>
        Standards findings <span style={{ fontWeight: 'normal', fontSize: '15px' }}>({findings.length})</span>
      </h3>
      <p style={{ fontSize: '15px', marginBottom: '12px' }}>
        Cases investigated by the House of Commons Committee on Standards.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '15px', lineHeight: 1.55 }}>
        {findings.map((f) => (
          <li key={f.id} style={{ padding: '8px 0', borderBottom: divider }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
              {f.closed_date && <strong style={{ fontFamily: 'monospace' }}>{monthYear(f.closed_date)}</strong>}
              <span>{f.summary || `Finding against ${f.mp_name_at_time}`}</span>
            </div>
            {((f.outcome && OUTCOME_LABEL[f.outcome]) || f.rule_breached || showPenalty(f)) && (
              <div style={{ fontSize: '15px', marginTop: '4px', color: INK }}>
                {f.outcome && OUTCOME_LABEL[f.outcome] && <span><strong>{OUTCOME_LABEL[f.outcome]}</strong>. </span>}
                {f.rule_breached && <span>{ruleText(f.rule_breached)}. </span>}
                {showPenalty(f) && <span>Penalty: {f.penalty}.</span>}
              </div>
            )}
            {f.url && (
              <div style={{ marginTop: '4px' }}>
                <a href={f.url} target="_blank" rel="noopener noreferrer" style={link}>Read the Committee&rsquo;s report</a>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
