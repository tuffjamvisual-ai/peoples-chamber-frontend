// House style (T1-5x, owner 10 Nov 2026): a span of years reads "2026 to 2027" in our own wording, never "2026-27".
// "2026-27" and "2026-2027" become "2026 to 2027"; anything else is returned as it is.
export function yearSpan(label: string): string {
  const m = /^(\d{4})\s*[-–\/]\s*(\d{2}|\d{4})$/.exec(label.trim());
  if (!m) return label;
  let end = m[2].length === 2 ? Number(`${m[1].slice(0, 2)}${m[2]}`) : Number(m[2]);
  if (end < Number(m[1])) end += 100; // 1999-00
  return `${m[1]} to ${end}`;
}
