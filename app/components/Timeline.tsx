import { fmtDate, fmtNumber, type TimelineRow } from '@/lib/programmes';

const INK      = '#14100d';
const ACCENT   = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.15)';
const MONO     = "'Special Elite', monospace";

const ENTRY_TYPE_LABEL: Record<string, string> = {
  first_announced:  'First announced',
  target_set:       'Target set',
  target_revised:   'Target revised',
  deadline_changed: 'Deadline changed',
  progress_update:  'Progress update',
  policy_withdrawn: 'Policy withdrawn',
  completed:        'Completed',
};

export default function Timeline({ entries }: { entries: TimelineRow[] }) {
  return (
    <>
      {entries.length > 0 && (
        <section style={{ marginBottom: '40px', maxWidth: '720px' }}>
          <h2 style={{
            fontFamily: MONO, fontSize: '13px',
            textTransform: 'uppercase', letterSpacing: '0.2em',
            color: 'rgba(20,16,13,0.45)',
            marginBottom: '16px', fontWeight: 'normal',
          }}>
            Timeline
          </h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, borderLeft: `2px solid ${HAIRLINE}` }}>
            {entries.map((entry) => (
              <li key={entry.id} style={{ padding: '0 0 24px 20px', position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '-5px', top: '5px',
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: entry.is_approved ? INK : ACCENT,
                  display: 'block',
                }} />
                <p style={{
                  fontFamily: MONO, fontSize: '12px',
                  color: 'rgba(20,16,13,0.45)',
                  margin: '0 0 4px',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {fmtDate(entry.entry_date)}
                  {!entry.is_approved && (
                    <span style={{ color: ACCENT, marginLeft: '8px' }}>[PENDING APPROVAL]</span>
                  )}
                  {entry.entry_type && (
                    <span style={{
                      marginLeft: '10px',
                      border: '1px solid rgba(20,16,13,0.3)',
                      padding: '1px 6px',
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                      verticalAlign: 'middle',
                    }}>
                      {ENTRY_TYPE_LABEL[entry.entry_type] ?? entry.entry_type}
                    </span>
                  )}
                </p>
                <p style={{ fontSize: '16px', fontWeight: 600, color: INK, margin: '0 0 6px', lineHeight: 1.35 }}>
                  {entry.title}
                </p>
                {entry.figure_value !== null && (
                  <p style={{ fontFamily: MONO, fontSize: '14px', color: INK, margin: '0 0 6px', fontWeight: 600 }}>
                    {fmtNumber(entry.figure_value)}
                    {entry.figure_unit ? (
                      <span style={{ fontWeight: 'normal', color: 'rgba(20,16,13,0.55)', marginLeft: '5px' }}>
                        {entry.figure_unit}
                      </span>
                    ) : null}
                  </p>
                )}
                {entry.body && (
                  <p style={{ fontSize: '15px', lineHeight: 1.65, color: 'rgba(20,16,13,0.75)', margin: '0 0 6px' }}>
                    {entry.body}
                  </p>
                )}
                {entry.source_label && (
                  <p style={{ fontFamily: MONO, fontSize: '12px', color: 'rgba(20,16,13,0.45)', margin: 0 }}>
                    Source: {entry.source_label}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
