// The short line under a data section (owner, 4 Nov 2026; lib/record-dates.ts): "Updated 3 November 2026" or
// "Period 2024/25". Nothing when there is no real date to give.
export default function RecordDate({ text, tight = false }: { text: string | null | undefined; tight?: boolean }) {
  if (!text) return null;
  return (
    <p className="og-record-date" style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: '15px', color: '#14100d', margin: tight ? '-16px 0 28px' : '10px 0 0' }}>
      {text}
    </p>
  );
}
