// Shared display helpers for dashboard_indicators (Broken State dashboard and the
// "Public services performance" box). Periods are stored in a compact form
// (2026-08, 2025-26, 2026-Q1); readers see them written out, with no hyphens.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function yearRange(a: string, b: string): boolean {
  return Number(b) === (Number(a) + 1) % 100;
}

export function fmtPeriod(p: string | null | undefined): string {
  if (!p) return '';
  const s = p.trim();
  let m = s.match(/^(\d{4})-Q([1-4])$/);
  if (m) return `Q${m[2]} ${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})(.*)$/);
  if (m) {
    const [, a, b, rest] = m;
    // A following year (2025-26) is a financial or academic year; otherwise 01 to 12 is a month.
    if (yearRange(a, b)) return `${a}/${b}${rest}`;
    const mo = Number(b);
    if (!rest && mo >= 1 && mo <= 12) return `${MONTHS[mo - 1]} ${a}`;
  }
  return s;
}

type ChangeRow = { value: number; unit: string; baseline_value: number | null };

// Change since the baseline, in words: "up 3%", "down 9.6 points", "no change".
export function fmtChange(r: ChangeRow): string | null {
  if (r.baseline_value == null || r.value == null) return null;
  if (r.unit === '%') {
    const d = r.value - r.baseline_value;
    const t = Math.abs(d).toFixed(1);
    if (Number(t) === 0) return 'no change';
    return `${d > 0 ? 'up' : 'down'} ${t} points`;
  }
  if (r.baseline_value === 0) return null;
  const d = (r.value / r.baseline_value - 1) * 100;
  const t = Math.abs(d) < 10 ? Math.abs(d).toFixed(1) : Math.abs(d).toFixed(0);
  if (Number(t) === 0) return 'no change';
  return `${d > 0 ? 'up' : 'down'} ${t}%`;
}
