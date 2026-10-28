// SQL literals for the generated load files (scripts/import-children-in-care.ts, scripts/import-road-condition.ts).
export const lit = (v: unknown): string => {
  if (v == null) return 'NULL';
  if (Array.isArray(v)) return v.length ? `ARRAY[${v.map(lit).join(', ')}]::text[]` : `'{}'::text[]`;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

// Our councils from a CSV export (gss_code, slug, name, type, country): every code, and the English councils that are
// not districts (children's services and highway authorities alike).
export function councilSets(csvText: string): { ours: Set<string>; upperTier: Set<string> } {
  const ours = new Set<string>(), upperTier = new Set<string>();
  for (const l of csvText.trim().split('\n').slice(1)) {
    const m = l.match(/^([A-Z]\d{8}),.*,([a-z-]+),(England|Wales|Scotland|Northern Ireland)$/);
    if (!m) continue;
    ours.add(m[1]);
    if (m[3] === 'England' && m[2] !== 'district') upperTier.add(m[1]);
  }
  if (ours.size < 300) throw new Error(`councils CSV: only ${ours.size} codes`);
  return { ours, upperTier };
}
