// Civil-service salary bands. Senior Civil Service (SCS) pay bands are
// public knowledge — Cabinet Office publishes the band ranges each
// year. We map a person's role title to the most likely band, which
// gives an honest ballpark for the /people/<slug> page without
// scraping each department's quarterly organogram CSV.
//
// Bands and ranges are the 2025-26 published Cabinet Office figures:
//   https://www.gov.uk/government/publications/civil-service-pay-remit-2025-26
//
// Per-person actuals (within these bands) are published quarterly in
// each department's organogram CSV at gov.uk/government/publications/
// staff-and-salary-data-for-* — adding the per-person sync would
// require scraping those publication pages, not on the content API.

export type ScsBand =
  | 'scs4' // Permanent Secretary level
  | 'scs3' // Second Permanent Secretary / Director General
  | 'scs2' // Director
  | 'scs1a' // Deputy Director (upper range)
  | 'scs1' // Deputy Director (lower range)
  | 'ned' // Non-Executive Director / board fee
  | 'lead-ned' // Lead Non-Executive Director

export const SCS_BAND_LABEL: Record<ScsBand, string> = {
  scs4: 'Permanent Secretary (SCS4)',
  scs3: 'Director General (SCS3)',
  scs2: 'Director (SCS2)',
  scs1a: 'Deputy Director (SCS1A)',
  scs1: 'Deputy Director (SCS1)',
  ned: 'Non-Executive Director',
  'lead-ned': 'Lead Non-Executive Director',
}

// Published ranges (2025-26 Cabinet Office pay remit + NED fee guidance).
// Stored as [min, max] so the renderer can show either a band or the range.
export const SCS_BAND_RANGE: Record<ScsBand, [number, number]> = {
  scs4: [170_000, 208_100],
  scs3: [120_000, 180_000],
  scs2: [95_000, 162_500],
  scs1a: [82_000, 117_800],
  scs1: [75_000, 100_000],
  ned: [15_000, 20_000],
  'lead-ned': [20_000, 30_000],
}

/**
 * Best-effort mapping from a person's role text to an SCS band.
 * Order matters: most-specific titles first.
 *
 * Roles that don't match any band (heads of agencies on different
 * pay scales, advisers, ambassadors) return null and don't display
 * a band on the profile.
 */
export function bandForCivilServiceRole(role: string | null | undefined): ScsBand | null {
  if (!role) return null
  const r = role.toLowerCase()

  // Non-executive board members (paid a board fee, not a salary)
  if (/\blead non[- ]executive\b/.test(r)) return 'lead-ned'
  if (/\bnon[- ]executive\b/.test(r)) return 'ned'
  if (/\bboard member\b/.test(r) && !/director general/.test(r)) return 'ned'

  // SCS4 — Permanent Secretary
  if (/^permanent secretary/.test(r)) return 'scs4'
  if (/\bcabinet secretary\b/.test(r)) return 'scs4'
  if (/\bhead of (the )?civil service\b/.test(r)) return 'scs4'

  // SCS3 — Second Permanent Secretary / DG / Chief
  if (/\bsecond permanent secretary\b/.test(r)) return 'scs3'
  if (/\bdirector[- ]general\b/.test(r)) return 'scs3'
  if (/\bchief executive\b/.test(r)) return 'scs3'
  if (/\bchief medical officer\b/.test(r)) return 'scs3'
  if (/\bchief scientific adviser\b/.test(r)) return 'scs3'
  if (/\bchief economic adviser\b/.test(r)) return 'scs3'
  if (/\bnational security adviser\b/.test(r)) return 'scs3'
  if (/\bchief operating officer\b/.test(r)) return 'scs3'
  if (/\bchief financial officer\b/.test(r)) return 'scs3'

  // SCS2 — Director
  if (/^director,/.test(r)) return 'scs2'
  if (/^director of\b/.test(r)) return 'scs2'
  if (/\bdirector\b/.test(r) && !/deputy director/.test(r) && !/non[- ]exec/.test(r)) return 'scs2'

  // SCS1A — Senior Deputy Director (Head of …)
  if (/\bhead of\b/.test(r)) return 'scs1a'

  // SCS1 — Deputy Director
  if (/\bdeputy director\b/.test(r)) return 'scs1'

  return null
}
