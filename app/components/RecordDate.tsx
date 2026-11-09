// The short line under a data section (owner, 4 Nov 2026; lib/record-dates.ts): "Updated 3 November 2026" or
// "Period 2024/25". Nothing when there is no real date to give. source (QA2c, 9 Nov 2026): the table.column the date is
// read from, as listed in lib/data-freshness.ts, rendered as data-source so the checks judge the line against that
// source's own limit (scripts/checks/qa/record-dates.mjs).
export default function RecordDate({ text, tight = false, source }: { text: string | null | undefined; tight?: boolean; source?: string }) {
  if (!text) return null;
  return (
    <p className="og-record-date" data-source={source} style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', color: '#14100d', margin: tight ? '-16px 0 28px' : '10px 0 0' }}>
      {text}
    </p>
  );
}
