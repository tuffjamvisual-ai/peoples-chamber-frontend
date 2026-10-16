// Which Commons division is the vote on a bill itself. Mirrors scripts/sync-bill-divisions.js
// (keep the two the same). Audit P10, 16 Oct 2026.
//   - Only a Second or Third Reading counts, and only when the division IS the reading: the
//     words after the bill name end with it and are not an amendment, motion or instruction.
//   - The vote must fall while the bill was before Parliament (first to last stage sitting,
//     a day either side), so a same-named bill from another session is never matched.

const DAY = 86400000;

export function readingStage(title: string): 0 | 3 | 4 {
  const t = String(title || '').trim();
  const lower = t.toLowerCase();
  const pre = lower.match(/^(second|third) reading of /);
  if (pre) return pre[1] === 'third' ? 4 : 3;
  const inName = lower.match(/\((second|third) reading\)\s*bill/);
  if (inName) return inName[1] === 'third' ? 4 : 3;
  const colon = t.indexOf(':');
  if (colon === -1) return 0;
  const rest = lower.slice(colon + 1).trim();
  if (/amendment|amdt|motion|instruction|resolution|programme|revival|closure/.test(rest)) return 0;
  if (/^third reading[\s.]*$/.test(rest)) return 4;
  if (/^second reading[\s.]*$/.test(rest)) return 3;
  return 0;
}

export function divisionBillSegment(title: string): string {
  let t = String(title || '').trim().replace(/^(second|third) reading of (the )?/i, '');
  const colon = t.indexOf(':');
  t = (colon !== -1 ? t.slice(0, colon) : t).trim();
  return t.replace(/\s*\((second|third) reading\)\s*/i, ' ').replace(/\s+/g, ' ').trim();
}

const norm = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\b\d{4}\b/g, '').replace(/\s+/g, ' ').trim();

// "X Act 2016" → "x bill"; "X Bill [HL]" → "x bill".
export function billNameKey(title: string): string {
  return norm(String(title || '').replace(/\[(hl|lords)\]/ig, '').replace(/\s+act(\s+\d{4})?\s*$/i, ' bill'));
}

type StageJson = { items?: { stageSittings?: { date?: string | null }[] | null }[] } | null | undefined;
export function billWindow(stages: StageJson): { from: number; to: number } | null {
  const dates: number[] = [];
  for (const st of stages?.items || []) for (const s of st.stageSittings || []) if (s?.date) dates.push(new Date(s.date).getTime());
  if (!dates.length) return null;
  return { from: Math.min(...dates) - DAY, to: Math.max(...dates) + DAY };
}
