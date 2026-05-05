// Ministerial salaries paid ON TOP OF the MP base salary.
//
// Ministerial pay in the Commons has been voluntarily frozen at 2010 levels
// since the Cameron pay-restraint decision in 2010. The Ministerial and
// other Salaries Act 1975 sets the statutory entitlement, but successive
// PMs have continued to claim a reduced amount and ministers have been
// paid the corresponding frozen rate.
//
// Source: House of Commons Library briefings on Members' Pay and Expenses
//   - CBP-10600 (2025/26)
//   - CBP-10225 (2024/25)
//   - Ministerial salary information sheet M06 (Commons Information Office).
// Cross-referenced with Hansard written answers (e.g. HL4728, May 2024).

export const MP_BASE_SALARY_2026 = 98_599   // from 1 April 2026 (5% rise per IPSA)
export const MP_BASE_SALARY_2025 = 93_904   // 2025-26 financial year prior to 1 April 2026

export type SalaryBand =
  | 'pm'                  // Prime Minister (currently claimed level)
  | 'sos'                 // Cabinet Secretary of State + equivalents (Chief Whip, Leader of the House, etc.)
  | 'minister_of_state'   // Minister of State, Commons
  | 'puss'                // Parliamentary Under-Secretary of State, Commons (also Asst Whips, etc.)

// Supplements ON TOP OF the MP base salary.
// These are 2010-frozen levels, claimed by successive governments.
export const MINISTERIAL_SUPPLEMENT: Record<SalaryBand, number> = {
  pm:                75_440,   // claimed; full statutory entitlement £80,807
  sos:               72_310,   // Cabinet Minister / Secretary of State (Commons)
  minister_of_state: 33_346,
  puss:              25_277,
}

export const SALARY_BAND_LABEL: Record<SalaryBand, string> = {
  pm:                'Prime Minister',
  sos:               'Cabinet Minister',
  minister_of_state: 'Minister of State',
  puss:              'Parliamentary Under-Secretary',
}

/**
 * Best-effort mapping from a `dept_ministers.role` text to a salary band.
 * Order matters: most-specific patterns first.
 *
 * Roles that don't match any band (e.g. unpaid 'Minister without Portfolio',
 * special envoys, lords-only honorific posts) return null and contribute
 * nothing to the ministerial-supplement column on the earnings page.
 */
export function bandForRole(role: string | null | undefined): SalaryBand | null {
  if (!role) return null
  const r = role.toLowerCase()

  // PM bucket — match exact "Prime Minister" titling only
  if (/^prime minister$/.test(r)) return 'pm'

  // PUSS first — "Parliamentary Under-Secretary of State" contains the
  // substring "Secretary of State", so this must be checked before the
  // SoS clauses below or we'll wrongly bump junior ministers into Cabinet
  if (/parliamentary under[- ]secretary/.test(r)) return 'puss'

  // Cabinet-rate posts
  if (/\bdeputy prime minister\b/.test(r)) return 'sos'
  if (/\bsecretary of state\b/.test(r)) return 'sos'
  if (/\bchief secretary to the treasury\b/.test(r)) return 'sos'
  if (/\bchancellor of the exchequer\b/.test(r)) return 'sos'
  if (/\bchancellor of the duchy of lancaster\b/.test(r)) return 'sos'
  if (/\bleader of the house\b/.test(r)) return 'sos'
  if (/\bgovernment chief whip\b/.test(r)) return 'sos'
  if (/\bparliamentary secretary to the treasury\b/.test(r)) return 'sos'   // = Chief Whip
  if (/\blord president of the council\b/.test(r)) return 'sos'
  if (/\blord privy seal\b/.test(r)) return 'sos'
  if (/\battorney general\b/.test(r)) return 'sos'
  if (/\badvocate general\b/.test(r)) return 'sos'
  if (/^chief secretary to the prime minister/.test(r)) return 'sos'

  // Minister of State and Treasury seconds
  if (/\bminister of state\b/.test(r)) return 'minister_of_state'
  if (/\beconomic secretary to the treasury\b/.test(r)) return 'minister_of_state'
  if (/\bexchequer secretary to the treasury\b/.test(r)) return 'minister_of_state'
  if (/\bfinancial secretary to the treasury\b/.test(r)) return 'minister_of_state'
  if (/^minister for the cabinet office/.test(r)) return 'minister_of_state'

  // Other PUSS equivalents
  if (/parliamentary secretary\b/.test(r) && !/treasury/.test(r)) return 'puss'
  if (/\bsolicitor general\b/.test(r)) return 'puss'

  // Whips (junior) — paid at varying rates around the PUSS level
  if (/\bassistant whip\b/.test(r)) return 'puss'
  if (/\blord(s)? of the treasury\b/.test(r)) return 'puss'             // junior whip
  if (/(?:baroness|lord) in waiting/.test(r)) return 'puss'             // government whip in the Lords
  if (/\bgovernment whip\b/.test(r)) return 'puss'

  return null
}
