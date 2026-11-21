// Deprivation in your neighbourhood (Cowork ENTRY 494 item 2, owner approved 21 Nov 2026 18:25): the overall band only,
// from MHCLG's English Indices of Deprivation 2025 (File 7, Open Government Licence v3.0), kept apart from the score.
// The neighbourhood is the postcode's 2021 lower layer super output area (LSOA), which postcodes.io already returns.
// imd2025-lsoa-decile.json: LSOA code -> IMD decile (1 = the 10 per cent most deprived of England's 33,755 LSOAs).

export const NEIGHBOURHOODS = 33755;
export const SOURCE_NAME = 'MHCLG English Indices of Deprivation 2025';

/** 'Among the 10 per cent most deprived neighbourhoods in England (decile 1 of 10, MHCLG English Indices of Deprivation
 *  2025).' Deciles 1 to 5 read from the most deprived end, 6 to 10 from the least deprived end. */
export function bandSentence(decile: number): string | null {
  if (!Number.isInteger(decile) || decile < 1 || decile > 10) return null;
  const tail = `(decile ${decile} of 10, ${SOURCE_NAME}).`;
  if (decile === 1) return `Among the 10 per cent most deprived neighbourhoods in England ${tail}`;
  if (decile === 10) return `Among the 10 per cent least deprived neighbourhoods in England ${tail}`;
  if (decile <= 5) return `Between the ${(decile - 1) * 10} and ${decile * 10} per cent most deprived neighbourhoods in England ${tail}`;
  return `Between the ${(10 - decile) * 10} and ${(11 - decile) * 10} per cent least deprived neighbourhoods in England ${tail}`;
}

/** The decile of a 2021 LSOA code, read from the static file on the server (loaded once, on first use). */
let table: Record<string, number> | null = null;
export async function decileOf(lsoa: string | null | undefined): Promise<number | null> {
  if (!lsoa || !/^E01\d{6}$/.test(lsoa)) return null;
  if (!table) table = (await import('./imd2025-lsoa-decile.json')).default as Record<string, number>;
  return table[lsoa] ?? null;
}

/** MHCLG's own page (with its map) for one neighbourhood: deprivation.communities.gov.uk lists one per 2021 LSOA. */
export const mhclgNeighbourhoodHref = (lsoa: string) => `https://deprivation.communities.gov.uk/about-your-neighbourhood/${lsoa}`;
