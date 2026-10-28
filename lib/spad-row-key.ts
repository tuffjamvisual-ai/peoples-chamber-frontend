// The row key of a quarterly special adviser declaration (gifts, hospitality, media meetings): md5 of its quarter,
// area, adviser and own fields joined by '|' (a missing field as empty text), then '#' and its count among identical
// rows (#1, #2), so two identical declarations in one file are both kept. The same text as the backfill in
// scripts/migrations/2026-10-28a-spad-roster-and-history.sql; /api/sync-spad-transparency upserts by it.
import { createHash } from 'crypto';

export function withRowKeys<T extends Record<string, unknown>>(rows: T[], fields: (keyof T)[]): (T & { row_key: string })[] {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    const h = createHash('md5').update(fields.map((f) => String(r[f] ?? '')).join('|')).digest('hex');
    const n = (seen.get(h) ?? 0) + 1;
    seen.set(h, n);
    return { ...r, row_key: `${h}#${n}` };
  });
}
