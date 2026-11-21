// The neighbourhood's IMD decile (Cowork ENTRY 494 item 2), server only so the 476 KB file never reaches a browser bundle.
import 'server-only';

/** The decile of a 2021 LSOA code, read from the static file on the server (loaded once, on first use). */
let table: Record<string, number> | null = null;
export async function decileOf(lsoa: string | null | undefined): Promise<number | null> {
  if (!lsoa || !/^E01\d{6}$/.test(lsoa)) return null;
  if (!table) table = (await import('./imd2025-lsoa-decile.json')).default as Record<string, number>;
  return table[lsoa] ?? null;
}
