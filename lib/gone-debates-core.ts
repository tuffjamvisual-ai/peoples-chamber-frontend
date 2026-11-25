// The pure part of lib/gone-debates.ts (no server imports, so it can be tested).
export const MAX_LEFT_OUT = 1000; // beyond it the address of the list's query would grow too long: none is left out, and it is logged

export const bothCases = (guids: string[]) => [...new Set(guids.flatMap((g) => [g.toUpperCase(), g.toLowerCase()]))];

// For a supabase query builder's .not('id', 'in', ...): '(1,2,3)', or null when there is nothing to leave out or too many.
export function leaveOut(ids: number[]): string | null {
  if (!ids.length) return null;
  if (ids.length > MAX_LEFT_OUT) { console.error(`[gone-debates] ${ids.length} rows, more than ${MAX_LEFT_OUT}: none left out of the lists`); return null; }
  return `(${ids.join(',')})`;
}
